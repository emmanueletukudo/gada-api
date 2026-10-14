import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { EventAgent } from "./entities/event-agent.entity";
import { AgentInvitation } from "./entities/agent-invitation.entity";
import { UsersService } from "../users/users.service";
import { Event } from "../events/entities/event.entity";
import { ConfigService } from "@nestjs/config";
import { AgentOnboardingService } from "./agent-onboarding.service";
import { MailerService } from "src/mailer/mailer-service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EventAgent, Event, AgentInvitation]),
  ],
  providers: [
    AgentOnboardingService,
    UsersService,
    ConfigService,
    MailerService,
  ],
  exports: [AgentOnboardingService],
})
export class AgentOnboardingModule {};

