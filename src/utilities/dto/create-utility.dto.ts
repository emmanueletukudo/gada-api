import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export enum UtilityServiceType {
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  CABLE = 'CABLE',
}

export class CreateUtilityDto {
  @ApiProperty({ enum: UtilityServiceType })
  @IsEnum(UtilityServiceType)
  type!: UtilityServiceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  meterNumber!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;
}
