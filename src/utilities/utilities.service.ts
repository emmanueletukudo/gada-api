import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateUtilityDto, UtilityServiceType } from './dto/create-utility.dto';
import { ReloadlyService } from '../reloadly/reloadly.service';

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly reloadlyService: ReloadlyService,
  ) {}

  async initiate(userId: string, dto: CreateUtilityDto) {
    if (dto.type === UtilityServiceType.ELECTRICITY) {
      return this.transactionsService.initiateElectricity(userId, {
        amount: dto.amount,
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
      });
    }

    if (dto.type === UtilityServiceType.WATER) {
      return this.transactionsService.initiateWater(userId, {
        amount: dto.amount,
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
      });
    }

    if (dto.type === UtilityServiceType.CABLE) {
      return this.transactionsService.initiateCable(userId, {
        amount: dto.amount,
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
      });
    }

    return { message: 'Unsupported utility type' };
  }

  async listBillers(query?: {
    id?: number;
    name?: string;
    type?: string;
    serviceType?: string;
  }) {
    return this.reloadlyService.getUtilityBillers(query);
  }

  async getBillerById(billerId: string) {
    return this.reloadlyService.getUtilityBillerById(Number(billerId));
  }
}
