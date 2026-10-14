import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { VirtualAccountService } from "../virtual-account/virtual-account.service";
import { VirtualAccountProvider } from "../virtual-account/entities/virtual-account.entity";
import { MailerService } from "src/mailer/mailer-service";
import { CacheService } from "src/radis/cache.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly virtualAccountService: VirtualAccountService,
    private readonly cacheService: CacheService,
    private readonly mailerService: MailerService,
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
        bankName: 'Paystack Bank',
      });
    } catch (error) {
      await this.usersService.remove(user.id);
      throw error;
    }

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
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
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
