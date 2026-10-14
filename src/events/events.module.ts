import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletModule } from '../wallet/wallet.module';
import { Attendee } from './entities/attendee.entity';
import { CheckIn } from './entities/check-in.entity';
import { Event } from './entities/event.entity';
import { Order } from './entities/order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { VirtualAccountModule } from '../virtual-account/virtual-account.module';
import { AgentOnboardingController } from '../agents/agent-onboarding.controller';
import { SettlementAccountsController } from '../setlment-accounts/settlement-accounts.controller';
import { SettlementAccountsService } from '../setlment-accounts/settlement-accounts.service';
import { AgentOnboardingService } from '../agents/agent-onboarding.service';
import { SettlementAccount } from '../setlment-accounts/entities/settlement-account.entity';
import { AgentInvitation } from '../agents/entities/agent-invitation.entity';
import { EventAgent } from '../agents/entities/event-agent.entity';
import { User } from '../users/entities/user.entity';
import { EventCategory } from './entities/event-category.entity';
import { EventCategoriesController } from './event-categories.controller';
import { EventCategoriesService } from './event-categories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      TicketTier,
      SettlementAccount,
      AgentInvitation,
      EventAgent,
      Order,
      Attendee,
      CheckIn,
      User,
      EventCategory
    ]),
    WalletModule,
    VirtualAccountModule,
  ],
  controllers: [
    EventsController,
    AgentOnboardingController,
    SettlementAccountsController,
    EventCategoriesController,
  ],
  providers: [EventsService, EventCategoriesService, SettlementAccountsService, AgentOnboardingService],
  exports: [EventsService],
})
export class EventsModule {}
