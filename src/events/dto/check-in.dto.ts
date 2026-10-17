import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CheckInMode } from '../entities/check-in.entity';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  qrPayload!: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsEnum(CheckInMode, { message: 'Mode must be either IN or OUT' })
  @IsOptional()
  mode?: CheckInMode;

  @IsOptional()
  @IsDateString({}, { message: 'checkedInAt must be a valid ISO date string' })
  checkedInAt?: string;
}

export class BatchCheckInDto {
  @IsUUID('4', { message: 'eventId must be a valid UUID' })
  @IsNotEmpty()
  eventId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckInDto)
  scans!: CheckInDto[];
}
