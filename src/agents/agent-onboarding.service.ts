import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import {
  AgentInvitation,
  InvitationStatus,
} from '../agents/entities/agent-invitation.entity';
import {
  EventAgent,
  SyncClearanceLevel,
} from '../agents/entities/event-agent.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { InviteAgentDto } from './dto/invite-agent.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { MailerService } from 'src/mailer/mailer-service';

@Injectable()
export class AgentOnboardingService {
  private readonly logger = new Logger(AgentOnboardingService.name);

  constructor(
    @InjectRepository(AgentInvitation)
    private readonly invitationRepo: Repository<AgentInvitation>,
    @InjectRepository(EventAgent)
    private readonly agentRepo: Repository<EventAgent>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async getInviteInfo(token: string) {
    if (!token) throw new BadRequestException('Token required');

    const tokenHash = this.hashToken(token.trim());
    const invitation = await this.invitationRepo.findOne({
      where: { tokenHash },
      relations: ['event'],
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation invalid or expired');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: invitation.email },
    });

    return {
      email: invitation.email,
      eventName: invitation.event?.name,
      isExistingUser: !!existingUser,
    };
  }

  async inviteAgent(inviter: CurrentUserPayload, dto: InviteAgentDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== inviter.userId) {
      throw new ForbiddenException(
        'Only the event organizer can invite agents',
      );
    }

    const existingPendingInvite = await this.invitationRepo.findOne({
      where: {
        eventId: event.id,
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingPendingInvite) {
      if (new Date() < existingPendingInvite.expiresAt) {
        throw new ConflictException(
          'An active invitation has already been sent to this email address',
        );
      }

      existingPendingInvite.status = InvitationStatus.EXPIRED;
      await this.invitationRepo.save(existingPendingInvite);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invitation = this.invitationRepo.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      tokenHash,
      eventId: event.id,
      invitedById: inviter.userId,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    await this.invitationRepo.save(invitation);

    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const invitationUrl = `${baseUrl}/accept-invite?token=${rawToken}`;

    const organizerName =
      [event.organizer?.firstName, event.organizer?.lastName]
        .filter(Boolean)
        .join(' ') || 'Event Organizer';

    await this.mailerService.sendAgentInvite({
      email: normalizedEmail,
      url: invitationUrl,
      agentName: invitation.fullName,
      organizerName,
      eventName: event.name,
    });

    this.logger.log(
      `Agent invitation created for ${normalizedEmail} (Event: ${event.id})`,
    );

    return {
      message: 'Invitation sent successfully',
      invitationId: invitation.id,
      expiresAt,
      invitationUrl,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    if (!dto.token || dto.token.trim().length === 0) {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = this.hashToken(dto.token.trim());

    return await this.dataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(AgentInvitation, {
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });

      if (!invitation) {
        throw new NotFoundException('Invalid or expired invitation token');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException(
          `Invitation has already been ${invitation.status.toLowerCase()}`,
        );
      }

      if (new Date() > invitation.expiresAt) {
        invitation.status = InvitationStatus.EXPIRED;
        await manager.save(AgentInvitation, invitation);
        throw new BadRequestException(
          'Invitation has expired. Request a new one from the event organizer.',
        );
      }

      const event = await manager.findOne(Event, {
        where: { id: invitation.eventId },
      });

      if (!event) {
        throw new NotFoundException(
          'Event associated with this invitation was not found',
        );
      }

      let user = await manager.findOne(User, {
        where: { email: invitation.email },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        if (!dto.password || dto.password.length < 8) {
          throw new BadRequestException(
            'A valid password (at least 8 characters) is required to register a new agent account',
          );
        }

        const saltRounds = Number(
          this.configService.get('BCRYPT_SALT_ROUNDS', 10),
        );
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        const [firstName, ...lastNameParts] = (invitation.fullName || '')
          .trim()
          .split(' ');

        user = manager.create(User, {
          email: invitation.email,
          firstName: firstName || 'Agent',
          lastName: lastNameParts.join(' ') || '',
          passwordHash: hashedPassword,
          role: UserRole.GATE_AGENT,
          isEmailVerified: true,
        });

        user = await manager.save(User, user);
      }

      const existingAgent = await manager.findOne(EventAgent, {
        where: { eventId: invitation.eventId, userId: user.id },
      });

      if (!existingAgent) {
        const agent = manager.create(EventAgent, {
          eventId: invitation.eventId,
          userId: user.id,
          clearanceLevel: SyncClearanceLevel.FULL_SYNC,
          isActive: true,
        });

        await manager.save(EventAgent, agent);
      } else if (!existingAgent.isActive) {
        existingAgent.isActive = true;
        await manager.save(EventAgent, existingAgent);
      }

      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      await manager.save(AgentInvitation, invitation);

      this.logger.log(
        `Invitation accepted successfully by ${user.email} for Event ${invitation.eventId}`,
      );

      return {
        message: 'Invitation accepted successfully',
        eventId: invitation.eventId,
        userId: user.id,
      };
    });
  }

  async revokeInvitation(invitationId: string, organizerId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['event'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You do not have permission to revoke this invitation',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot revoke an invitation that is already ${invitation.status.toLowerCase()}`,
      );
    }

    invitation.status = InvitationStatus.REVOKED;
    await this.invitationRepo.save(invitation);

    return { message: 'Invitation revoked successfully' };
  }

  async getEventAgents(eventId: string, organizerId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['agents', 'agents.user', 'invitations'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      agents: event.agents ?? [],
      invitations: event.invitations ?? [],
    };
  }
}
