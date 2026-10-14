import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Ledger, LedgerSide } from '../ledger/entities/ledger.entity';

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Ledger) private readonly ledgerRepo: Repository<Ledger>,
  ) {}

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async credit(wallet: Wallet, amount: string, reference: string, description: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const walletForUpdate = await manager.getRepository(Wallet).findOne({
        where: { id: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!walletForUpdate) {
        throw new Error('Wallet not found');
      }

      const currentBalance = BigInt(walletForUpdate.balance);
      const creditAmount = BigInt(amount);

      walletForUpdate.balance = (currentBalance + creditAmount).toString();
      await manager.getRepository(Wallet).save(walletForUpdate);

      const journalId = reference;

      await manager.getRepository(Ledger).insert([
        {
          wallet: walletForUpdate,
          amount,
          side: LedgerSide.DEBIT,
          journalId,
          reference,
          description: `OFFSET:${description}`,
        },
        {
          wallet: walletForUpdate,
          amount,
          side: LedgerSide.CREDIT,
          journalId,
          reference,
          description,
        },
      ]);
    });
  }

  async debit(wallet: Wallet, amount: string, reference: string, description: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const walletForUpdate = await manager.getRepository(Wallet).findOne({
        where: { id: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!walletForUpdate) {
        throw new Error('Wallet not found');
      }

      const currentBalance = BigInt(walletForUpdate.balance);
      const debitAmount = BigInt(amount);

      if (currentBalance < debitAmount) {
        throw new Error('Insufficient balance');
      }

      walletForUpdate.balance = (currentBalance - debitAmount).toString();
      await manager.getRepository(Wallet).save(walletForUpdate);

      const journalId = reference;

      await manager.getRepository(Ledger).insert([
        {
          wallet: walletForUpdate,
          amount,
          side: LedgerSide.DEBIT,
          journalId,
          reference,
          description,
        },
        {
          wallet: walletForUpdate,
          amount,
          side: LedgerSide.CREDIT,
          journalId,
          reference,
          description: `OFFSET:${description}`,
        },
      ]);
    });
  }
}

