import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from '../../wallet/entities/wallet.entity';

export enum LedgerSide {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

@Entity({ name: 'ledger_entries' })
export class Ledger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Wallet, { nullable: false })
  wallet!: Wallet;

  @Column({ type: 'enum', enum: LedgerSide })
  side!: LedgerSide;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column()
  journalId!: string;

  @Column()
  reference!: string;

  @Column()
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
