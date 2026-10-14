import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { WalletService } from '../wallet/wallet.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ReserveTicketsDto } from './dto/reserve-tickets.dto';
import { CheckInDto } from './dto/check-in.dto';
import { Attendee, AttendeeStatus } from './entities/attendee.entity';
import { CheckIn } from './entities/check-in.entity';
import { Event, EventStatus, EventType } from './entities/event.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { TicketTier } from './entities/ticket-tier.entity';
import { PaystackService } from '../virtual-account/providers/paystack/paystack.service';
import { EventCategory } from './entities/event-category.entity';
import { SettlementAccount } from '../setlment-accounts/entities/settlement-account.entity';
import { validate as isUuid } from 'uuid';
import { MailerService } from '../mailer/mailer-service';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';
import { User } from 'src/users/entities/user.entity';
import {
  EventAgent,
  SyncClearanceLevel,
} from 'src/agents/entities/event-agent.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CurrentUserPayload } from 'src/auth/current-user.decorator';
import { metadata } from 'reflect-metadata/no-conflict';

@Injectable()
export class EventsService {
  private readonly qrSecret =
    process.env.EVENT_QR_SECRET ?? process.env.JWT_SECRET ?? 'changeme';
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(TicketTier)
    private readonly tierRepo: Repository<TicketTier>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(SettlementAccount)
    private readonly settlementAccountRepo: Repository<SettlementAccount>,
    @InjectRepository(EventAgent)
    private readonly eventAgentRepo: Repository<EventAgent>,
    @InjectRepository(Attendee)
    private readonly attendeeRepo: Repository<Attendee>,
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
    private readonly paystackService: PaystackService,
    private readonly mailerService: MailerService,
  ) {}

  // async initializeCheckout(
  //   userId: string | undefined,
  //   email: string,
  //   eventId: string,
  //   dto: InitializeCheckoutDto,
  // ) {
  //   const items = dto.items;
  //   const tierIds = items.map((i) => i.tierId);
  //   const tiers = await this.tierRepo.find({
  //     where: { id: In(tierIds), event: { id: eventId } },
  //     relations: ['event', 'event.settlementAccount'],
  //   });

  //   if (tiers.length !== new Set(tierIds).size) {
  //     throw new NotFoundException(
  //       'One or more selected ticket tiers were not found for this event.',
  //     );
  //   }

  //   const event = tiers[0].event;
  //   if (event.status !== EventStatus.PUBLISHED) {
  //     throw new BadRequestException(
  //       'This event is not active for ticket sales.',
  //     );
  //   }

  //   const settlementAccount = await this.settlementAccountRepo.findOne({
  //     where: { organizer: { id: event.organizerId } },
  //   });

  //   const subaccountCode = settlementAccount?.paystackSubaccountCode;
  //   this.logger.log(`Subaccount Code for Event ${eventId}: ${subaccountCode}`);

  //   if (!subaccountCode) {
  //     throw new BadRequestException(
  //       'Organizer has not connected a payout account for split payments.',
  //     );
  //   }

  //   const now = new Date();
  //   let subtotalNaira = 0;
  //   const itemMap = new Map(items.map((i) => [i.tierId, i.quantity]));

  //   const processedItems = tiers.map((tier) => {
  //     const requestedQty = itemMap.get(tier.id) ?? 0;

  //     if (
  //       (tier.salesStart && tier.salesStart > now) ||
  //       (tier.salesEnd && tier.salesEnd < now)
  //     ) {
  //       throw new ConflictException(
  //         `Sales for ticket tier "${tier.name}" are not open.`,
  //       );
  //     }

  //     if (tier.quantity - tier.soldCount < requestedQty) {
  //       throw new ConflictException(
  //         `Not enough tickets remaining for "${tier.name}".`,
  //       );
  //     }

  //     const tierPrice = Number(tier.price);
  //     subtotalNaira += tierPrice * requestedQty;

  //     return {
  //       tierId: tier.id,
  //       name: tier.name,
  //       price: tierPrice,
  //       quantity: requestedQty,
  //     };
  //   });

  //   const reference = `EVT_${randomBytes(10).toString('hex').toUpperCase()}`;
  //   const currency = tiers[0]?.currency || 'NGN';

  //   if (subtotalNaira === 0) {
  //     return { reference, amount: 0, currency, free: true };
  //   }

  //   const platformFeeNaira = subtotalNaira * 0.05 + 100;
  //   const totalChargedNaira = subtotalNaira + platformFeeNaira;

  //   const totalAmountInKobo = Math.round(totalChargedNaira * 100);
  //   const platformFeeInKobo = Math.round(platformFeeNaira * 100);

  //   const result = await this.paystackService.initializeTransaction({
  //     email,
  //     amount: totalAmountInKobo,
  //     currency,
  //     reference,
  //     ...(subaccountCode && {
  //       subaccount: subaccountCode,
  //       transaction_charge: platformFeeInKobo,
  //       bearer: 'account',
  //     }),
  //     metadata: {
  //       userId: userId || null,
  //       eventId,
  //       items: processedItems,
  //       fullName: dto.fullName,
  //       phone: dto.phone,
  //       gender: dto.gender,
  //       isGuest: !userId,
  //       subtotal: subtotalNaira,
  //       platformFee: platformFeeNaira,
  //       totalCharged: totalChargedNaira,
  //     },
  //   });

  //   return { reference, ...result.data };
  // }

  async initializeCheckout(
    userId: string | undefined,
    email: string,
    eventId: string,
    dto: InitializeCheckoutDto,
  ) {
    const items = dto.items;
    const tierIds = items.map((i) => i.tierId);

    const tiers = await this.tierRepo.find({
      where: { id: In(tierIds), event: { id: eventId } },
      relations: ['event', 'event.settlementAccount'],
    });

    if (tiers.length !== new Set(tierIds).size) {
      throw new NotFoundException(
        'One or more selected ticket tiers were not found for this event.',
      );
    }

    const event = tiers[0].event;
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'This event is not active for ticket sales.',
      );
    }

    const settlementAccount = await this.settlementAccountRepo.findOne({
      where: { organizer: { id: event.organizerId } },
    });

    const subaccountCode = settlementAccount?.paystackSubaccountCode;

    if (!subaccountCode) {
      throw new BadRequestException(
        'Organizer has not connected a payout account for split payments.',
      );
    }

    const now = new Date();
    let subtotalNaira = 0;
    const itemMap = new Map(items.map((i) => [i.tierId, i.quantity]));

    const processedItems = tiers.map((tier) => {
      const requestedQty = itemMap.get(tier.id) ?? 0;

      if (
        (tier.salesStart && tier.salesStart > now) ||
        (tier.salesEnd && tier.salesEnd < now)
      ) {
        throw new ConflictException(
          `Sales for ticket tier "${tier.name}" are not open.`,
        );
      }

      if (tier.quantity - tier.soldCount < requestedQty) {
        throw new ConflictException(
          `Not enough tickets remaining for "${tier.name}".`,
        );
      }

      const tierPrice = Number(tier.price);
      subtotalNaira += tierPrice * requestedQty;

      return {
        tierId: tier.id,
        name: tier.name,
        price: tierPrice,
        quantity: requestedQty,
      };
    });

    const reference = `EVT_${randomBytes(10).toString('hex').toUpperCase()}`;
    const currency = tiers[0]?.currency || 'NGN';

    if (subtotalNaira === 0) {
      return { reference, amount: 0, currency, free: true };
    }

    const platformFeeNaira = subtotalNaira * 0.05 + 100;
    const coverFees = event.coverFees ?? false;

    const totalChargedNaira = coverFees
      ? subtotalNaira
      : subtotalNaira + platformFeeNaira;

    const totalAmountInKobo = Math.round(totalChargedNaira * 100);
    const platformFeeInKobo = Math.round(platformFeeNaira * 100);
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const result = await this.paystackService.initializeTransaction({
      email,
      amount: totalAmountInKobo,
      currency,
      reference,
      callback_url: `${frontendBaseUrl}/events/${eventId}/verify-payment`,
      ...(subaccountCode && {
        subaccount: subaccountCode,
        transaction_charge: platformFeeInKobo,
        bearer: 'account',
      }),
      metadata: {
        userId: userId || null,
        eventId,
        items: processedItems,
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        isGuest: !userId,
        subtotal: subtotalNaira,
        platformFee: platformFeeNaira,
        totalCharged: totalChargedNaira,
        coverFees,
      },
    });

    return { reference, ...result.data };
  }

  // async reserve(
  //   userId: string | undefined,
  //   email: string,
  //   eventId: string,
  //   dto: ReserveTicketsDto,
  // ) {
  //   if (dto.paymentReference) {
  //     const existingOrder = await this.orderRepo.findOne({
  //       where: { paymentReference: dto.paymentReference },
  //       relations: ['event', 'attendees', 'attendees.tier'],
  //     });

  //     if (existingOrder) {
  //       return existingOrder;
  //     }

  //     const verification = await this.verifyCheckout(
  //       userId as string,
  //       eventId,
  //       dto.paymentReference,
  //     );

  //     if (!verification.verified) {
  //       throw new ConflictException('Payment could not be verified');
  //     }
  //   }

  //   const { order, processedTiers } = await this.dataSource.transaction(
  //     async (manager) => {
  //       const tierIds = dto.items.map((i) => i.tierId);

  //       const tiers = await manager.getRepository(TicketTier).find({
  //         where: { id: In(tierIds), event: { id: eventId } },
  //         relations: ['event'],
  //         lock: { mode: 'pessimistic_write' },
  //       });

  //       if (tiers.length !== new Set(tierIds).size) {
  //         throw new NotFoundException(
  //           'One or more selected ticket tiers were not found',
  //         );
  //       }

  //       const event = tiers[0].event;
  //       if (event.status !== EventStatus.PUBLISHED) {
  //         throw new NotFoundException('Event is not open for registration');
  //       }

  //       const now = new Date();
  //       let aggregateSubtotal = 0;
  //       const itemMap = new Map(dto.items.map((i) => [i.tierId, i.quantity]));

  //       for (const tier of tiers) {
  //         const requestedQty = itemMap.get(tier.id) ?? 0;

  //         if (
  //           (tier.salesStart && tier.salesStart > now) ||
  //           (tier.salesEnd && tier.salesEnd < now)
  //         ) {
  //           throw new ConflictException(
  //             `Ticket sales for "${tier.name}" are closed`,
  //           );
  //         }

  //         if (tier.quantity - tier.soldCount < requestedQty) {
  //           throw new ConflictException(
  //             `Not enough tickets remaining for "${tier.name}"`,
  //           );
  //         }

  //         aggregateSubtotal += Number(tier.price) * requestedQty;
  //       }

  //       const platformFeeNum =
  //         aggregateSubtotal > 0 ? aggregateSubtotal * 0.05 + 100 : 0;
  //       const totalAmountNum = aggregateSubtotal + platformFeeNum;
  //       const organizerAmountNum = aggregateSubtotal;

  //       const orderNumber = `EVT-${randomBytes(5).toString('hex').toUpperCase()}`;

  //       const order = await manager.save(Order, {
  //         orderNumber,
  //         buyer: userId ? ({ id: userId } as User) : null,
  //         guestEmail: !userId ? email : undefined,
  //         guestFullName: !userId ? dto.fullName : undefined,
  //         guestPhone: !userId ? dto.phone : undefined,
  //         event,
  //         totalAmount: totalAmountNum.toFixed(2),
  //         platformFee: platformFeeNum.toFixed(2),
  //         organizerAmount: organizerAmountNum.toFixed(2),
  //         currency: tiers[0].currency,
  //         paymentReference: dto.paymentReference,
  //         status: OrderStatus.PAID,
  //       });

  //       const attendeePayloads: Partial<Attendee>[] = [];

  //       for (const tier of tiers) {
  //         const requestedQty = itemMap.get(tier.id) ?? 0;

  //         tier.soldCount += requestedQty;
  //         await manager.save(TicketTier, tier);

  //         for (let i = 0; i < requestedQty; i++) {
  //           const ticketId = randomUUID();
  //           const signedQrPayload = this.createQrPayload(ticketId, event.id);

  //           attendeePayloads.push({
  //             ticketId,
  //             event,
  //             tier,
  //             order,
  //             user: userId ? ({ id: userId } as User) : null,
  //             guestEmail: !userId ? email : undefined,
  //             guestFullName: !userId ? dto.fullName : undefined,
  //             gender: !userId ? dto.gender : undefined,
  //             status: AttendeeStatus.PAID,
  //             qrPayload: signedQrPayload,
  //           });
  //         }
  //       }

  //       await manager.save(Attendee, attendeePayloads);

  //       return { order, processedTiers: tiers };
  //     },
  //   );

  //   const finalOrder = await this.orderRepo.findOne({
  //     where: { id: order.id },
  //     relations: ['event', 'attendees', 'attendees.tier'],
  //   });

  //   if (finalOrder && finalOrder.attendees?.length > 0) {
  //     const tierSummary = processedTiers
  //       .map((t) => {
  //         const count = finalOrder.attendees.filter(
  //           (a) => a.tier.id === t.id,
  //         ).length;
  //         return `${t.name} (x${count})`;
  //       })
  //       .join(', ');

  //     const ticketsList = finalOrder.attendees.map((a) => ({
  //       ticketId: a.ticketId,
  //       qrPayload: a.qrPayload,
  //       tierName: a.tier.name,
  //       guestName: a.guestFullName,
  //     }));

  //     await this.mailerService
  //       .sendTicketConfirmation({
  //         email,
  //         fullName: dto.fullName || 'Valued Guest',
  //         tickets: ticketsList,
  //         paymentReference:
  //           finalOrder.paymentReference || finalOrder.orderNumber,
  //         quantity: finalOrder.attendees.length,
  //         eventName: finalOrder.event.name,
  //         tierName: tierSummary,
  //         tierPrice: finalOrder.totalAmount,
  //         currency: finalOrder.currency,
  //         eventDate: finalOrder.event.startsAt,
  //         eventLocation: (finalOrder.event.venue as string) || 'Online',
  //       })
  //       .catch((err) =>
  //         this.logger.error(
  //           `Failed to send ticket email to ${email}: ${err.message}`,
  //           err.stack,
  //         ),
  //       );
  //   }

  //   return finalOrder;
  // }

  async reserve(
    userId: string | undefined,
    email: string,
    eventId: string,
    dto: ReserveTicketsDto,
  ) {
    let resolvedEmail = email;
    let resolvedItems = dto.items;
    let resolvedFullName = dto.fullName;
    let resolvedPhone = dto.phone;
    let resolvedGender = dto.gender;

    if (dto.paymentReference) {
      const existingOrder = await this.orderRepo.findOne({
        where: { paymentReference: dto.paymentReference },
        relations: ['event', 'attendees', 'attendees.tier'],
      });

      if (existingOrder) {
        return existingOrder;
      }

      const verification = await this.verifyCheckout(
        userId as string,
        eventId,
        dto.paymentReference,
      );

      if (!verification.verified) {
        throw new ConflictException('Payment could not be verified');
      }

      const metadata = verification.metadata;
      if (metadata && Array.isArray(metadata.items)) {
        resolvedItems = metadata.items;
      }
      resolvedItems = metadata.items || resolvedItems;
      resolvedEmail = verification.email || resolvedEmail;
      resolvedFullName = metadata.fullName || resolvedFullName;
      resolvedPhone = metadata.phone || resolvedPhone;
      resolvedGender = metadata.gender || resolvedGender;
    } else {
      resolvedItems = dto.items || [];
    }

    if (!resolvedItems || resolvedItems.length === 0) {
      throw new BadRequestException(
        'Ticket items are required for reservation',
      );
    }

    const { order, processedTiers } = await this.dataSource.transaction(
      async (manager) => {
        const tierIds = resolvedItems.map((i) => i.tierId);

        const tiers = await manager.getRepository(TicketTier).find({
          where: { id: In(tierIds), event: { id: eventId } },
          relations: ['event'],
          lock: { mode: 'pessimistic_write' },
        });

        if (tiers.length !== new Set(tierIds).size) {
          throw new NotFoundException(
            'One or more selected ticket tiers were not found',
          );
        }

        const event = tiers[0].event;
        if (event.status !== EventStatus.PUBLISHED) {
          throw new NotFoundException('Event is not open for registration');
        }

        const now = new Date();
        let aggregateSubtotal = 0;
        const itemMap = new Map(
          resolvedItems.map((i) => [i.tierId, i.quantity]),
        );

        for (const tier of tiers) {
          const requestedQty = itemMap.get(tier.id) ?? 0;

          if (
            (tier.salesStart && tier.salesStart > now) ||
            (tier.salesEnd && tier.salesEnd < now)
          ) {
            throw new ConflictException(
              `Ticket sales for "${tier.name}" are closed`,
            );
          }

          if (tier.quantity - tier.soldCount < requestedQty) {
            throw new ConflictException(
              `Not enough tickets remaining for "${tier.name}"`,
            );
          }

          aggregateSubtotal += Number(tier.price) * requestedQty;
        }

        const platformFeeNum =
          aggregateSubtotal > 0 ? aggregateSubtotal * 0.05 + 100 : 0;

        const coverFees = event.coverFees ?? false;
        const totalAmountNum = coverFees
          ? aggregateSubtotal
          : aggregateSubtotal + platformFeeNum;
        const organizerAmountNum = coverFees
          ? aggregateSubtotal - platformFeeNum
          : aggregateSubtotal;

        const orderNumber = `EVT-${randomBytes(5).toString('hex').toUpperCase()}`;

        const order = await manager.save(Order, {
          orderNumber,
          buyer: userId ? ({ id: userId } as User) : null,
          guestEmail: !userId ? resolvedEmail : undefined,
          guestFullName: !userId ? resolvedFullName : undefined,
          guestPhone: !userId ? resolvedPhone : undefined,
          event,
          totalAmount: totalAmountNum.toFixed(2),
          platformFee: platformFeeNum.toFixed(2),
          organizerAmount: organizerAmountNum.toFixed(2),
          currency: tiers[0].currency,
          paymentReference: dto.paymentReference,
          status: OrderStatus.PAID,
        });

        const attendeePayloads: Partial<Attendee>[] = [];

        for (const tier of tiers) {
          const requestedQty = itemMap.get(tier.id) ?? 0;

          tier.soldCount += requestedQty;
          await manager.save(TicketTier, tier);

          for (let i = 0; i < requestedQty; i++) {
            const ticketId = randomUUID();
            const signedQrPayload = this.createQrPayload(ticketId, event.id);

            attendeePayloads.push({
              ticketId,
              event,
              tier,
              order,
              user: userId ? ({ id: userId } as User) : null,
              guestEmail: !userId ? resolvedEmail : undefined,
              guestFullName: !userId ? resolvedFullName : undefined,
              gender: !userId ? resolvedGender : undefined,
              status: AttendeeStatus.PAID,
              qrPayload: signedQrPayload,
            });
          }
        }

        await manager.save(Attendee, attendeePayloads);

        return { order, processedTiers: tiers };
      },
    );

    const finalOrder = await this.orderRepo.findOne({
      where: { id: order.id },
      relations: ['event', 'attendees', 'attendees.tier'],
    });

    if (finalOrder && finalOrder.attendees?.length > 0) {
      const tierSummary = processedTiers
        .map((t) => {
          const count = finalOrder.attendees.filter(
            (a) => a.tier.id === t.id,
          ).length;
          return `${t.name} (x${count})`;
        })
        .join(', ');

      const ticketsList = finalOrder.attendees.map((a) => ({
        ticketId: a.ticketId,
        qrPayload: a.qrPayload,
        tierName: a.tier.name,
        guestName: a.guestFullName,
      }));

      const eventObj = finalOrder.event;
      const isOnlineEvent =
        eventObj.isOnline || eventObj.eventType === 'ONLINE_EVENT';

      await this.mailerService
        .sendTicketConfirmation({
          email: resolvedEmail,
          fullName: resolvedFullName || 'Valued Guest',
          tickets: ticketsList,
          paymentReference:
            finalOrder.paymentReference || finalOrder.orderNumber,
          quantity: finalOrder.attendees.length,
          eventName: finalOrder.event.name,
          tierName: tierSummary,
          tierPrice: finalOrder.totalAmount,
          currency: finalOrder.currency,
          eventDate: finalOrder.event.startsAt,
          isOnline: isOnlineEvent,
          meetingLink: isOnlineEvent ? eventObj.meetingLink : undefined,
          virtualPlatform: isOnlineEvent ? eventObj.virtualPlatform : undefined,
          meetingPasscode: isOnlineEvent ? eventObj.meetingPasscode : undefined,
          eventLocation: isOnlineEvent
            ? `Virtual Event (${eventObj.virtualPlatform || 'Online Stream'})`
            : eventObj.venue || 'Venue TBD',
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send ticket email to ${resolvedEmail}: ${err.message}`,
            err.stack,
          ),
        );
    }

    return finalOrder;
  }

  async verifyCheckout(userId: string, eventId: string, reference: string) {
    if (!reference?.trim())
      throw new ConflictException('Payment reference is required');

    const result = await this.paystackService.verifyTransaction(
      reference.trim(),
    );
    const data = result?.data;

    if (result?.status !== true || data?.status !== 'success')
      throw new ConflictException('Paystack payment was not successful');

    if (data?.metadata?.userId && data.metadata.userId !== userId)
      throw new ForbiddenException('Payment does not belong to this user');

    if (data?.metadata?.eventId && data.metadata.eventId !== eventId)
      throw new ConflictException('Payment event mismatch');

    const quantity = Number(data?.metadata?.quantity ?? 0);
    const tierId = data?.metadata?.tierId;

    if (tierId && quantity > 0) {
      const tier = await this.tierRepo.findOne({
        where: { id: tierId, event: { id: eventId } },
      });

      if (!tier) {
        throw new ConflictException('Ticket tier not found');
      }

      const subtotalNaira = Number(tier.price) * quantity;
      const platformFeeNaira =
        subtotalNaira > 0 ? subtotalNaira * 0.05 + 100 : 0;
      const totalChargedNaira = subtotalNaira + platformFeeNaira;

      const expectedAmountInKobo = Math.round(totalChargedNaira * 100);

      if (
        Number(data.amount) !== expectedAmountInKobo ||
        data.currency !== tier.currency
      ) {
        throw new ConflictException('Payment amount or currency mismatch');
      }
    }

    return {
      verified: true,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      email: data.customer?.email || data.customer?.email_address,
    };
  }

  async create(userId: string, dto: CreateEventDto) {
    console.log('Create Event called with:', {
      dto,
    });
    if (!dto.ticketTiers?.length) {
      throw new ConflictException('At least one ticket tier is required');
    }

    const category = await this.dataSource
      .getRepository(EventCategory)
      .findOne({ where: { id: dto.categoryId, isActive: true } });

    if (!category) {
      throw new NotFoundException('Selected event category was not found');
    }

    const isFreeEvent = dto.eventType === EventType.FREE_EVENT;
    const isOnlineEvent = dto.eventType === EventType.ONLINE_EVENT;

    let settlementAccount: SettlementAccount | undefined;

    if (dto.settlementAccountId && !isFreeEvent) {
      const account = await this.dataSource
        .getRepository(SettlementAccount)
        .findOne({ where: { id: dto.settlementAccountId, isActive: true } });

      if (!account) {
        throw new NotFoundException(
          'Selected settlement account was not found',
        );
      }

      if (account.organizerId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to use this settlement account',
        );
      }

      settlementAccount = account;
    }

    const {
      ticketTiers,
      slug: customSlug,
      coverFees,
      meetingLink,
      virtualPlatform,
      meetingPasscode,
    } = dto;

    const rawSlugCandidate = customSlug?.trim() || dto.name;
    const slug = await this.uniqueSlug(rawSlugCandidate);

    const eventId = await this.dataSource.transaction(async (manager) => {
      const eventInstance = manager.create(Event, {
        name: dto.name,
        description: dto.description,
        eventType: dto.eventType,
        isOnline: isOnlineEvent,
        meetingLink: isOnlineEvent ? meetingLink : undefined,
        virtualPlatform: isOnlineEvent ? virtualPlatform : undefined,
        meetingPasscode: isOnlineEvent ? meetingPasscode : undefined,
        organizerId: userId,
        categoryId: category.id,
        settlementAccountId: settlementAccount?.id,
        instagram: dto.instagram,
        twitter: dto.x,
        website: dto.website,
        images: dto.images ?? [],
        banner: dto.banner ?? dto.images?.[0],
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        slug,
        capacity: dto.capacity,
        city: dto.city,
        venue: dto.venue,
        coverFees: coverFees ?? false,
      });

      const event = await manager.save(Event, eventInstance);

      const tiers = manager.create(
        TicketTier,
        ticketTiers.map((tier) => ({
          name: tier.name,
          price: (isFreeEvent ? 0 : tier.price).toString(),
          quantity: Number(tier.quantity),
          currency: tier.currency ?? 'NGN',
          salesStart: tier.salesStart ? new Date(tier.salesStart) : undefined,
          salesEnd: tier.salesEnd ? new Date(tier.salesEnd) : undefined,
          event: event,
        })),
      );

      await manager.save(TicketTier, tiers);
      return event.id;
    });

    return this.findOne(eventId, true);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    city?: string;
  }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const baseWhere = {
      status: EventStatus.PUBLISHED,
      ...(query.category ? { category: { id: query.category } } : {}),
      ...(query.city ? { city: ILike(query.city) } : {}),
    };

    let where: object | object[] = baseWhere;

    if (query.search?.trim()) {
      const searchParam = ILike(`%${query.search.trim()}%`);
      where = [
        { ...baseWhere, name: searchParam },
        { ...baseWhere, description: searchParam },
      ];
    }

    const [data, total] = await this.eventRepo.findAndCount({
      where,
      relations: ['organizer', 'ticketTiers', 'category', 'settlementAccount'],
      order: { startsAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((event) => this.toPublicEvent(event)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrSlug: string, includeDraft = false) {
    const isId = isUuid(idOrSlug);

    const event = await this.eventRepo.findOne({
      where: isId ? { id: idOrSlug } : { slug: idOrSlug },
      relations: ['organizer', 'ticketTiers', 'category', 'settlementAccount'],
    });

    if (!event || (!includeDraft && event.status !== EventStatus.PUBLISHED)) {
      throw new NotFoundException('Event not found');
    }

    return includeDraft ? event : this.toPublicEvent(event);
  }

  async organizerEvents(userId: string) {
    return this.eventRepo.find({
      where: { organizer: { id: userId } },
      relations: ['ticketTiers'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAssignedEventsForUser(userId: string, role: UserRole) {
    if (role === UserRole.ORGANIZER) {
      const events = await this.eventRepo.find({
        where: {
          organizer: { id: userId },
          status: In([EventStatus.PUBLISHED, EventStatus.DRAFT]),
        },
        select: ['id', 'name', 'startsAt', 'endsAt', 'venue', 'status'],
        order: { startsAt: 'ASC' },
      });

      return events.map((event) => ({
        id: event.id,
        name: event.name,
        banner: event.banner,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        venue: event.venue,
        role: 'ORGANIZER',
      }));
    }

    const agentAssignments = await this.eventAgentRepo.find({
      where: {
        userId,
        isActive: true,
      },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });

    return agentAssignments
      .filter(
        (assignment) =>
          assignment.event &&
          (assignment.event.status === EventStatus.PUBLISHED ||
            assignment.event.status === EventStatus.DRAFT),
      )
      .map((assignment) => ({
        id: assignment.event.id,
        name: assignment.event.name,
        banner: assignment.event.banner,
        startsAt: assignment.event.startsAt,
        endsAt: assignment.event.endsAt,
        venue: assignment.event.venue,
        role: 'GATE_AGENT',
      }));
  }

  async getEventAttendeesForAgent(userId: string, eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) throw new NotFoundException('Event not found');

    const isOrganizer = event.organizer.id === userId;
    if (!isOrganizer) {
      const activeAgent = await this.eventAgentRepo.findOne({
        where: { eventId, userId, isActive: true },
      });
      if (!activeAgent) {
        throw new ForbiddenException('Not authorized for this event');
      }
    }

    const attendees = await this.attendeeRepo.find({
      where: { event: { id: eventId } },
      relations: ['tier', 'order'],
      order: { createdAt: 'DESC' },
    });

    return attendees.map((a) => ({
      id: a.id,
      ticketId: a.ticketId,
      guestFullName: a.guestFullName || 'Valued Guest',
      guestEmail: a.guestEmail || a.order?.guestEmail || 'N/A',
      tierName: a.tier?.name || 'General Pass',
      status: a.status,
      checkedInAt: a.checkedInAt,
      orderNumber: a.order?.orderNumber,
      qrPayload: a.qrPayload,
    }));
  }

  async findOrganizerEvent(
    eventId: string,
    organizerId: string,
  ): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'ticketTiers', 'category', 'settlementAccount'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You do not have permission to view this event',
      );
    }
    return event;
  }

  // async update(userId: string, id: string, dto: UpdateEventDto) {
  //   console.log('Update Event called with:', {
  //     userId,
  //     id,
  //     dto,
  //   });

  //   const event = await this.getOwnedEvent(userId, id);
  //   if (!event) throw new NotFoundException('Event not found');

  //   if (dto.categoryId && dto.categoryId !== event.categoryId) {
  //     const category = await this.dataSource
  //       .getRepository(EventCategory)
  //       .findOne({
  //         where: { id: dto.categoryId, isActive: true },
  //       });

  //     if (!category) {
  //       throw new NotFoundException('Selected event category was not found');
  //     }
  //   }

  //   if (
  //     dto.settlementAccountId &&
  //     dto.settlementAccountId !== event.settlementAccountId
  //   ) {
  //     const account = await this.dataSource
  //       .getRepository(SettlementAccount)
  //       .findOne({
  //         where: { id: dto.settlementAccountId, isActive: true },
  //       });

  //     if (!account) {
  //       throw new NotFoundException(
  //         'Selected settlement account was not found',
  //       );
  //     }

  //     if (account.organizerId !== userId) {
  //       throw new ForbiddenException(
  //         'You do not have permission to use this settlement account',
  //       );
  //     }
  //   }

  //   let slug = event.slug;
  //   if (dto.name && dto.name !== event.name) {
  //     slug = await this.uniqueSlug(dto.name);
  //   }

  //   let rawTiers = dto.ticketTiers as any;
  //   if (typeof rawTiers === 'string') {
  //     try {
  //       rawTiers = JSON.parse(rawTiers);
  //     } catch {
  //       rawTiers = [];
  //     }
  //   }

  //   await this.dataSource.transaction(async (manager) => {
  //     const {
  //       ticketTiers,
  //       categoryId,
  //       settlementAccountId,
  //       x,
  //       ...eventFields
  //     } = dto;

  //     event.startsAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt;
  //     event.endsAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
  //     event.slug = slug;

  //     Object.assign(event, {
  //       ...eventFields,
  //       slug,
  //       ...(categoryId && { categoryId }),
  //       ...(settlementAccountId && { settlementAccountId }),
  //       ...(x && { x }),
  //       startsAt: dto.startsAt ? new Date(dto.startsAt) : event.startsAt,
  //       endsAt: dto.endsAt ? new Date(dto.endsAt) : event.endsAt,
  //     });

  //     const updatedEvent = await manager.save(Event, event);

  //     if (rawTiers && Array.isArray(rawTiers)) {
  //       const existingTiers = await manager.find(TicketTier, {
  //         where: { event: { id: updatedEvent.id } },
  //       });

  //       const existingTierMap = new Map(existingTiers.map((t) => [t.id, t]));
  //       const isUUID = (str?: string) =>
  //         Boolean(
  //           str &&
  //           /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
  //             str,
  //           ),
  //         );

  //       const validIncomingIds = new Set(
  //         rawTiers
  //           .map((t: any) => t.id)
  //           .filter((tierId): tierId is string => isUUID(tierId)),
  //       );

  //       const tiersToDelete = existingTiers.filter(
  //         (t) => !validIncomingIds.has(t.id),
  //       );

  //       if (tiersToDelete.length > 0) {
  //         const tiersWithSales = tiersToDelete.filter(
  //           (t) => (t.soldCount ?? 0) > 0,
  //         );
  //         if (tiersWithSales.length > 0) {
  //           throw new BadRequestException(
  //             `Cannot delete ticket tier "${tiersWithSales[0].name}" because tickets have already been sold for it.`,
  //           );
  //         }

  //         await manager.remove(TicketTier, tiersToDelete);
  //       }

  //       const tiersToSave = rawTiers.map((tier: any) => {
  //         const hasValidId = isUUID(tier.id) && existingTierMap.has(tier.id!);

  //         if (hasValidId) {
  //           const existingTier = existingTierMap.get(tier.id!)!;
  //           return manager.create(TicketTier, {
  //             ...existingTier,
  //             ...tier,
  //             event: updatedEvent,
  //             price:
  //               tier.price !== undefined
  //                 ? String(tier.price)
  //                 : existingTier.price,
  //             quantity:
  //               tier.quantity !== undefined
  //                 ? Number(tier.quantity)
  //                 : existingTier.quantity,
  //             currency: tier.currency ?? existingTier.currency ?? 'NGN',
  //             salesStart: tier.salesStart
  //               ? new Date(tier.salesStart)
  //               : existingTier.salesStart,
  //             salesEnd: tier.salesEnd
  //               ? new Date(tier.salesEnd)
  //               : existingTier.salesEnd,
  //           });
  //         }

  //         return manager.create(TicketTier, {
  //           ...tier,
  //           id: undefined,
  //           event: updatedEvent,
  //           price: String(tier.price ?? 0),
  //           quantity: Number(tier.quantity ?? 0),
  //           currency: tier.currency ?? 'NGN',
  //           salesStart: tier.salesStart ? new Date(tier.salesStart) : undefined,
  //           salesEnd: tier.salesEnd ? new Date(tier.salesEnd) : undefined,
  //         });
  //       });

  //       await manager.save(TicketTier, tiersToSave);
  //     }
  //   });

  //   return this.findOne(id, true);
  // }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    console.log('Update Event called with:', {
      userId,
      id,
      dto,
    });

    const event = await this.getOwnedEvent(userId, id);
    if (!event) throw new NotFoundException('Event not found');

    const cleanUuid = (val?: string) =>
      val && val !== 'undefined' && val !== 'null' && val.trim() !== ''
        ? val
        : undefined;

    const sanitizedCategoryId = cleanUuid(dto.categoryId);
    const sanitizedSettlementAccountId = cleanUuid(dto.settlementAccountId);

    if (sanitizedCategoryId && sanitizedCategoryId !== event.categoryId) {
      const category = await this.dataSource
        .getRepository(EventCategory)
        .findOne({
          where: { id: sanitizedCategoryId, isActive: true },
        });

      if (!category) {
        throw new NotFoundException('Selected event category was not found');
      }
    }

    if (
      sanitizedSettlementAccountId &&
      sanitizedSettlementAccountId !== event.settlementAccountId
    ) {
      const account = await this.dataSource
        .getRepository(SettlementAccount)
        .findOne({
          where: { id: sanitizedSettlementAccountId, isActive: true },
        });

      if (!account) {
        throw new NotFoundException(
          'Selected settlement account was not found',
        );
      }

      if (account.organizerId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to use this settlement account',
        );
      }
    }

    let slug = event.slug;
    if (dto.name && dto.name !== event.name) {
      slug = await this.uniqueSlug(dto.name);
    }

    let rawTiers = dto.ticketTiers as any;
    if (typeof rawTiers === 'string') {
      try {
        rawTiers = JSON.parse(rawTiers);
      } catch {
        rawTiers = [];
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const {
        ticketTiers,
        categoryId,
        settlementAccountId,
        x,
        startDate,
        endDate,
        ...eventFields
      } = dto as any;

      const rawStart = dto.startsAt || startDate;
      const rawEnd = dto.endsAt || endDate;

      event.slug = slug;
      if (sanitizedCategoryId) event.categoryId = sanitizedCategoryId;
      if (sanitizedSettlementAccountId)
        event.settlementAccountId = sanitizedSettlementAccountId;
      if (x) event.x = x;
      if (rawStart) event.startsAt = new Date(rawStart);
      if (rawEnd) event.endsAt = new Date(rawEnd);

      Object.assign(event, eventFields);

      const updatedEvent = await manager.save(Event, event);

      if (rawTiers && Array.isArray(rawTiers)) {
        const existingTiers = await manager.find(TicketTier, {
          where: { event: { id: updatedEvent.id } },
        });

        const existingTierMap = new Map(existingTiers.map((t) => [t.id, t]));
        const isUUID = (str?: string) =>
          Boolean(
            str &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              str,
            ),
          );

        const validIncomingIds = new Set(
          rawTiers
            .map((t: any) => t.id)
            .filter((tierId): tierId is string => isUUID(tierId)),
        );

        const tiersMissingFromPayload = existingTiers.filter(
          (t) => !validIncomingIds.has(t.id),
        );

        const tiersWithSales = tiersMissingFromPayload.filter(
          (t) => (t.soldCount ?? 0) > 0,
        );
        const safeTiersToDelete = tiersMissingFromPayload.filter(
          (t) => (t.soldCount ?? 0) === 0,
        );

        if (safeTiersToDelete.length > 0) {
          await manager.remove(TicketTier, safeTiersToDelete);
        }

        const tiersToSave = rawTiers.map((tier: any) => {
          const hasValidId = isUUID(tier.id) && existingTierMap.has(tier.id!);

          if (hasValidId) {
            const existingTier = existingTierMap.get(tier.id!)!;
            return manager.create(TicketTier, {
              ...existingTier,
              ...tier,
              event: updatedEvent,
              price:
                tier.price !== undefined
                  ? String(tier.price)
                  : existingTier.price,
              quantity:
                tier.quantity !== undefined
                  ? Number(tier.quantity)
                  : existingTier.quantity,
              currency: tier.currency ?? existingTier.currency ?? 'NGN',
              salesStart: tier.salesStart
                ? new Date(tier.salesStart)
                : existingTier.salesStart,
              salesEnd: tier.salesEnd
                ? new Date(tier.salesEnd)
                : existingTier.salesEnd,
            });
          }

          return manager.create(TicketTier, {
            ...tier,
            id: undefined,
            event: updatedEvent,
            price: String(tier.price ?? 0),
            quantity: Number(tier.quantity ?? 0),
            currency: tier.currency ?? 'NGN',
            salesStart: tier.salesStart ? new Date(tier.salesStart) : undefined,
            salesEnd: tier.salesEnd ? new Date(tier.salesEnd) : undefined,
          });
        });

        for (const protectedTier of tiersWithSales) {
          const existsInPayload = rawTiers.some(
            (t: any) => t.id === protectedTier.id,
          );
          if (!existsInPayload) {
            tiersToSave.push(
              manager.create(TicketTier, {
                ...protectedTier,
                event: updatedEvent,
              }),
            );
          }
        }

        await manager.save(TicketTier, tiersToSave);
      }
    });

    return this.findOne(id, true);
  }

  async remove(userId: string, id: string) {
    const event = await this.getOwnedEvent(userId, id);
    event.status = EventStatus.DELETED;
    await this.eventRepo.save(event);
    return { message: 'Event deleted' };
  }

  async publish(eventId: string, organizerId: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'ticketTiers', 'category', 'settlementAccount'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to publish this event',
      );
    }
    if (event.status === EventStatus.PUBLISHED) {
      return event;
    }

    if (!event.ticketTiers || event.ticketTiers.length === 0) {
      throw new BadRequestException(
        'Cannot publish an event without at least one ticket tier.',
      );
    }

    const hasPaidTiers = event.ticketTiers.some(
      (tier) => Number(tier.price) > 0,
    );

    if (hasPaidTiers) {
      if (!event.settlementAccount) {
        throw new BadRequestException(
          'Paid events require a linked settlement account for payouts.',
        );
      }

      if (
        !event.settlementAccount.isActive ||
        !event.settlementAccount.paystackSubaccountCode
      ) {
        throw new BadRequestException(
          'Linked settlement account is inactive or missing a valid Paystack subaccount setup.',
        );
      }
    }

    if (new Date(event.startsAt) <= new Date()) {
      throw new BadRequestException(
        'Cannot publish an event with a start date in the past.',
      );
    }

    event.status = EventStatus.PUBLISHED;
    return await this.eventRepo.save(event);
  }

  async dashboard(userId: string, id: string) {
    const event = await this.getOwnedEvent(userId, id);
    const [orders, attendees, checkedIn, ticketTierCount] = await Promise.all([
      this.orderRepo.count({
        where: { event: { id: event.id }, status: OrderStatus.PAID },
      }),
      this.attendeeRepo.count({ where: { event: { id: event.id } } }),
      this.attendeeRepo.count({
        where: { event: { id: event.id }, status: AttendeeStatus.CHECKED_IN },
      }),
      this.tierRepo.count({ where: { event: { id: event.id } } }),
    ]);
    const revenue = await this.orderRepo
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.organizerAmount), 0)', 'total')
      .where('order.eventId = :eventId', { eventId: event.id })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne<{ total: string }>();
    return {
      eventId: event.id,
      orders,
      attendees,
      checkedIn,
      ticketTierCount,
      revenue: revenue?.total ?? '0',
      capacity: event.capacity ?? null,
    };
  }

  async myOrders(userId: string) {
    return this.orderRepo.find({
      where: { buyer: { id: userId } },
      relations: ['event', 'attendees', 'attendees.tier'],
      order: { createdAt: 'DESC' },
    });
  }

  async myTickets(userId: string) {
    return this.attendeeRepo.find({
      where: { user: { id: userId } },
      relations: ['event', 'tier', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  async refund(userId: string, orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
      relations: [
        'buyer',
        'event',
        'event.organizer',
        'attendees',
        'attendees.tier',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.event.organizer.id !== userId)
      throw new ForbiddenException('You do not own this event');
    if (order.status !== OrderStatus.PAID)
      throw new ConflictException('Only paid orders can be refunded');
    const buyerWallet = await this.walletService.findByUserId(
      order.buyer?.id as string,
    );
    if (!buyerWallet) throw new NotFoundException('Buyer wallet not found');
    await this.walletService.credit(
      buyerWallet,
      Math.round(Number(order.totalAmount)).toString(),
      `REFUND-${order.orderNumber}`,
      'EVENT_TICKET_REFUND',
    );
    await this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.REFUNDED;
      await manager.save(order);
      for (const attendee of order.attendees) {
        attendee.status = AttendeeStatus.CANCELLED;
        await manager.save(attendee);
        await manager.increment(
          TicketTier,
          { id: attendee.tier?.id },
          'soldCount',
          -1,
        );
      }
    });
    return { message: 'Order refunded', orderNumber: order.orderNumber };
  }

  // async checkIn(userId: string, dto: CheckInDto) {
  //   const parsed = this.verifyQrPayload(dto.qrPayload);
  //   const targetTicketIds =
  //     parsed.ticketIds || (parsed.ticketId ? [parsed.ticketId] : []);

  //   if (targetTicketIds.length === 0) {
  //     throw new BadRequestException(
  //       'No valid ticket IDs found in scan payload',
  //     );
  //   }

  //   const whereCondition: any = { ticketId: In(targetTicketIds) };
  //   if (parsed.eventId) {
  //     whereCondition.event = { id: parsed.eventId };
  //   }

  //   const attendees = await this.attendeeRepo.find({
  //     where: whereCondition,
  //     relations: ['event', 'event.organizer', 'tier', 'order'],
  //   });

  //   if (!attendees || attendees.length === 0) {
  //     throw new BadRequestException(
  //       'Ticket(s) not found or invalid for this event',
  //     );
  //   }

  //   const primaryEvent = attendees[0].event;
  //   const now = new Date();
  //   const eventStartDate = new Date(primaryEvent.startsAt);
  //   const isOrganizer = primaryEvent.organizer.id === userId;

  //   let activeAgent = null;
  //   if (!isOrganizer) {
  //     activeAgent = await this.eventAgentRepo.findOne({
  //       where: { eventId: primaryEvent.id, userId, isActive: true },
  //     });

  //     if (!activeAgent) {
  //       throw new ForbiddenException(
  //         'You are not authorized as a Gate Agent for this event',
  //       );
  //     }
  //   }

  //   const isPrivilegedBypass =
  //     isOrganizer ||
  //     (activeAgent &&
  //       activeAgent.clearanceLevel === SyncClearanceLevel.FULL_SYNC);

  //   const CHECKIN_WINDOW_BUFFER = 12 * 60 * 60 * 1000;

  //   if (
  //     !isPrivilegedBypass &&
  //     now.getTime() < eventStartDate.getTime() - CHECKIN_WINDOW_BUFFER
  //   ) {
  //     const checkInStartTime = new Date(
  //       eventStartDate.getTime() - CHECKIN_WINDOW_BUFFER,
  //     );
  //     throw new BadRequestException(
  //       `Check-in opens 12 hours before event start time. Check-in for this event opens on ${checkInStartTime.toLocaleString(
  //         'en-US',
  //         {
  //           dateStyle: 'medium',
  //           timeStyle: 'short',
  //         },
  //       )}.`,
  //     );
  //   }

  //   const checkedInResults = [];

  //   for (const attendee of attendees) {
  //     if (attendee.status === AttendeeStatus.CHECKED_IN) {
  //       if (attendees.length === 1) {
  //         throw new ConflictException(
  //           `Ticket already checked in at ${new Date(attendee.checkedInAt!).toLocaleTimeString()}`,
  //         );
  //       }
  //       continue;
  //     }

  //     if (attendee.status !== AttendeeStatus.PAID) {
  //       if (attendees.length === 1) {
  //         throw new ConflictException('Ticket payment pending or cancelled');
  //       }
  //       continue;
  //     }

  //     attendee.status = AttendeeStatus.CHECKED_IN;
  //     attendee.checkedInAt = now;
  //     attendee.checkedInBy = userId;

  //     await this.attendeeRepo.save(attendee);

  //     await this.checkInRepo.save(
  //       this.checkInRepo.create({
  //         attendee,
  //         checkedInBy: { id: userId },
  //       }),
  //     );

  //     checkedInResults.push({
  //       ticketId: attendee.ticketId,
  //       attendeeName: attendee.guestFullName || 'Guest Attendee',
  //       tierName: attendee.tier.name,
  //     });
  //   }

  //   if (checkedInResults.length === 0) {
  //     throw new ConflictException(
  //       'All tickets in this pass have already been checked in',
  //     );
  //   }

  //   const primary =
  //     checkedInResults.find((r) => r.ticketId === attendees[0].ticketId) ||
  //     checkedInResults[0];

  //   return {
  //     valid: true,
  //     totalProcessed: checkedInResults.length,
  //     ticketId: primary.ticketId,
  //     attendeeName: primary.attendeeName,
  //     tierName: primary.tierName,
  //     orderNumber: attendees[0].order?.orderNumber,
  //     checkedInAt: now,
  //     processedTickets: checkedInResults,
  //   };
  // }

  async checkIn(userId: string, dto: CheckInDto) {
    const parsed = this.verifyQrPayload(dto.qrPayload);
    const targetTicketIds =
      parsed.ticketIds || (parsed.ticketId ? [parsed.ticketId] : []);

    if (targetTicketIds.length === 0) {
      throw new BadRequestException(
        'No valid ticket IDs found in scan payload',
      );
    }

    const whereCondition: any = { ticketId: In(targetTicketIds) };
    if (parsed.eventId) {
      whereCondition.event = { id: parsed.eventId };
    }

    const attendees = await this.attendeeRepo.find({
      where: whereCondition,
      relations: ['event', 'event.organizer', 'tier', 'order'],
    });

    if (!attendees || attendees.length === 0) {
      throw new BadRequestException(
        'Ticket(s) not found or invalid for this event',
      );
    }

    const primaryEvent = attendees[0].event;
    const now = new Date();
    const eventStartDate = new Date(primaryEvent.startsAt);
    const isOrganizer = primaryEvent.organizer.id === userId;

    let activeAgent = null;
    if (!isOrganizer) {
      activeAgent = await this.eventAgentRepo.findOne({
        where: { eventId: primaryEvent.id, userId, isActive: true },
      });

      if (!activeAgent) {
        throw new ForbiddenException(
          'You are not authorized as a Gate Agent for this event',
        );
      }
    }

    const isPrivilegedBypass =
      isOrganizer ||
      (activeAgent &&
        activeAgent.clearanceLevel === SyncClearanceLevel.FULL_SYNC);

    const CHECKIN_WINDOW_BUFFER = 12 * 60 * 60 * 1000;

    if (
      !isPrivilegedBypass &&
      now.getTime() < eventStartDate.getTime() - CHECKIN_WINDOW_BUFFER
    ) {
      const checkInStartTime = new Date(
        eventStartDate.getTime() - CHECKIN_WINDOW_BUFFER,
      );
      throw new BadRequestException(
        `Check-in opens 12 hours before event start time. Check-in for this event opens on ${checkInStartTime.toLocaleString(
          'en-US',
          {
            dateStyle: 'medium',
            timeStyle: 'short',
          },
        )}.`,
      );
    }

    const checkedInResults = [];
    const alreadyCheckedInList = [];

    for (const attendee of attendees) {
      if (attendee.status === AttendeeStatus.CHECKED_IN) {
        alreadyCheckedInList.push(attendee);
        continue;
      }

      if (attendee.status !== AttendeeStatus.PAID) {
        continue;
      }

      attendee.status = AttendeeStatus.CHECKED_IN;
      attendee.checkedInAt = now;
      attendee.checkedInBy = userId;

      await this.attendeeRepo.save(attendee);

      await this.checkInRepo.save(
        this.checkInRepo.create({
          attendee,
          checkedInBy: { id: userId },
        }),
      );

      checkedInResults.push({
        ticketId: attendee.ticketId,
        attendeeName: attendee.guestFullName || 'Guest Attendee',
        tierName: attendee.tier.name,
      });
    }

    if (checkedInResults.length === 0) {
      if (alreadyCheckedInList.length > 0) {
        const lastChecked = alreadyCheckedInList[0];
        throw new ConflictException(
          `All ${alreadyCheckedInList.length} ticket(s) in this pass were already checked in at ${new Date(
            lastChecked.checkedInAt!,
          ).toLocaleTimeString()}`,
        );
      }
      throw new ConflictException(
        'All tickets in this pass are invalid, pending, or cancelled',
      );
    }

    const primary = checkedInResults[0];

    return {
      valid: true,
      totalProcessed: checkedInResults.length,
      ticketId: primary.ticketId,
      attendeeName: primary.attendeeName,
      tierName: primary.tierName,
      orderNumber: attendees[0].order?.orderNumber,
      checkedInAt: now,
      processedTickets: checkedInResults,
    };
  }

  private async getOwnedEvent(userId: string, id: string) {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['organizer', 'ticketTiers'],
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizer.id !== userId)
      throw new ForbiddenException('You do not own this event');
    return event;
  }

  private toPublicEvent(event: Event) {
    if (!event.organizer) return event;
    const {
      passwordHash: _passwordHash,
      wallet: _wallet,
      ...organizer
    } = event.organizer;
    return { ...event, organizer };
  }

  private async uniqueSlug(name: string) {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || randomUUID();
    let slug = base;
    let suffix = 1;
    while (await this.eventRepo.exist({ where: { slug } }))
      slug = `${base}-${suffix++}`;
    return slug;
  }

  private createQrPayload(
    ticketId: string | string[],
    eventId: string,
  ): string {
    const payloadData = Array.isArray(ticketId)
      ? { ticketIds: ticketId, eventId }
      : { ticketId, eventId };

    const body = Buffer.from(JSON.stringify(payloadData)).toString('base64url');

    const signature = createHmac('sha256', this.qrSecret)
      .update(body)
      .digest('base64url');

    return `${body}.${signature}`;
  }

  private verifyQrPayload(payload: string): {
    ticketId?: string;
    ticketIds?: string[];
    eventId?: string;
  } {
    if (!payload || typeof payload !== 'string') {
      throw new BadRequestException('Invalid or missing QR ticket payload');
    }

    const trimmed = payload.trim();

    if (trimmed.includes('.')) {
      const [body, signature] = trimmed.split('.');
      if (!body || !signature) {
        throw new BadRequestException('Malformed QR ticket structure');
      }

      const expected = createHmac('sha256', this.qrSecret)
        .update(body)
        .digest('base64url');

      const actualBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (
        actualBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(actualBuffer, expectedBuffer)
      ) {
        throw new BadRequestException(
          'QR ticket signature verification failed',
        );
      }

      try {
        const parsed = JSON.parse(
          Buffer.from(body, 'base64url').toString('utf-8'),
        );

        if (
          !parsed ||
          typeof parsed !== 'object' ||
          (!('ticketId' in parsed) && !('ticketIds' in parsed))
        ) {
          throw new BadRequestException('Invalid QR payload fields');
        }

        return {
          ticketId:
            typeof parsed.ticketId === 'string' ? parsed.ticketId : undefined,
          ticketIds: Array.isArray(parsed.ticketIds)
            ? parsed.ticketIds
            : undefined,
          eventId:
            typeof parsed.eventId === 'string' ? parsed.eventId : undefined,
        };
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Unable to decode QR payload data');
      }
    }

    return { ticketId: trimmed };
  }
}
