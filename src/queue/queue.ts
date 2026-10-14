import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilitiesProcessor } from './worker';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ReloadlyModule } from '../reloadly/reloadly.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'utilities',
    }),
    BullModule.registerQueue({
      name: 'reconciliation',
    }),
    TypeOrmModule.forFeature([Transaction]),
    ReloadlyModule,
  ],
  providers: [UtilitiesProcessor],
})
export class QueueModule {}

