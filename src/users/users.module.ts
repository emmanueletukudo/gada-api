import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { R2Service } from 'src/media/r2.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Wallet])],
  controllers: [UsersController],
  providers: [UsersService, R2Service],
  exports: [UsersService],
})
export class UsersModule {}
