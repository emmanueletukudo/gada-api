import { IsOptional, IsEnum } from 'class-validator';

export enum TicketStatusFilter {
  UPCOMING = 'UPCOMING',
  PAST = 'PAST',
  ALL = 'ALL',
}

export class GetMyTicketsDto {
  @IsOptional()
  @IsEnum(TicketStatusFilter)
  status?: TicketStatusFilter;
}
