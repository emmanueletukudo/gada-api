import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class CreateGiftcardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recipientEmail!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;
}

