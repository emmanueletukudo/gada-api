import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty({ message: 'tierId is required for each item' })
  tierId!: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class InitializeCheckoutDto {
  @IsArray({ message: 'items must be an array' })
  @ArrayMinSize(1, { message: 'At least one ticket item must be selected' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['MALE', 'FEMALE', 'OTHER'], {
    message: 'Gender must be MALE, FEMALE, or OTHER',
  })
  @IsOptional()
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}
