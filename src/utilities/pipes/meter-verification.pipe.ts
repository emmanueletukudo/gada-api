import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ReloadlyService } from '../../reloadly/reloadly.service';
import {
  CreateUtilityDto,
  UtilityServiceType,
} from '../dto/create-utility.dto';

@Injectable()
export class MeterVerificationPipe implements PipeTransform {
  constructor(private readonly reloadlyService: ReloadlyService) {}

  async transform(
    value: CreateUtilityDto,
    _metadata: ArgumentMetadata,
  ): Promise<CreateUtilityDto> {
    if (value.type !== UtilityServiceType.ELECTRICITY) {
      return value;
    }

    if (!value.meterNumber || !value.serviceId) {
      throw new BadRequestException('Meter number and serviceId are required');
    }

    const billers = await this.reloadlyService.getUtilityBillers({
      id: Number(value.serviceId),
    });

    if (!Array.isArray(billers) || billers.length === 0) {
      throw new BadRequestException('Invalid serviceId or utility provider');
    }

    return value;
  }
}
