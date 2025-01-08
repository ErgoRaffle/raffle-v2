import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736256487736 implements MigrationInterface {
  name = 'Sqlite1736256487736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_raffle_service" (
                "boxId" varchar PRIMARY KEY NOT NULL,
                "extractor" varchar NOT NULL,
                "boxSerialized" varchar NOT NULL,
                "height" bigint NOT NULL,
                "block" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "spendHeight" bigint,
                "spendBlock" text,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_raffle_service"(
                    "boxId",
                    "extractor",
                    "boxSerialized",
                    "height",
                    "block",
                    "txId",
                    "spendHeight",
                    "spendBlock",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "boxId",
                "extractorName",
                "boxSerialized",
                "height",
                "block",
                "txId",
                "spendHeight",
                "spendBlock",
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
                "boxId" varchar PRIMARY KEY NOT NULL,
                "extractorName" varchar NOT NULL,
                "boxSerialized" varchar NOT NULL,
                "height" bigint NOT NULL,
                "block" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "spendHeight" bigint,
                "spendBlock" text,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "raffle_service"(
                    "boxId",
                    "extractorName",
                    "boxSerialized",
                    "height",
                    "block",
                    "txId",
                    "spendHeight",
                    "spendBlock",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "creationFee"
                )
            SELECT "boxId",
                "extractor",
                "boxSerialized",
                "height",
                "block",
                "txId",
                "spendHeight",
                "spendBlock",
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
