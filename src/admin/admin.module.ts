import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Event } from "../events/entities/event.entity";
import { Order } from "../events/entities/order.entity";
import { CheckIn } from "../events/entities/check-in.entity";
import { User } from "../users/entities/user.entity";
import { AdminController } from "./admin.controller";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Event, Order, CheckIn, User]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
