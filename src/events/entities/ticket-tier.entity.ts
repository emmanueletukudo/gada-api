import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Attendee } from './attendee.entity';

@Entity({ name: 'event_ticket_tiers' })
export class TicketTier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, (event) => event.ticketTiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'event_id' })
  eventId!: string;

  @Column()
  name!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  price!: string;

  @Column({ default: 'NGN' })
  currency!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  soldCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  salesStart?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  salesEnd?: Date;

  @OneToMany(() => Attendee, (attendee) => attendee.tier)
  attendees!: Attendee[];
}
