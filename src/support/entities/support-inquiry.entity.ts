import { User } from 'src/users/entities/user.entity';
import { Event } from 'src/events/entities/event.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum InquiryStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

@Entity('support_inquiries')
export class SupportInquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'organizer_id', type: 'uuid' })
  organizerId!: string;

  @Index()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'guest_name', type: 'varchar', length: 255 })
  guestName!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 30 })
  phoneNumber!: string;

  @Column({
    name: 'ticket_tier_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  ticketTierName?: string;

  @Column({ name: 'ticket_quantity', type: 'int', default: 1 })
  ticketQuantity!: number;

  @Column({ name: 'last_message', type: 'text' })
  lastMessage!: string;

  @Column({
    type: 'enum',
    enum: InquiryStatus,
    default: InquiryStatus.OPEN,
  })
  status!: InquiryStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
