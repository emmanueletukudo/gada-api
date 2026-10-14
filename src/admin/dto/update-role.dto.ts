import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../users/entities/user-role.enum";

export class UpdateRoleDto {
  @IsEnum(UserRole)
  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}
