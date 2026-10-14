// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   ManyToOne,
//   OneToMany,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn,
// } from 'typeorm';
// import { User } from '../../users/entities/user.entity';
// import { TicketTier } from './ticket-tier.entity';
// import { Order } from './order.entity';

// export enum EventStatus {
//   DRAFT = 'DRAFT',
//   PUBLISHED = 'PUBLISHED',
//   SUSPENDED = 'SUSPENDED',
//   DELETED = 'DELETED',
// }

// @Entity({ name: 'events' })
// export class Event {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @ManyToOne(() => User, { nullable: false })
//   organizer!: User;

//   @Column()
//   name!: string;

//   @Column({ type: 'text' })
//   description!: string;

//   @Column()
//   category!: string;

//   @Column({ type: 'jsonb', default: '[]' })
//   images!: string[];

//   @Column({ nullable: true })
//   banner?: string;

//   @Column({ nullable: true })
//   venue?: string;

//   @Column({ nullable: true })
//   city?: string;

//   @Column({ default: false })
//   isOnline!: boolean;

//   @Column({ type: 'timestamptz' })
//   startsAt!: Date;

//   @Column({ type: 'timestamptz' })
//   endsAt!: Date;

//   @Column({ type: 'int', nullable: true })
//   capacity?: number;

//   @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
//   status!: EventStatus;

//   @Column({ unique: true })
//   slug!: string;

//   @OneToMany(() => TicketTier, (tier) => tier.event)
//   ticketTiers!: TicketTier[];

//   @OneToMany(() => Order, (order) => order.event)
//   orders!: Order[];

//   @CreateDateColumn()
//   createdAt!: Date;

//   @UpdateDateColumn()
//   updatedAt!: Date;
// }

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TicketTier } from './ticket-tier.entity';
import { Order } from './order.entity';
import { SettlementAccount } from '../../setlment-accounts/entities/settlement-account.entity';
import { EventAgent } from '../../agents/entities/event-agent.entity';
import { AgentInvitation } from '../../agents/entities/agent-invitation.entity';
import { EventCategory } from './event-category.entity';


export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum EventType {
  PARTY_SCENES = 'PARTY_SCENES',
  FREE_EVENT = 'FREE_EVENT',
  SMALL_GATHERINGS = 'SMALL_GATHERINGS',
  CONFERENCES = 'CONFERENCES',
  ONLINE_EVENT = 'ONLINE_EVENT',
  LARGE_EVENTS = 'LARGE_EVENTS',
}

export enum VirtualPlatform {
  ZOOM = 'ZOOM',
  GOOGLE_MEET = 'GOOGLE_MEET',
  YOUTUBE_LIVE = 'YOUTUBE_LIVE',
  TEAMS = 'TEAMS',
  CUSTOM = 'CUSTOM',
}

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.SMALL_GATHERINGS,
  })
  eventType!: EventType;

  @Column({ nullable: true })
  meetingLink?: string;

  @Column({
    type: 'enum',
    enum: VirtualPlatform,
    nullable: true,
  })
  virtualPlatform?: VirtualPlatform;

  @Column({ nullable: true })
  meetingPasscode?: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ name: 'organizer_id' })
  organizerId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', default: '[]' })
  images!: string[];

  @Column({ nullable: true })
  banner?: string;

  @Column({ nullable: true })
  venue?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ default: false })
  isOnline!: boolean;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'timestamptz' })
  endsAt!: Date;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status!: EventStatus;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'boolean', default: false })
  coverFees!: boolean;

  @ManyToOne(() => SettlementAccount, (account) => account.events, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'settlement_account_id' })
  settlementAccount?: SettlementAccount;

  @Column({ name: 'settlement_account_id', nullable: true })
  settlementAccountId?: string;

  @OneToMany(() => EventAgent, (agent) => agent.event)
  agents!: EventAgent[];

  @OneToMany(() => AgentInvitation, (invitation) => invitation.event)
  invitations!: AgentInvitation[];

  @ManyToOne(() => EventCategory, (category) => category.events, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: EventCategory;

  @Column({ name: 'category_id' })
  categoryId!: string;

  @Column({ nullable: true })
  instagram?: string;

  @Column({ nullable: true })
  x?: string;

  @Column({ nullable: true })
  website?: string;

  @OneToMany(() => TicketTier, (tier) => tier.event)
  ticketTiers!: TicketTier[];

  @OneToMany(() => Order, (order) => order.event)
  orders!: Order[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}