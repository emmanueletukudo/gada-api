import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { VirtualAccountModule } from "../virtual-account/virtual-account.module";
import { JwtStrategy } from "./jwt.strategy";
import { RolesGuard } from "./roles.guard";
import { CacheService } from "../radis/cache.service";

@Module({
  imports: [
    UsersModule,
    VirtualAccountModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "changeme",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, CacheService],
  exports: [AuthService],
})
export class AuthModule {}
