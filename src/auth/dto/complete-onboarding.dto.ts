import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AccountType } from '../../users/entities/account-type.enum';

export class CompleteOnboardingDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Host name is required' })
  hostName!: string;

  @IsEnum(AccountType, { message: 'Invalid account type' })
  accountType!: AccountType;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;
}
