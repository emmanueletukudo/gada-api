import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { Event } from '../events/entities/event.entity';
import { CheckIn } from '../events/entities/check-in.entity';
import { Attendee, AttendeeStatus } from '../events/entities/attendee.entity';
import { TicketTier } from '../events/entities/ticket-tier.entity';

@Injectable()
export class OrganizerAnalyticsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
    @InjectRepository(Attendee)
    private readonly attendeeRepo: Repository<Attendee>,
    @InjectRepository(TicketTier)
    private readonly tierRepo: Repository<TicketTier>,
  ) {}

  private async verifyEventOwnership(eventId: string, organizerId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You do not have administrative access to this event',
      );
    }

    return event;
  }

  async getEventAnalytics(eventId: string, organizerId: string) {
    const event = await this.verifyEventOwnership(eventId, organizerId);

    const totalSold = await this.attendeeRepo.count({
      where: { event: { id: eventId } },
    });
    const totalCheckedIn = await this.attendeeRepo.count({
      where: { event: { id: eventId }, status: AttendeeStatus.CHECKED_IN },
    });

    const onlineScansCount = await this.checkInRepo.count({
      where: {
        attendee: { event: { id: eventId } },
        isOfflineSync: false,
      } as any,
    });
    const offlineScansCount = await this.checkInRepo.count({
      where: {
        attendee: { event: { id: eventId } },
        isOfflineSync: true,
      } as any,
    });

    const tierBreakdown = await this.tierRepo
      .createQueryBuilder('tier')
      .leftJoin('tier.attendees', 'attendee')
      .select('tier.name', 'tierName')
      .addSelect('COUNT(attendee.id)', 'totalSold')
      .addSelect(
        `SUM(CASE WHEN attendee.status = 'CHECKED_IN' THEN 1 ELSE 0 END)`,
        'checkedIn',
      )
      .where('tier.event.id = :eventId', { eventId })
      .groupBy('tier.id')
      .addGroupBy('tier.name')
      .getRawMany();

    const agentBreakdown = await this.checkInRepo
      .createQueryBuilder('checkin')
      .leftJoin('checkin.checkedInBy', 'agent')
      .leftJoin('checkin.attendee', 'attendee')
      .select("CONCAT(agent.firstName, ' ', agent.lastName)", 'agentName')
      .addSelect('COUNT(checkin.id)', 'totalScans')
      .addSelect(
        'SUM(CASE WHEN checkin.isOfflineSync = true THEN 1 ELSE 0 END)',
        'offlineScans',
      )
      .where('attendee.eventId = :eventId', { eventId })
      .groupBy('agent.id')
      .addGroupBy('agent.firstName')
      .addGroupBy('agent.lastName')
      .getRawMany();

    const hourlyRaw = await this.checkInRepo
      .createQueryBuilder('checkin')
      .leftJoin('checkin.attendee', 'attendee')
      .select("DATE_TRUNC('hour', checkin.checkedInAt)", 'hourGroup')
      .addSelect('COUNT(checkin.id)', 'scanCount')
      .where('attendee.eventId = :eventId', { eventId })
      .groupBy("DATE_TRUNC('hour', checkin.checkedInAt)")
      .orderBy("DATE_TRUNC('hour', checkin.checkedInAt)", 'ASC')
      .getRawMany();

    const turnoutHourly = hourlyRaw.map((h) => ({
      hourLabel: new Date(h.hourGroup).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      scanCount: parseInt(h.scanCount, 10),
    }));

    return {
      eventId: event.id,
      eventName: event.name,
      venue: event.venue,
      city: event.city,
      startedAt: event.startsAt,
      endedAt: event.endsAt,
      totalSold,
      totalCheckedIn,
      onlineScansCount,
      offlineScansCount,
      pendingSyncCount: 0,
      tierBreakdown: tierBreakdown.map((t) => ({
        tierName: t.tierName || 'Standard',
        totalSold: parseInt(t.totalSold, 10),
        checkedIn: parseInt(t.checkedIn || '0', 10),
      })),
      agentBreakdown: agentBreakdown.map((a) => ({
        agentName: a.agentName?.trim() || 'Unknown Agent',
        totalScans: parseInt(a.totalScans, 10),
        offlineScans: parseInt(a.offlineScans || '0', 10),
      })),
      turnoutHourly,
    };
  }

  async generateAuditCsvStream(
    eventId: string,
    organizerId: string,
  ): Promise<Readable> {
    await this.verifyEventOwnership(eventId, organizerId);

    const logs = await this.checkInRepo.find({
      where: { attendee: { event: { id: eventId } } } as any,
      relations: ['attendee', 'checkedInBy'],
      order: { checkedInAt: 'ASC' },
    });

    const headers = [
      'Ticket ID',
      'Guest Name',
      'Scan Mode',
      'Scan Type',
      'Checked-in Timestamp',
      'Agent Name',
    ];

    const rows = logs.map((log) => [
      log.attendee?.ticketId || log.attendee?.id,
      `"${log.attendee?.guestFullName || 'N/A'}"`,
      log.mode,
      (log as any).isOfflineSync ? 'OFFLINE_SYNC' : 'LIVE',
      log.checkedInAt ? new Date(log.checkedInAt).toISOString() : '',
      `"${log.checkedInBy ? `${log.checkedInBy.firstName} ${log.checkedInBy.lastName}` : 'N/A'}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return Readable.from([csvContent]);
  }
}
