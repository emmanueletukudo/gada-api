import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from './event.entity';
import { TicketTier } from './ticket-tier.entity';
import { Order } from './order.entity';
import { Gender } from '../../users/entities/gender-enum';

export enum AttendeeStatus {
  RESERVED = 'RESERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
}


@Entity({ name: 'event_attendees' })
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, { nullable: false, onDelete: 'CASCADE' })
  event!: Event;

  @ManyToOne(() => TicketTier, (tier) => tier.attendees, { nullable: false })
  tier!: TicketTier;

  @ManyToOne(() => Order, (order) => order.attendees, { nullable: false })
  order!: Order;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @Column({ type: 'varchar', nullable: true })
  guestEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  guestFullName?: string;

  @Column({ unique: true })
  ticketId!: string;

  @Column({ type: 'text' })
  qrPayload!: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | 'MALE' | 'FEMALE' | 'OTHER';

  @Column({ type: 'enum', enum: AttendeeStatus })
  status!: AttendeeStatus;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt?: Date;

  @Column({ nullable: true })
  checkedInBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
