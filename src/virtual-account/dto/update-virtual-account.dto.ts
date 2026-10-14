import { PartialType } from '@nestjs/swagger';
import { CreateVirtualAccountDto } from './create-virtual-account.dto';

export class UpdateVirtualAccountDto extends PartialType(CreateVirtualAccountDto) {}
