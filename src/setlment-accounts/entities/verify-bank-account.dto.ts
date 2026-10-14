// dto/verify-bank-account.dto.ts
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyBankAccountDto {
  @IsNotEmpty()
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber!: string;

  @IsNotEmpty()
  @IsString()
  bankCode!: string;
}
