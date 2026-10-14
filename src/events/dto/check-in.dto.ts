import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  qrPayload!: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}
