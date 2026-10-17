import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AgentOnboardingService } from './agent-onboarding.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { InviteAgentDto } from './dto/invite-agent.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CurrentUser } from '../auth/current-user.decorator';


type CurrentUserPayload = {
  userId: string;
  email: string;
  role?: string;
};

@Controller('agents')
export class AgentOnboardingController {
  constructor(private readonly service: AgentOnboardingService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  async inviteAgent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteAgentDto,
  ) {
    return this.service.inviteAgent(user, dto);
  }

  @Get('invite-info')
  async getInviteInfo(@Query('token') token: string) {
    return this.service.getInviteInfo(token)
  }

  @Post('accept')
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.service.acceptInvitation(dto);
  }

  @Get('events/:eventId')
  @UseGuards(JwtAuthGuard)
  async getEventAgents(
    @CurrentUser() user: CurrentUserPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.service.getEventAgents(eventId, user.userId);
  }

  @Delete('invitations/:id')
  @UseGuards(JwtAuthGuard)
  async revokeInvitation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.revokeInvitation(id, user.userId);
  }
}
