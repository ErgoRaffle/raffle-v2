import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1740896672982 implements MigrationInterface {
  name = 'Sqlite1740896672982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "totalSoldTicket" bigint NOT NULL,
                "redeemedTickets" bigint NOT NULL,
                CONSTRAINT "UQ_3b61e1d13c6b9c7c3203ca96282" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
  }
}
