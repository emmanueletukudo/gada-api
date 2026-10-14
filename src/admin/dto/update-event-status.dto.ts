import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EventStatus } from "../../events/entities/event.entity";

export class UpdateEventStatusDto {
  @IsEnum(EventStatus)
  @ApiProperty({ enum: EventStatus })
  status!: EventStatus;
}
