import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'First name cannot be empty' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Last name cannot be empty' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Host name cannot be empty' })
  hostName?: string;

  @IsOptional()
  @IsString()
  @MinLength(7, { message: 'Phone number must be at least 7 characters' })
  phone?: string;
}
