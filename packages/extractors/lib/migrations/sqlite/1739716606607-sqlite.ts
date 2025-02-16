import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739716606607 implements MigrationInterface {
  name = 'Sqlite1739716606607';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "active_raffle" (
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
                CONSTRAINT "UQ_a3b27d120375dcecd09545ac8ec" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_token_repo" (
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
                CONSTRAINT "UQ_33c8f55fe25ee47a022de0b1c95" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_repo" (
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
                CONSTRAINT "UQ_60dc7afccca8dff6b311bc2e8f3" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "ticket_repo"
        `);
    await queryRunner.query(`
            DROP TABLE "gift_token_repo"
        `);
    await queryRunner.query(`
            DROP TABLE "active_raffle"
        `);
  }
}
