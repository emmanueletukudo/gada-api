import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateAirtimeDto } from './dto/create-airtime.dto';
import { ReloadlyService } from '../reloadly/reloadly.service';

@Injectable()
export class AirtimeService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly reloadlyService: ReloadlyService,
  ) {}

  async initiate(userId: string, dto: CreateAirtimeDto) {
    return this.transactionsService.initiateAirtime(userId, {
      amount: dto.amount,
      phoneNumber: dto.phoneNumber,
      operator: dto.operator,
      type: dto.type,
    });
  }

  async getOperators(query?: {
    includeBundles?: boolean;
    includeData?: boolean;
    suggestedAmountsMap?: boolean;
    size?: number;
  }) {
    return this.reloadlyService.getAirtimeOperators(query);
  }

  async getOperatorById(operatorId: string) {
    return this.reloadlyService.getAirtimeOperatorById(operatorId);
  }

  async getFxRate(operatorId: string | number) {
    return this.reloadlyService.getAirtimeFxRate(operatorId);
  }

  async getCountries(query?: { size?: number; page?: number }) {
    return this.reloadlyService.getAirtimeCountries(query);
  }
}
