import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VirtualAccountService } from '../virtual-account/virtual-account.service';
import { VirtualAccountProvider } from '../virtual-account/entities/virtual-account.entity';
import { MailerService } from 'src/mailer/mailer-service';
import { CacheService } from 'src/radis/cache.service';
import { UserRole } from '../users/entities/user-role.enum';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from 'src/users/entities/auth-provider-enum';
import { AccountType } from '../users/entities/account-type.enum';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { User } from 'src/users/entities/user.entity';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly virtualAccountService: VirtualAccountService,
    private readonly cacheService: CacheService,
    private readonly mailerService: MailerService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async register(dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new UnauthorizedException('Email already taken by another user');
    }
    const user = await this.usersService.create(dto);

    try {
      await this.virtualAccountService.createForUser(user.id, {
        provider: VirtualAccountProvider.PAYSTACK,
        bankName: 'wema-bank',
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to create Paystack virtual account for user ${user.id}: ${error?.message}`,
      );
    }

    await this.mailerService
      .sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
      })
      .catch((err) => {
        this.logger.error(
          `Failed to send welcome email to ${user.email}:`,
          err,
        );
      });

    const token = await this.signToken(user.id, user.email, user.role);
    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hostname: user.hostName,
        accountType: user.accountType,
        isEmailVerified: user.isEmailVerified,
        kycStatus: user.kycStatus,
        role: user.role,
        wallet: user.wallet,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.passwordHash as string);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async verifyAndLoginGoogleUser(dto: GoogleAuthDto) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google Token');
      }

      let user = await this.usersRepo.findOne({
        where: { email: payload.email },
      });
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        user = this.usersRepo.create({
          email: payload.email,
          firstName: payload.given_name || dto.firstName || 'User',
          lastName: payload.family_name || dto.lastName || '',
          phone: '',
          hostName: payload.given_name || 'User',
          accountType: AccountType.INDIVIDUAL,
          role: UserRole.ATTENDEE,
          provider: AuthProvider.GOOGLE,
          isEmailVerified: true,
        });
        user = await this.usersRepo.save(user);

        try {
          await this.virtualAccountService.createForUser(user.id, {
            provider: VirtualAccountProvider.PAYSTACK,
            bankName: 'wema-bank',
          });
        } catch (error: any) {
          this.logger.error(
            `Failed to create Paystack virtual account for user ${user.id}: ${error?.message}`,
          );
        }

       await this.mailerService
          .sendWelcomeEmail({
            email: user.email,
            firstName: user.firstName,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to send welcome email to Google user ${user?.email}:`,
              err,
            );
          });
      } else {
        if (!user.phone || user.phone.trim() === '') {
          isNewUser = true;
        }
      }

      const jwtPayload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(jwtPayload);
      const { passwordHash, ...safeUser } = user;
      return {
        accessToken,
        user: safeUser,
        isNewUser,
      };
    } catch (error) {
      this.logger.error('Google authentication failed:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }
  async updateUserOnboarding(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    if (!userId) {
      throw new UnauthorizedException(
        'User ID is missing from authentication context',
      );
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    let hashedPassword = user.passwordHash;
    if (dto.password && dto.password.trim() !== '') {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    }

    const role =
      dto.accountType === AccountType.ORGANIZATION
        ? UserRole.ORGANIZER
        : UserRole.ATTENDEE;

    await this.usersRepo.update(userId, {
      phone: dto.phone,
      hostName: dto.hostName,
      accountType: dto.accountType,
      role: role,
      passwordHash: hashedPassword || undefined,
      isEmailVerified: true,
    });

    const updatedUser = await this.usersRepo.findOne({ where: { id: userId } });
    if (!updatedUser) {
      throw new NotFoundException('User account not found after update');
    }

    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const { passwordHash, ...safeUser } = updatedUser;

    return {
      accessToken,
      user: safeUser,
    };
  }

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(email, password);
    const token = await this.signToken(user.id, user.email, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hostName: user.hostName,
        accountType: user.accountType,
        isEmailVerified: user.isEmailVerified,
        logoUrl: user.logoUrl,
        kycStatus: user.kycStatus,
        role: user.role,
        wallet: user.wallet,
      },
    };
  }

  async sendOtp(email: string): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already taken by another user');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.cacheService.set(`otp:${email}`, otp, 600);
    await this.mailerService.sendOtpEmail(email, otp);

    console.log(`[DEV OTP] Code for ${email}: ${otp}`);
    return { message: 'Verification code sent successfully' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ verified: boolean }> {
    const storedOtp = await this.cacheService.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.cacheService.del(`otp:${email}`);
    return { verified: true };
  }

  private signToken(userId: string, email: string, role?: string) {
    return this.jwtService.signAsync({ sub: userId, email, role }, {});
  }
}
