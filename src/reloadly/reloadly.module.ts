import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReloadlyService } from './reloadly.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({}),
  ],
  providers: [ReloadlyService],
  exports: [ReloadlyService],
})
export class ReloadlyModule {}

