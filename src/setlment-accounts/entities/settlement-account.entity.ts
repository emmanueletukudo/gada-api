import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

@Entity({ name: 'settlement_accounts' })
@Index(['organizerId', 'accountNumber', 'bankCode'], { unique: true })
export class SettlementAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ name: 'organizer_id' })
  organizerId!: string;

  @Column({ type: 'varchar', length: 150 })
  accountName!: string;

  @Column({ type: 'varchar', length: 20 })
  accountNumber!: string;

  @Column({ type: 'varchar', length: 100 })
  bankName!: string;

  @Column({
    name: 'paystack_subaccount_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  paystackSubaccountCode?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  bankCode?: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Event, (event) => event.settlementAccount)
  events!: Event[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
