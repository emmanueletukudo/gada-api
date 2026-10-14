import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum VirtualAccountProvider {
  MONO = 'MONO',
  FLUTTERWAVE = 'FLUTTERWAVE',
  PAYSTACK = 'PAYSTACK',
  MONNIFY = 'MONNIFY',
}

@Entity({ name: 'virtual_accounts' })
export class VirtualAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column()
  accountNumber!: string;

  @Column()
  bankName!: string;

  @Column({ type: 'enum', enum: VirtualAccountProvider })
  provider!: VirtualAccountProvider;

  @Column()
  providerReference!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
