import { MailerService } from "./mailer-service";
import { Global, Module } from "@nestjs/common";


@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})

export class MailerModule {}
