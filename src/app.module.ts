import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WalletModule } from "./wallet/wallet.module";
import { LedgerModule } from "./ledger/ledger.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { UtilitiesModule } from "./utilities/utilities.module";
import { VirtualAccountModule } from "./virtual-account/virtual-account.module";
import { typeOrmConfig } from "./config/typeorm.config";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import { ReloadlyModule } from "./reloadly/reloadly.module";
import { QueueModule } from "./queue/queue";
import { AirtimeModule } from "./airtime/airtime.module";
import { GiftcardModule } from "./giftcard/giftcard.module";
import { EventsModule } from "./events/events.module";
import { AdminModule } from "./admin/admin.module";
import { MediaModule } from "./media/media.module";
import { SupportInquiriesModule } from "./support/support-inquiries.module";
import { AgentOnboardingModule } from "./agents/agent-onboarding.module";
import { MailerModule } from "./mailer/mailer.module";
import { CacheModule } from "./radis/cache.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    CacheModule,
    AuthModule,
    UsersModule,
    WalletModule,
    LedgerModule,
    TransactionsModule,
    UtilitiesModule,
    AirtimeModule,
    GiftcardModule,
    EventsModule,
    VirtualAccountModule,
    ReloadlyModule,
    QueueModule,
    AdminModule,
    MediaModule,
    SupportInquiriesModule,
    AgentOnboardingModule,
    MailerModule,
    TicketsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    IdempotencyInterceptor,
  ],
  exports: [],
})
export class AppModule {}
