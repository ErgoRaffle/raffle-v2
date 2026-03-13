import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Sqlite1765798898052 implements MigrationInterface {
  name = 'Sqlite1765798898052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_f5398b3f54b5cea829d8f349de0" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "serviceErgoTree" varchar NOT NULL,
                "implementorErgoTree" varchar NOT NULL,
                "creatorErgoTree" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" varchar NOT NULL,
                "txFee" bigint NOT NULL,
                "collectingTokenId" varchar,
                CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_box" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL,
                CONSTRAINT "UQ_f00bcdc511b61e73ffb42ddacb8" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_5b52f300111033e04538ab65c52" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
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
                CONSTRAINT "UQ_56b3b23b4ea44ddef3ca2c1286a" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "donatorErgoTree" varchar NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_8807a70363dedcaa939f3980449" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
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
                CONSTRAINT "UQ_bbe68508e13d66e3f552a71b384" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_40b396281b1862b726dec60d004" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_05196092114924cb259bf14225f" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "selectedWinnersList" varchar NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_0ed7139d373997bb0e225f9361b" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
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
                CONSTRAINT "UQ_a27c93626c8e7726ff26215b9fe" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "identifier" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL,
                CONSTRAINT "UQ_b5ebf734c46db80ec6757d2ab3f" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer,
                CONSTRAINT "FK_ce8d1331589e50a820e6a84c5ad" FOREIGN KEY ("detailsId") REFERENCES "raffle_details" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_picture"(
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
            FROM "picture"
        `);
    await queryRunner.query(`
            DROP TABLE "picture"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_picture"
                RENAME TO "picture"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "picture"
                RENAME TO "temporary_picture"
        `);
    await queryRunner.query(`
            CREATE TABLE "picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "picture"(
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
            FROM "temporary_picture"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_picture"
        `);
    await queryRunner.query(`
            DROP TABLE "safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "success_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "gift_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "gift"
        `);
    await queryRunner.query(`
            DROP TABLE "picture"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_details"
        `);
    await queryRunner.query(`
            DROP TABLE "winner"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "service"
        `);
  }
}
