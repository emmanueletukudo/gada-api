import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendee, AttendeeStatus } from '../events/entities/attendee.entity';
import { GetMyTicketsDto, TicketStatusFilter } from './dto/get-my-tickets.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Attendee)
    private readonly attendeeRepo: Repository<Attendee>,
  ) {}

  async findTicketsByAttendee(userId: string, query: GetMyTicketsDto) {
    const qb = this.attendeeRepo
      .createQueryBuilder('attendee')
      .leftJoinAndSelect('attendee.event', 'event')
      .leftJoinAndSelect('attendee.tier', 'tier')
      .leftJoin('attendee.user', 'user') 
      .where('user.id = :userId', { userId })
      .orderBy('attendee.createdAt', 'DESC');

    const now = new Date();

    if (query.status === TicketStatusFilter.UPCOMING) {
      qb.andWhere('event.startsAt >= :now', { now });
    } else if (query.status === TicketStatusFilter.PAST) {
      qb.andWhere('event.startsAt < :now', { now });
    }

    const attendees = await qb.getMany();

    return attendees.map((attendee) => {
      const eventStartDate = attendee.event?.startsAt
        ? new Date(attendee.event.startsAt)
        : null;
      const isUpcoming = eventStartDate ? eventStartDate >= now : true;

      let displayStatus: 'UPCOMING' | 'USED' | 'EXPIRED' = 'UPCOMING';
      if (attendee.status === AttendeeStatus.CHECKED_IN) {
        displayStatus = 'USED';
      } else if (!isUpcoming || attendee.status === AttendeeStatus.CANCELLED) {
        displayStatus = 'EXPIRED';
      }

      return {
        id: attendee.id,
        eventTitle: attendee.event?.name || 'Event Pass',
        eventDate: eventStartDate
          ? eventStartDate.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : 'Date TBD',
        eventLocation: attendee.event?.venue || 'Location TBD',
        ticketType: attendee.tier?.name || 'Regular Entry',
        ticketCode:
          attendee.ticketId || `GADA-${attendee.id.slice(0, 8).toUpperCase()}`,
        status: displayStatus,
        qrCodeUrl: attendee.qrPayload,
      };
    });
  }

  async findTicketByIdAndUser(ticketId: string, userId: string) {
    const attendee = await this.attendeeRepo.findOne({
      where: { id: ticketId, user: { id: userId } },
      relations: ['event', 'tier', 'order'],
    });

    if (!attendee) {
      throw new NotFoundException('Ticket pass not found');
    }

    const now = new Date();
    const eventStartDate = attendee.event?.startsAt
      ? new Date(attendee.event.startsAt)
      : null;
    const isUpcoming = eventStartDate ? eventStartDate >= now : true;

    return {
      id: attendee.id,
      eventTitle: attendee.event?.name,
      eventDate: eventStartDate,
      eventLocation: attendee.event?.venue,
      ticketType: attendee.tier?.name,
      ticketCode: attendee.ticketId,
      status: !isUpcoming ? 'EXPIRED' : 'UPCOMING',
      qrCodeUrl: attendee.qrPayload,
    };
  }
}
