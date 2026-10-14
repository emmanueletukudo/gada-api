import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { CurrentUserPayload } from "../auth/current-user.decorator";
import { CheckInDto } from "./dto/check-in.dto";
import { InitializeCheckoutDto } from "./dto/initialize-checkout.dto";
import { CreateEventDto } from "./dto/create-event.dto";
import { ReserveTicketsDto } from "./dto/reserve-tickets.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

import { EventsService } from "./events.service";
import { OptionalJwtAuthGuard } from "src/auth/optional-jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/entities/user-role.enum";
import { RolesGuard } from "src/auth/roles.guard";

@Controller()
@ApiTags('Events', 'Tickets', 'Check-in', 'Agent Invite', 'Payments')
@ApiBearerAuth('access-token')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('events')
  @ApiOperation({
    summary: 'List published events with filters and pagination',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    return this.eventsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      category,
      city,
    });
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get a published event by ID or slug' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('events')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizer/events')
  organizerEvents(@CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.organizerEvents(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/check-in')
  @Roles(UserRole.ORGANIZER, UserRole.GATE_AGENT)
  checkIn(@CurrentUser() user: CurrentUserPayload, @Body() dto: CheckInDto) {
    return this.eventsService.checkIn(user.userId, dto);
  }

  @Get('agents/events/:eventId/attendees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.GATE_AGENT)
  async getEventAttendees(
    @CurrentUser() user: CurrentUserPayload,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.getEventAttendeesForAgent(user.userId, eventId);
  }

  @Get('agents/assigned-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.GATE_AGENT)
  async getAssignedEvents(@CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.getAssignedEventsForUser(
      user.userId,
      user.role as UserRole,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizer/events/:id/dashboard')
  dashboard(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.eventsService.dashboard(user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizer/events/:id/update')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/:id/publish')
  publish(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.eventsService.publish(id, user.userId);
  }

  @Get('organizer/events/:id')
  @UseGuards(JwtAuthGuard)
  async getOrganizerEvent(
    @Param('id') eventId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.eventsService.findOrganizerEvent(eventId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('events/:id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.eventsService.remove(user.userId, id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('events/:id/checkout/initialize')
  @ApiOperation({
    summary: 'Initialize a Paystack checkout for guest or logged-in user',
  })
  initializeCheckout(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('id') id: string,
    @Body() dto: InitializeCheckoutDto,
  ) {
    const userId = user?.userId;
    const email = user?.email || dto.email;

    if (!email) {
      throw new BadRequestException('Email address is required for checkout');
    }

    return this.eventsService.initializeCheckout(userId, email, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/:id/checkout/verify')
  @ApiOperation({ summary: 'Verify a Paystack transaction' })
  verifyCheckout(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('reference') reference: string,
  ) {
    return this.eventsService.verifyCheckout(user.userId, id, reference);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('events/:id/reserve')
  @ApiOperation({
    summary: 'Reserve tickets after payment verification or for free tier',
  })
  reserve(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Param('id') id: string,
    @Body() dto: ReserveTicketsDto,
  ) {
    const userId = user?.userId;
    const email = user?.email || dto.email;

    if (!email && !dto.paymentReference) {
      throw new BadRequestException(
        'Email address is required to complete reservation',
      );
    }

    return this.eventsService.reserve(userId, email || '', id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/me')
  myOrders(@CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.myOrders(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tickets/me')
  myTickets(@CurrentUser() user: CurrentUserPayload) {
    return this.eventsService.myTickets(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('organizer/orders/:orderNumber/refund')
  refund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.eventsService.refund(user.userId, orderNumber);
  }
}
