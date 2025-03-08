import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1741460166568 implements MigrationInterface {
  name = 'Sqlite1741460166568';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_box" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId"
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
                "raffleId"
            FROM "box"
        `);
    await queryRunner.query(`
            DROP TABLE "box"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_box"
                RENAME TO "box"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_box" (
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
                CONSTRAINT "UQ_8a69b9a18ca9500611b3d596339" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId"
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
                "raffleId"
            FROM "box"
        `);
    await queryRunner.query(`
            DROP TABLE "box"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_box"
                RENAME TO "box"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "box"
                RENAME TO "temporary_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "box" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId"
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
                "raffleId"
            FROM "temporary_box"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_box"
        `);
    await queryRunner.query(`
            ALTER TABLE "box"
                RENAME TO "temporary_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "box" (
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
                CONSTRAINT "UQ_a5f1a28c854be139a2d7f275e70" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId"
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
                "raffleId"
            FROM "temporary_box"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_box"
        `);
  }
}
