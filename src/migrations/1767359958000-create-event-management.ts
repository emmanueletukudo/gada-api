import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventManagement1767359958000 implements MigrationInterface {
  name = 'CreateEventManagement1767359958000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE "event_status_enum" AS ENUM ('DRAFT','PUBLISHED','SUSPENDED','DELETED')`);
    await queryRunner.query(`CREATE TYPE "event_order_status_enum" AS ENUM ('PENDING','PAID','CANCELLED','REFUNDED')`);
    await queryRunner.query(`CREATE TYPE "event_attendee_status_enum" AS ENUM ('RESERVED','PAID','CANCELLED','CHECKED_IN')`);
    await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "category" character varying NOT NULL, "images" jsonb NOT NULL DEFAULT '[]', "banner" character varying, "venue" character varying, "city" character varying, "isOnline" boolean NOT NULL DEFAULT false, "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "capacity" integer, "status" "event_status_enum" NOT NULL DEFAULT 'DRAFT', "slug" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "organizerId" uuid NOT NULL, CONSTRAINT "UQ_events_slug" UNIQUE ("slug"), CONSTRAINT "PK_events" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "event_ticket_tiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "price" numeric(18,2) NOT NULL DEFAULT 0, "currency" character varying NOT NULL DEFAULT 'NGN', "quantity" integer NOT NULL, "soldCount" integer NOT NULL DEFAULT 0, "salesStart" TIMESTAMP WITH TIME ZONE, "salesEnd" TIMESTAMP WITH TIME ZONE, "eventId" uuid NOT NULL, CONSTRAINT "PK_event_ticket_tiers" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "event_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying NOT NULL, "totalAmount" numeric(18,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'NGN', "status" "event_order_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "buyerId" uuid NOT NULL, "eventId" uuid NOT NULL, CONSTRAINT "UQ_event_orders_number" UNIQUE ("orderNumber"), CONSTRAINT "PK_event_orders" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "event_attendees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" character varying NOT NULL, "qrPayload" text NOT NULL, "status" "event_attendee_status_enum" NOT NULL, "checkedInAt" TIMESTAMP WITH TIME ZONE, "checkedInBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "eventId" uuid NOT NULL, "tierId" uuid NOT NULL, "orderId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "UQ_event_attendees_ticket" UNIQUE ("ticketId"), CONSTRAINT "PK_event_attendees" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "event_check_ins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "checkedInAt" TIMESTAMP NOT NULL DEFAULT now(), "attendeeId" uuid NOT NULL, "checkedInById" uuid NOT NULL, CONSTRAINT "PK_event_check_ins" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_organizer" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_ticket_tiers" ADD CONSTRAINT "FK_tiers_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_orders" ADD CONSTRAINT "FK_orders_buyer" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_orders" ADD CONSTRAINT "FK_orders_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_attendees" ADD CONSTRAINT "FK_attendees_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_attendees" ADD CONSTRAINT "FK_attendees_tier" FOREIGN KEY ("tierId") REFERENCES "event_ticket_tiers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_attendees" ADD CONSTRAINT "FK_attendees_order" FOREIGN KEY ("orderId") REFERENCES "event_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_attendees" ADD CONSTRAINT "FK_attendees_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_check_ins" ADD CONSTRAINT "FK_checkins_attendee" FOREIGN KEY ("attendeeId") REFERENCES "event_attendees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "event_check_ins" ADD CONSTRAINT "FK_checkins_user" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_check_ins"`);
    await queryRunner.query(`DROP TABLE "event_attendees"`);
    await queryRunner.query(`DROP TABLE "event_orders"`);
    await queryRunner.query(`DROP TABLE "event_ticket_tiers"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "event_attendee_status_enum"`);
    await queryRunner.query(`DROP TYPE "event_order_status_enum"`);
    await queryRunner.query(`DROP TYPE "event_status_enum"`);
  }
}
