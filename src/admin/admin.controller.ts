import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event, EventStatus } from "../events/entities/event.entity";
import { Order, OrderStatus } from "../events/entities/order.entity";
import { CheckIn } from "../events/entities/check-in.entity";
import { User } from "../users/entities/user.entity";
import { KycStatus } from "../users/dto/create-user.dto";
import { UpdateEventStatusDto } from "./dto/update-event-status.dto";
import { UpdateKycDto } from "./dto/update-kyc.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiTags("Administration")
@ApiBearerAuth("access-token")
export class AdminController {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get("overview")
  @ApiOperation({ summary: "Get platform overview metrics" })
  async overview() {
    const [activeEvents, users, orders, checkIns] = await Promise.all([
      this.events.count({ where: { status: EventStatus.PUBLISHED } }),
      this.users.count(),
      this.orders.find({
        where: { status: OrderStatus.PAID },
        select: ["totalAmount"],
      }),
      this.checkIns.count(),
    ]);
    const volume = orders.reduce(
      (total, order) => total + Number(order.totalAmount),
      0,
    );
    return {
      activeEvents,
      users,
      paidOrders: orders.length,
      checkIns,
      volume: volume.toFixed(2),
      commission: (volume * 0.05).toFixed(2),
    };
  }

  @Get("events")
  async eventsList(@Query("status") status?: EventStatus) {
    const events = await this.events.find({
      where: status ? { status } : {},
      relations: ["organizer", "ticketTiers"],
      order: { createdAt: "DESC" },
    });
    return events.map((event) => ({
      ...event,
      organizer: this.userView(event.organizer),
    }));
  }

  @Patch("events/:id/status")
  @ApiOperation({ summary: "Approve, suspend, publish, or delete an event" })
  async updateEventStatus(
    @Param("id") id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    const event = await this.events.findOneBy({ id });
    if (!event) return { updated: false, message: "Event not found" };
    event.status = dto.status;
    return { updated: true, event: await this.events.save(event) };
  }

  @Get("users")
  usersList(@Query("kycStatus") kycStatus?: KycStatus) {
    return this.users.find({
      where: kycStatus ? { kycStatus } : {},
      select: [
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "role",
        "kycStatus",
        "isEmailVerified",
      ],
    });
  }

  @Patch("users/:id/kyc")
  @ApiOperation({ summary: "Update a user's KYC status" })
  async updateKyc(@Param("id") id: string, @Body() dto: UpdateKycDto) {
    const user = await this.users.findOneBy({ id });
    if (!user) return { updated: false, message: "User not found" };
    user.kycStatus = dto.status;
    return { updated: true, user: this.userView(await this.users.save(user)) };
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Update a user's platform role" })
  async updateRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    const user = await this.users.findOneBy({ id });
    if (!user) return { updated: false, message: "User not found" };
    user.role = dto.role;
    return { updated: true, user: this.userView(await this.users.save(user)) };
  }

  @Get("audit")
  @ApiOperation({ summary: "Read recent order and check-in audit activity" })
  async audit() {
    const [orders, checkIns] = await Promise.all([
      this.orders.find({
        relations: ["buyer", "event"],
        order: { createdAt: "DESC" },
        take: 50,
      }),
      this.checkIns.find({
        relations: ["attendee", "checkedInBy"],
        order: { checkedInAt: "DESC" },
        take: 50,
      }),
    ]);
    return {
      orders: orders.map((order) => ({
        ...order,
        buyer: this.userView(order.buyer as User),
      })),
      checkIns: checkIns.map((checkIn) => ({
        ...checkIn,
        checkedInBy: this.userView(checkIn.checkedInBy),
      })),
    };
  }

  private userView(user?: User) {
    if (!user) return user;
    const { passwordHash: _passwordHash, wallet: _wallet, ...safeUser } = user;
    return safeUser;
  }
}
