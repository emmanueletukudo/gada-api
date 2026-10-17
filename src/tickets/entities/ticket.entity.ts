import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TicketTier } from '../../events/entities/ticket-tier.entity';
import { Order } from '../../events/entities/order.entity';
import { Event  } from '../../events/entities/event.entity';

export enum TicketStatus {
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity({ name: 'event_tickets' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  ticketCode!: string;

  @Column({ nullable: true })
  qrCodeUrl?: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.VALID,
  })
  status!: TicketStatus;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'event_id' })
  eventId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @ManyToOne(() => Order, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string | null;

  @ManyToOne(() => TicketTier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tier_id' })
  tier?: TicketTier | null;

  @Column({ name: 'tier_id', nullable: true })
  tierId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  type?: string; 

  @CreateDateColumn()
  createdAt!: Date;
}
