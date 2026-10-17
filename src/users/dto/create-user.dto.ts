import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsIn,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
  IsOptional,
  Length,
} from "class-validator";
import { UserRole } from "../entities/user-role.enum";
import { AccountType } from "../entities/account-type.enum";
import { AuthProvider } from "../entities/auth-provider-enum";

export enum KycStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}


export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;
}

export class SendOtpDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  @Matches(/^[A-Za-z]+$/, {
    message: 'First name must contain only letters',
  })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  @Matches(/^[A-Za-z]+$/, {
    message: 'Last name must contain only letters',
  })
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsPhoneNumber('NG')
  phone!: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(8)
  password?: string;

  @ApiProperty()
  @IsOptional()
  @Matches(/^\d{4,6}$/, {
    message: 'PIN must be 4-6 digits',
  })
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  pin?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostName!: string;

  @ApiProperty({ enum: AccountType, default: AccountType.INDIVIDUAL })
  @IsEnum(AccountType)
  accountType: AccountType = AccountType.INDIVIDUAL;

  @IsEnum(AuthProvider)
  @IsOptional()
  provider?: AuthProvider;

  @ApiProperty({ default: false })
  @IsBoolean()
  isEmailVerified: boolean = false;

  @ApiProperty({ enum: KycStatus, default: KycStatus.PENDING })
  @IsEnum(KycStatus)
  kycStatus: KycStatus = KycStatus.PENDING;

  @ApiProperty({
    enum: [UserRole.ATTENDEE, UserRole.ORGANIZER],
    default: UserRole.ATTENDEE,
  })
  @IsIn([UserRole.ATTENDEE, UserRole.ORGANIZER])
  role: UserRole = UserRole.ATTENDEE;
}
