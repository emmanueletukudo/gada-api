import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { VirtualAccountService } from "./virtual-account.service";
import { VirtualAccountController } from "./virtual-account.controller";
import { VirtualAccount } from "./entities/virtual-account.entity";
import { UsersModule } from "../users/users.module";
import { WalletModule } from "../wallet/wallet.module";
import { PaystackService } from "./providers/paystack/paystack.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([VirtualAccount]),
    UsersModule,
    WalletModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [VirtualAccountController],
  providers: [VirtualAccountService, PaystackService],
  exports: [VirtualAccountService, PaystackService],
})
export class VirtualAccountModule {}
