
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventDto, UpdateTicketTierDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(
  OmitType(CreateEventDto, ['ticketTiers'] as const),
) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTicketTierDto)
  @IsOptional()
  ticketTiers?: UpdateTicketTierDto[];
}
