import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1741479977073 implements MigrationInterface {
  name = 'Sqlite1741479977073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
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
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                CONSTRAINT "UQ_56b3b23b4ea44ddef3ca2c1286a" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "pictures" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_pictures" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer,
                CONSTRAINT "FK_ea5e985a736fbe539353bbf10c0" FOREIGN KEY ("detailsId") REFERENCES "raffle_details" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_pictures"(
                    "id",
                    "raffleId",
                    "orderIndex",
                    "content",
                    "detailsId"
                )
            SELECT "id",
                "raffleId",
                "orderIndex",
                "content",
                "detailsId"
            FROM "pictures"
        `);
    await queryRunner.query(`
            DROP TABLE "pictures"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_pictures"
                RENAME TO "pictures"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "pictures"
                RENAME TO "temporary_pictures"
        `);
    await queryRunner.query(`
            CREATE TABLE "pictures" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "pictures"(
                    "id",
                    "raffleId",
                    "orderIndex",
                    "content",
                    "detailsId"
                )
            SELECT "id",
                "raffleId",
                "orderIndex",
                "content",
                "detailsId"
            FROM "temporary_pictures"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_pictures"
        `);
    await queryRunner.query(`
            DROP TABLE "pictures"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_details"
        `);
  }
}
