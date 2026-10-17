import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { GetMyTicketsDto } from './dto/get-my-tickets.dto';


@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}


  @Get('my-tickets')
  async getMyTickets(@Req() req: any, @Query() query: GetMyTicketsDto) {
    const userId = req.user?.sub || req.user?.id || req.user?.userId;
    return this.ticketsService.findTicketsByAttendee(userId, query);
  }


  @Get(':id')
  async getTicketById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.ticketsService.findTicketByIdAndUser(id, userId);
  }
}
