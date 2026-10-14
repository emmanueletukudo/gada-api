import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InquiryStatus,
  SupportInquiry,
} from './entities/support-inquiry.entity';
import { Order } from 'src/events/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { TicketTier } from 'src/events/entities/ticket-tier.entity';

@Injectable()
export class SupportInquiriesService {
  constructor(
    @InjectRepository(SupportInquiry)
    private readonly inquiryRepo: Repository<SupportInquiry>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}


  async logInquiry(
    userId: string,
    data: {
      eventId: string;
      orderId: string;
      guestName: string;
      phoneNumber: string;
      lastMessage: string;
    },
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: data.orderId, buyer: { id: userId } },
      relations: ['event', 'buyer', 'attendees', 'attendees.ticketTier'],
    });

    if (!order) {
      throw new NotFoundException(
        'Valid ticket order not found for this account',
      );
    }

    if (order.event?.id !== data.eventId) {
      throw new BadRequestException('Order does not match target event');
    }

    const fallbackName = order.buyer
      ? `${order.buyer.firstName ?? ''} ${order.buyer.lastName ?? ''}`.trim()
      : '';

    const totalQuantity = order.attendees?.length || 1;

    const uniqueTierNames = Array.from(
      new Set(
        order.attendees
          ?.map((a) => a.tier?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    );

    const ticketTierName =
      uniqueTierNames.length > 0
        ? uniqueTierNames.join(', ')
        : 'General Admission';

  
    const inquiry = this.inquiryRepo.create({
      organizerId: order.event.organizerId,
      eventId: data.eventId,
      orderId: data.orderId,
      guestName: data.guestName || fallbackName || 'Guest User',
      phoneNumber: data.phoneNumber || order.buyer?.phone || '',
      ticketTierName,
      ticketQuantity: totalQuantity,
      lastMessage: data.lastMessage,
      status: InquiryStatus.OPEN,
    });

    return await this.inquiryRepo.save(inquiry);
  }
  async getInquiriesForOrganizer(organizerId: string) {
    const inquiries = await this.inquiryRepo.find({
      where: { organizerId },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });

    return inquiries.map((inquiry) => ({
      id: inquiry.id,
      orderId: inquiry.orderId,
      guestName: inquiry.guestName,
      eventName: inquiry.event?.name || 'General Support',
      phoneNumber: inquiry.phoneNumber,
      ticketTierName: inquiry.ticketTierName,
      ticketQuantity: inquiry.ticketQuantity,
      lastMessage: inquiry.lastMessage,
      status: inquiry.status,
      timestamp: inquiry.createdAt,
    }));
  }

  async updateStatus(id: string, organizerId: string, status: InquiryStatus) {
    const inquiry = await this.inquiryRepo.findOne({ where: { id } });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.organizerId !== organizerId) {
      throw new ForbiddenException('You do not have access to this inquiry');
    }

    inquiry.status = status;
    return await this.inquiryRepo.save(inquiry);
  }
}
