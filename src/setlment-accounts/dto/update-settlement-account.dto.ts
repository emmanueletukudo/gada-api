import { PartialType } from '@nestjs/mapped-types';
import { CreateSettlementAccountDto } from './create-settlement-account.dto';

export class UpdateSettlementAccountDto extends PartialType(
  CreateSettlementAccountDto,
) {}
