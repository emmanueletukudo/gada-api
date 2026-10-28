import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CreateUserDto, SendOtpDto, VerifyOtpDto } from "../users/dto/create-user.dto";
import { LoginDto } from "../users/dto/login-user.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CompleteOnboardingDto } from "./dto/complete-onboarding.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and return an access token' })
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user and return an access token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('google')
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.verifyAndLoginGoogleUser(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.token,
      dto.newPassword,
    );
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(
    @Req() req: any,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.authService.updateUserOnboarding(userId, dto);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send email verification OTP' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify email OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }
}
