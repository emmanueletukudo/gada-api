import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReloadlyService } from '../reloadly/reloadly.service';
import {
  Transaction,
  TransactionStatus,
} from '../transactions/entities/transaction.entity';

interface ElectricityJobData {
  clientReference: string;
  meterNumber: string;
  amount: string;
  serviceId: string;
  provider: string;
  userId: string;
}
type WaterJobData = ElectricityJobData;
type CableJobData = ElectricityJobData;

interface AirtimeJobData {
  clientReference: string;
  phoneNumber: string;
  amount: string;
  operator: string;
  type: 'AIRTIME' | 'DATA';
  userId: string;
}

interface GiftcardJobData {
  clientReference: string;
  productId: string;
  countryCode: string;
  recipientEmail: string;
  amount: string;
  userId: string;
}

@Processor('utilities')
export class UtilitiesProcessor extends WorkerHost {
  constructor(
    private readonly reloadlyService: ReloadlyService,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case 'electricity':
        return this.handleElectricity(job as Job<ElectricityJobData>);
      case 'water':
        return this.handleWater(job as Job<WaterJobData>);
      case 'cable':
        return this.handleCable(job as Job<CableJobData>);
      case 'airtime':
        return this.handleAirtime(job as Job<AirtimeJobData>);
      case 'data':
        return this.handleData(job as Job<AirtimeJobData>);
      case 'giftcard':
        return this.handleGiftcard(job as Job<GiftcardJobData>);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleElectricity(job: Job<ElectricityJobData>): Promise<void> {
    const { clientReference, meterNumber, amount, serviceId } = job.data;

    try {
      const res = await this.reloadlyService.payUtilityBill({
        subscriberAccountNumber: meterNumber,
        amount: Number(amount),
        billerId: Number(serviceId),
        referenceId: clientReference,
        useLocalAmount: false,
      });

      await this.txRepo.update({ clientReference }, {
        status: TransactionStatus.SUCCESS,
        providerReference: (res as any).id,
        meta: res as Record<string, unknown>,
      } as any);
    } catch (error) {
      await this.txRepo.update(
        { clientReference },
        {
          status: TransactionStatus.FAILED,
        },
      );
      throw error;
    }
  }

  private async handleWater(job: Job<WaterJobData>): Promise<void> {
    return this.handleElectricity(job);
  }

  private async handleCable(job: Job<CableJobData>): Promise<void> {
    return this.handleElectricity(job);
  }

  private async handleAirtime(job: Job<AirtimeJobData>): Promise<void> {
    const { clientReference, phoneNumber, amount, operator } = job.data;

    try {
      const res = await this.reloadlyService.topUpAirtime({
        operatorId: operator,
        amount,
        recipientPhone: {
          countryCode: 'NG',
          number: phoneNumber,
        },
        customIdentifier: clientReference,
      });

      await this.txRepo.update({ clientReference }, {
        status: TransactionStatus.SUCCESS,
        providerReference: (res as any).id,
        meta: res as Record<string, unknown>,
      } as any);
    } catch (error) {
      await this.txRepo.update(
        { clientReference },
        {
          status: TransactionStatus.FAILED,
        },
      );
      throw error;
    }
  }

  private async handleData(job: Job<AirtimeJobData>): Promise<void> {
    return this.handleAirtime(job);
  }

  private async handleGiftcard(job: Job<GiftcardJobData>): Promise<void> {
    const { clientReference, productId, recipientEmail, amount, userId } =
      job.data;

    try {
      const res = await this.reloadlyService.createGiftcardOrder({
        senderName: 'GADA',
        productId: Number(productId),
        quantity: 1,
        unitPrice: Number(amount),
        customIdentifier: clientReference,
        recipientEmail,
        productAdditionalRequirements: {
          userId,
        },
      });

      await this.txRepo.update({ clientReference }, {
        status: TransactionStatus.SUCCESS,
        providerReference: (res as any).id,
        meta: res as Record<string, unknown>,
      } as any);
    } catch (error) {
      await this.txRepo.update(
        { clientReference },
        {
          status: TransactionStatus.FAILED,
        },
      );
      throw error;
    }
  }
}
