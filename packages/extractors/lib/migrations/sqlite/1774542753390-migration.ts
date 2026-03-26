import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1774542753390 implements MigrationInterface {
  name = 'Migration1774542753390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "add_gift_proxy" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "address" varchar NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "txFee" bigint NOT NULL,
                "raffleId" varchar NOT NULL,
                "giftGiverErgoTree" varchar NOT NULL,
                CONSTRAINT "UQ_fda636f4a4491d2549e0b8dcef3" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_proxy" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "address" varchar NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "txFee" bigint NOT NULL,
                "implementerErgoTree" varchar NOT NULL,
                "creatorErgoTree" varchar NOT NULL,
                "winnersPercentList" varchar NOT NULL,
                "collectingTokenId" varchar NOT NULL,
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                "pictures" text NOT NULL,
                "winnerCount" integer NOT NULL,
                CONSTRAINT "UQ_dc8a55846404e70e4bc1c0ecd9d" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_proxy" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "address" varchar NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "ticketCount" integer NOT NULL,
                "txFee" bigint NOT NULL,
                "raffleId" varchar NOT NULL,
                "donatorErgoTree" varchar NOT NULL,
                CONSTRAINT "UQ_baf9bc9a4c9d9dd1e7088aeffa8" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "donatorErgoTree" varchar NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_a1f3a095e9fa0da75bcb55f3beb" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_3ccbdfb6201479cf48a9d8e287a" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "serviceErgoTree" varchar NOT NULL,
                "implementerErgoTree" varchar NOT NULL,
                "projectErgoTree" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" varchar NOT NULL,
                "txFee" bigint NOT NULL,
                "collectingTokenId" varchar,
                CONSTRAINT "UQ_c2e3e341f40b8c89661d703a087" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                CONSTRAINT "UQ_109f63f620bd465691539f77314" UNIQUE ("identifier", "extractor")
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
            CREATE TABLE "raffle_box" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL,
                CONSTRAINT "UQ_fd4e7f56c331657543469ee7fd0" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL,
                CONSTRAINT "UQ_115a113db9ef5a803eb2afb958e" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_66bed30d3a894f96ccaaae03d8b" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "selectedWinnersList" varchar NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_c34631dd663f78714c38ba64ac4" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "donatorErgoTree" varchar NOT NULL,
                "rangeStart" bigint NOT NULL,
                "rangeEnd" bigint NOT NULL,
                CONSTRAINT "UQ_aa9ea2c083381587c20d963a122" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "totalSoldTicket" bigint NOT NULL,
                "redeemedTickets" bigint NOT NULL,
                CONSTRAINT "UQ_2bdadc72ec3dfd1be75ffcf3a22" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_36fc5486912c1b246171926e467" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_1c3eb64d3ed8435c9eb69d41005" UNIQUE ("identifier", "extractor")
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
            DROP TABLE "winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "winner"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "success_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "service"
        `);
    await queryRunner.query(`
            DROP TABLE "safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "picture"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_details"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "gift_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "gift"
        `);
    await queryRunner.query(`
            DROP TABLE "donation_proxy"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_proxy"
        `);
    await queryRunner.query(`
            DROP TABLE "add_gift_proxy"
        `);
  }
}
