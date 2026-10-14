import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum TransactionType {
  UTILITY = 'UTILITY',
  AIRTIME = 'AIRTIME',
  GIFTCARD = 'GIFTCARD',
  WALLET_FUNDING = 'WALLET_FUNDING',
}

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column({ unique: true })
  clientReference!: string;

  @Column({ nullable: true })
  providerReference?: string;

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
