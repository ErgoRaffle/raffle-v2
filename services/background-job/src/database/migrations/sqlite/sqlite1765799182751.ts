import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Sqlite1765799182751 implements MigrationInterface {
  name = 'Sqlite1765799182751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "creation_params_picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "paramsId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_params" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                "serviceAddress" varchar NOT NULL,
                "implementorAddress" varchar NOT NULL,
                "creatorAddress" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "collectingTokenId" varchar,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnerCount" integer NOT NULL,
                "winnersPercentList" varchar NOT NULL,
                "requiredValue" bigint NOT NULL,
                "requiredTokenId" varchar,
                "proxyAddress" varchar NOT NULL,
                "timestamp" integer NOT NULL,
                "isDeleted" boolean NOT NULL DEFAULT (0)
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "add_gift_params" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "winnerIndex" integer NOT NULL,
                "proxyAddress" varchar NOT NULL,
                "giftGiverAddress" varchar NOT NULL,
                "timestamp" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_params" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "ticketCount" integer NOT NULL,
                "requiredValue" bigint NOT NULL,
                "collectingTokenId" varchar,
                "collectingTokenAmount" bigint,
                "donatorAddress" varchar NOT NULL,
                "proxyAddress" varchar NOT NULL,
                "timestamp" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_creation_params_picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "paramsId" integer,
                CONSTRAINT "FK_39135af5c7b78f2c5a494305e3f" FOREIGN KEY ("paramsId") REFERENCES "creation_params" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_creation_params_picture"("id", "orderIndex", "content", "paramsId")
            SELECT "id",
                "orderIndex",
                "content",
                "paramsId"
            FROM "creation_params_picture"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_params_picture"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_creation_params_picture"
                RENAME TO "creation_params_picture"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "creation_params_picture"
                RENAME TO "temporary_creation_params_picture"
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_params_picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "paramsId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "creation_params_picture"("id", "orderIndex", "content", "paramsId")
            SELECT "id",
                "orderIndex",
                "content",
                "paramsId"
            FROM "temporary_creation_params_picture"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_creation_params_picture"
        `);
    await queryRunner.query(`
            DROP TABLE "donation_params"
        `);
    await queryRunner.query(`
            DROP TABLE "add_gift_params"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_params"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_params_picture"
        `);
  }
}
