import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EventType, VirtualPlatform } from '../entities/event.entity';

export class CreateTicketTierDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumberString()
  price!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsDateString()
  salesStart?: string;

  @IsOptional()
  @IsDateString()
  salesEnd?: string;
}

export class UpdateTicketTierDto extends PartialType(CreateTicketTierDto) {
  @IsUUID()
  @IsOptional()
  id?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsNotEmpty({ message: 'Event type is required' })
  @IsEnum(EventType, { message: 'Invalid event type selected' })
  eventType!: EventType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  banner?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsDateString()
  @IsNotEmpty()
  startsAt!: string;

  @IsDateString()
  @IsNotEmpty()
  endsAt!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsUUID()
  @IsOptional()
  settlementAccountId?: string;

  @IsUrl({}, { message: 'Invalid Instagram URL' })
  @IsOptional()
  instagram?: string;

  @IsUrl({}, { message: 'Invalid X URL' })
  @IsOptional()
  x?: string;

  @IsUrl({}, { message: 'Invalid Website URL' })
  @IsOptional()
  website?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ValidateIf((o) => o.eventType === EventType.ONLINE_EVENT)
  @IsUrl({}, { message: 'A valid meeting URL is required for online events' })
  meetingLink?: string;

  @ValidateIf((o) => o.eventType === EventType.ONLINE_EVENT)
  @IsEnum(VirtualPlatform)
  @IsOptional()
  virtualPlatform?: VirtualPlatform;

  @IsOptional()
  @IsString()
  meetingPasscode?: string;

  @IsOptional()
  @IsBoolean()
  coverFees?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTierDto)
  ticketTiers!: CreateTicketTierDto[];
}