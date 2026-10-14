import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { WalletService } from '../wallet/wallet.service';
import { AirtimeType } from '../airtime/dto/create-airtime.dto';

interface InitiateElectricityDto {
  amount: string;
  meterNumber: string;
  serviceId: string;
  provider: string;
}

interface InitiateAirtimeDto {
  amount: string;
  phoneNumber: string;
  operator: string;
  type: AirtimeType;
}

interface InitiateGiftcardDto {
  amount: string;
  productId: string;
  countryCode: string;
  recipientEmail: string;
}

@Injectable()
export class TransactionsService {
  private readonly UTILITY_FEE = '100';
  private readonly GIFTCARD_FEE = '100';

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly walletService: WalletService,
    @InjectQueue('utilities') private readonly utilitiesQueue: Queue,
  ) {}

  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

  findAll() {
    const transactions = this.txRepo.find();
    return transactions;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }

  async initiateElectricity(userId: string, dto: InitiateElectricityDto) {
    const clientReference = randomUUID();
    const totalAmount = (
      Number(dto.amount) + Number(this.UTILITY_FEE)
    ).toString();

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const tx = this.txRepo.create({
      user: { id: userId } as any,
      type: TransactionType.UTILITY,
      status: TransactionStatus.PENDING,
      amount: totalAmount,
      clientReference,
      meta: {
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
        originalAmount: dto.amount,
        fee: this.UTILITY_FEE,
        utilityType: 'ELECTRICITY',
      },
    });
    await this.txRepo.save(tx);

    await this.walletService.debit(
      wallet,
      totalAmount,
      clientReference,
      'UTILITY_ELECTRICITY',
    );

    await this.utilitiesQueue.add('electricity', {
      userId,
      clientReference,
      amount: dto.amount,
      meterNumber: dto.meterNumber,
      serviceId: dto.serviceId,
      provider: dto.provider,
    });

    return {
      message: 'Processing',
      reference: clientReference,
    };
  }

  async initiateWater(userId: string, dto: InitiateElectricityDto) {
    const clientReference = randomUUID();
    const totalAmount = (
      Number(dto.amount) + Number(this.UTILITY_FEE)
    ).toString();

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const tx = this.txRepo.create({
      user: { id: userId } as any,
      type: TransactionType.UTILITY,
      status: TransactionStatus.PENDING,
      amount: totalAmount,
      clientReference,
      meta: {
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
        utilityType: 'WATER',
        originalAmount: dto.amount,
        fee: this.UTILITY_FEE,
      },
    });
    await this.txRepo.save(tx);

    await this.walletService.debit(
      wallet,
      totalAmount,
      clientReference,
      'UTILITY_WATER',
    );

    await this.utilitiesQueue.add('water', {
      userId,
      clientReference,
      amount: dto.amount,
      meterNumber: dto.meterNumber,
      serviceId: dto.serviceId,
      provider: dto.provider,
    });

    return {
      message: 'Processing',
      reference: clientReference,
    };
  }

  async initiateCable(userId: string, dto: InitiateElectricityDto) {
    const clientReference = randomUUID();
    const totalAmount = (
      Number(dto.amount) + Number(this.UTILITY_FEE)
    ).toString();

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const tx = this.txRepo.create({
      user: { id: userId } as any,
      type: TransactionType.UTILITY,
      status: TransactionStatus.PENDING,
      amount: totalAmount,
      clientReference,
      meta: {
        meterNumber: dto.meterNumber,
        serviceId: dto.serviceId,
        provider: dto.provider,
        utilityType: 'CABLE',
        originalAmount: dto.amount,
        fee: this.UTILITY_FEE,
      },
    });
    await this.txRepo.save(tx);

    await this.walletService.debit(
      wallet,
      totalAmount,
      clientReference,
      'UTILITY_CABLE',
    );

    await this.utilitiesQueue.add('cable', {
      userId,
      clientReference,
      amount: dto.amount,
      meterNumber: dto.meterNumber,
      serviceId: dto.serviceId,
      provider: dto.provider,
    });

    return {
      message: 'Processing',
      reference: clientReference,
    };
  }

  async initiateAirtime(userId: string, dto: InitiateAirtimeDto) {
    const clientReference = randomUUID();

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const tx = this.txRepo.create({
      user: { id: userId } as any,
      type: TransactionType.AIRTIME,
      status: TransactionStatus.PENDING,
      amount: dto.amount,
      clientReference,
      meta: {
        phoneNumber: dto.phoneNumber,
        operator: dto.operator,
        type: dto.type,
      },
    });
    await this.txRepo.save(tx);

    await this.walletService.debit(
      wallet,
      dto.amount,
      clientReference,
      'AIRTIME_OR_DATA',
    );

    await this.utilitiesQueue.add(
      dto.type === AirtimeType.AIRTIME ? 'airtime' : 'data',
      {
        userId,
        clientReference,
        amount: dto.amount,
        phoneNumber: dto.phoneNumber,
        operator: dto.operator,
        type: dto.type,
      },
    );

    return {
      message: 'Processing',
      reference: clientReference,
    };
  }

  async initiateGiftcard(userId: string, dto: InitiateGiftcardDto) {
    const clientReference = randomUUID();
    const totalAmount = (
      Number(dto.amount) + Number(this.GIFTCARD_FEE)
    ).toString();

    const wallet = await this.walletService.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const tx = this.txRepo.create({
      user: { id: userId } as any,
      type: TransactionType.GIFTCARD,
      status: TransactionStatus.PENDING,
      amount: totalAmount,
      clientReference,
      meta: {
        productId: dto.productId,
        countryCode: dto.countryCode,
        recipientEmail: dto.recipientEmail,
        originalAmount: dto.amount,
        fee: this.GIFTCARD_FEE,
      },
    });
    await this.txRepo.save(tx);

    await this.walletService.debit(
      wallet,
      totalAmount,
      clientReference,
      'GIFTCARD_PURCHASE',
    );

    await this.utilitiesQueue.add('giftcard', {
      userId,
      clientReference,
      amount: dto.amount,
      productId: dto.productId,
      countryCode: dto.countryCode,
      recipientEmail: dto.recipientEmail,
    });

    return {
      message: 'Processing',
      reference: clientReference,
    };
  }
}
