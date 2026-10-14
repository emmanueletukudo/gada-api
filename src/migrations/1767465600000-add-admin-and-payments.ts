import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminAndPayments1767465600000 implements MigrationInterface {
  name = "AddAdminAndPayments1767465600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "users_role_enum" AS ENUM ('ATTENDEE','ORGANIZER','GATE_AGENT','ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "users_role_enum" NOT NULL DEFAULT 'ATTENDEE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_orders" ADD COLUMN IF NOT EXISTS "paymentReference" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_event_orders_payment_reference" ON "event_orders" ("paymentReference") WHERE "paymentReference" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_event_orders_payment_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_orders" DROP COLUMN IF EXISTS "paymentReference"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
