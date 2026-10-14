import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { KycStatus } from "../../users/dto/create-user.dto";

export class UpdateKycDto {
  @IsEnum(KycStatus)
  @ApiProperty({ enum: KycStatus })
  status!: KycStatus;
}
