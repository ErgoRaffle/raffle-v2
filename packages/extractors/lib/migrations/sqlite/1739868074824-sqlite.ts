import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739868074824 implements MigrationInterface {
  name = 'Sqlite1739868074824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "tickets" (
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
                "donatorErgoTree" varchar NOT NULL,
                "rangeStart" bigint NOT NULL,
                "rangeEnd" bigint NOT NULL,
                CONSTRAINT "UQ_fa212c50aeb37e573b8369b2e90" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "tickets"
        `);
  }
}
