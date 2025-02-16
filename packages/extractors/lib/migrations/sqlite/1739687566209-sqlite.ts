import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739687566209 implements MigrationInterface {
  name = 'Sqlite1739687566209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_raffle_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_raffle_service"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "id",
                "boxId",
                "block",
                "height",
                "spendBlock",
                "spendHeight",
                "extractor",
                "serialized",
                "txId",
                "serviceFeePercent",
                "implementerFeePercent",
                "creationFee"
            FROM "raffle_service"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_raffle_service"
                RENAME TO "raffle_service"
        `);
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar(255) NOT NULL,
                "serviceErgoTree" text NOT NULL,
                "implementorErgoTree" text NOT NULL,
                "creatorErgoTree" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" text NOT NULL,
                "txFee" bigint NOT NULL,
                CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_raffle_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar(255) NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_raffle_service"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "id",
                "boxId",
                "block",
                "height",
                "spendBlock",
                "spendHeight",
                "extractor",
                "serialized",
                "txId",
                "serviceFeePercent",
                "implementerFeePercent",
                "creationFee"
            FROM "raffle_service"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_raffle_service"
                RENAME TO "raffle_service"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "raffle_service"
                RENAME TO "temporary_raffle_service"
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "raffle_service"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "id",
                "boxId",
                "block",
                "height",
                "spendBlock",
                "spendHeight",
                "extractor",
                "serialized",
                "txId",
                "serviceFeePercent",
                "implementerFeePercent",
                "creationFee"
            FROM "temporary_raffle_service"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_raffle_service"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            ALTER TABLE "raffle_service"
                RENAME TO "temporary_raffle_service"
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "raffle_service"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "id",
                "boxId",
                "block",
                "height",
                "spendBlock",
                "spendHeight",
                "extractor",
                "serialized",
                "txId",
                "serviceFeePercent",
                "implementerFeePercent",
                "creationFee"
            FROM "temporary_raffle_service"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_raffle_service"
        `);
  }
}
