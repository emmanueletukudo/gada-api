import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { VirtualAccountProvider } from '../entities/virtual-account.entity';

export class CreateVirtualAccountDto {
  @ApiProperty({ enum: VirtualAccountProvider })
  @IsEnum(VirtualAccountProvider)
  provider!: VirtualAccountProvider;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankName!: string;
}
