import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { User } from '../users/entities/user.entity';
import { OrganizerAnalyticsService } from './organizer-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('organizer')
export class OrganizerAnalyticsController {
  constructor(private readonly analyticsService: OrganizerAnalyticsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('events/:id/analytics')
  @Roles(UserRole.ORGANIZER)
  async getEventAnalytics(
    @Param('id') eventId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.analyticsService.getEventAnalytics(eventId, user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('events/:id/export-audit')
  @Roles(UserRole.ORGANIZER)
  async exportAuditLog(
    @Param('id') eventId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const csvStream = await this.analyticsService.generateAuditCsvStream(
      eventId,
      user.userId,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-log-event-${eventId}.csv"`,
    );

    csvStream.pipe(res);
  }
}
