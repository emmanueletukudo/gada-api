import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSettlementAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  accountName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  bankCode?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
