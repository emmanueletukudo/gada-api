import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SupportInquiriesService } from './support-inquiries.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/users/entities/user.entity';
import { InquiryStatus } from './entities/support-inquiry.entity';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller('support-inquiries')
@UseGuards(JwtAuthGuard)
export class SupportInquiriesController {
  constructor(private readonly service: SupportInquiriesService) {}

  @Post()
  async logInquiry(
    @CurrentUser() user: User,
    @Body()
    body: {
      eventId: string;
      orderId: string;
      guestName: string;
      phoneNumber: string;
      lastMessage: string;
    },
  ) {
    return this.service.logInquiry(user.id, body);
  }

  @Get('organizer')
  async getOrganizerInquiries(@CurrentUser() user: User) {
    return this.service.getInquiriesForOrganizer(user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: InquiryStatus,
  ) {
    return this.service.updateStatus(id, user.id, status);
  }
}
