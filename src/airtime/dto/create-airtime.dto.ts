import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export enum AirtimeType {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
}

export class CreateAirtimeDto {
  @ApiProperty({ enum: AirtimeType })
  @IsEnum(AirtimeType)
  type!: AirtimeType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  operator!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;
}

