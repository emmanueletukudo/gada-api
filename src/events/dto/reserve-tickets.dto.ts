import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ReserveItemDto {
  @IsString()
  @IsNotEmpty()
  tierId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReserveTicketsDto {
  @ValidateIf((o) => !o.paymentReference)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReserveItemDto)
  items!: ReserveItemDto[];

  @ValidateIf((o) => !o.paymentReference)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Paystack reference returned by checkout initialization',
  })
  paymentReference?: string;
}
