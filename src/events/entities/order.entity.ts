import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Gender, User } from '../../users/entities/user.entity';
import { Event } from './event.entity';
import { Attendee } from './attendee.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}


@Entity({ name: 'event_orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @ManyToOne(() => User, { nullable: true })
  buyer?: User | null;

  @Column({ type: 'varchar', nullable: true })
  guestEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  guestFullName?: string;

  @Column({ type: 'varchar', nullable: true })
  guestPhone?: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | 'MALE' | 'FEMALE' | 'OTHER';

  @ManyToOne(() => Event, (event) => event.orders, { nullable: false })
  event!: Event;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  totalAmount!: string;

  @Column({ default: 'NGN' })
  currency!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  platformFee!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  organizerAmount!: string;

  @Column({ nullable: true, unique: true })
  paymentReference?: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @OneToMany(() => Attendee, (attendee) => attendee.order)
  attendees!: Attendee[];

  @CreateDateColumn()
  createdAt!: Date;
}
