import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SyncClearanceLevel } from '../entities/event-agent.entity';

export class InviteAgentDto {
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEnum(SyncClearanceLevel)
  @IsOptional()
  clearanceLevel?: SyncClearanceLevel;
}
