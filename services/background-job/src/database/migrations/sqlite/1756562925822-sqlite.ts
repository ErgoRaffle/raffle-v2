import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1756562925822 implements MigrationInterface {
  name = 'Sqlite1756562925822';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_picture" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" varchar NOT NULL,
                "detailsId" integer
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
    await queryRunner.query(`
            CREATE TABLE "temporary_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_service"(
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
            FROM "service"
        `);
    await queryRunner.query(`
            DROP TABLE "service"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_service"
                RENAME TO "service"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_inactive_raffle" (
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
                "collectingTokenId" varchar
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_inactive_raffle"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "serviceErgoTree",
                    "implementorErgoTree",
                    "creatorErgoTree",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "winnersPercent",
                    "ticketPrice",
                    "goal",
                    "deadline",
                    "winnersPercentList",
                    "txFee",
                    "collectingTokenId"
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
                "raffleId",
                "serviceErgoTree",
                "implementorErgoTree",
                "creatorErgoTree",
                "serviceFeePercent",
                "implementerFeePercent",
                "winnersPercent",
                "ticketPrice",
                "goal",
                "deadline",
                "winnersPercentList",
                "txFee",
                "collectingTokenId"
            FROM "inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_inactive_raffle"
                RENAME TO "inactive_raffle"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_raffle_box" (
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
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_raffle_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "type"
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
                "raffleId",
                "type"
            FROM "raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_box"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_raffle_box"
                RENAME TO "raffle_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_gift" (
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
                "winnerIndex" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_gift"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "winnerIndex"
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
                "raffleId",
                "donatorErgoTree",
                "winnerIndex"
            FROM "gift"
        `);
    await queryRunner.query(`
            DROP TABLE "gift"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_gift"
                RENAME TO "gift"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_ticket" (
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
                "rangeEnd" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_ticket"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "rangeStart",
                    "rangeEnd"
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
                "raffleId",
                "donatorErgoTree",
                "rangeStart",
                "rangeEnd"
            FROM "ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_ticket"
                RENAME TO "ticket"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_winner_prize" (
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
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_winner_prize"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "winnerTicketIndex",
                    "giftCount",
                    "winnerIndex",
                    "unwrappedGiftCount"
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
                "raffleId",
                "winnerTicketIndex",
                "giftCount",
                "winnerIndex",
                "unwrappedGiftCount"
            FROM "winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "winner_prize"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_winner_prize"
                RENAME TO "winner_prize"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_ticket_redeem" (
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
                "redeemedTickets" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_ticket_redeem"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "totalSoldTicket",
                    "redeemedTickets"
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
                "raffleId",
                "totalSoldTicket",
                "redeemedTickets"
            FROM "ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_ticket_redeem"
                RENAME TO "ticket_redeem"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_safe_pay"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "recipient"
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
                "recipient"
            FROM "safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "safe_pay"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_safe_pay"
                RENAME TO "safe_pay"
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
            CREATE TABLE "temporary_service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
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
                CONSTRAINT "UQ_f5398b3f54b5cea829d8f349de0" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_service"(
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
            FROM "service"
        `);
    await queryRunner.query(`
            DROP TABLE "service"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_service"
                RENAME TO "service"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_inactive_raffle" (
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
                CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_inactive_raffle"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "serviceErgoTree",
                    "implementorErgoTree",
                    "creatorErgoTree",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "winnersPercent",
                    "ticketPrice",
                    "goal",
                    "deadline",
                    "winnersPercentList",
                    "txFee",
                    "collectingTokenId"
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
                "raffleId",
                "serviceErgoTree",
                "implementorErgoTree",
                "creatorErgoTree",
                "serviceFeePercent",
                "implementerFeePercent",
                "winnersPercent",
                "ticketPrice",
                "goal",
                "deadline",
                "winnersPercentList",
                "txFee",
                "collectingTokenId"
            FROM "inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_inactive_raffle"
                RENAME TO "inactive_raffle"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_raffle_box" (
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
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL,
                CONSTRAINT "UQ_f00bcdc511b61e73ffb42ddacb8" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_raffle_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "type"
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
                "raffleId",
                "type"
            FROM "raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_box"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_raffle_box"
                RENAME TO "raffle_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_gift" (
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
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_8807a70363dedcaa939f3980449" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_gift"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "winnerIndex"
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
                "raffleId",
                "donatorErgoTree",
                "winnerIndex"
            FROM "gift"
        `);
    await queryRunner.query(`
            DROP TABLE "gift"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_gift"
                RENAME TO "gift"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_ticket" (
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
                CONSTRAINT "UQ_bbe68508e13d66e3f552a71b384" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_ticket"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "rangeStart",
                    "rangeEnd"
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
                "raffleId",
                "donatorErgoTree",
                "rangeStart",
                "rangeEnd"
            FROM "ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_ticket"
                RENAME TO "ticket"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_winner_prize" (
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
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_40b396281b1862b726dec60d004" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_winner_prize"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "winnerTicketIndex",
                    "giftCount",
                    "winnerIndex",
                    "unwrappedGiftCount"
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
                "raffleId",
                "winnerTicketIndex",
                "giftCount",
                "winnerIndex",
                "unwrappedGiftCount"
            FROM "winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "winner_prize"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_winner_prize"
                RENAME TO "winner_prize"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_ticket_redeem" (
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
                CONSTRAINT "UQ_a27c93626c8e7726ff26215b9fe" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_ticket_redeem"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "totalSoldTicket",
                    "redeemedTickets"
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
                "raffleId",
                "totalSoldTicket",
                "redeemedTickets"
            FROM "ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_ticket_redeem"
                RENAME TO "ticket_redeem"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL,
                CONSTRAINT "UQ_b5ebf734c46db80ec6757d2ab3f" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_safe_pay"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "recipient"
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
                "recipient"
            FROM "safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "safe_pay"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_safe_pay"
                RENAME TO "safe_pay"
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
            ALTER TABLE "safe_pay"
                RENAME TO "temporary_safe_pay"
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "safe_pay"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "recipient"
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
                "recipient"
            FROM "temporary_safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_safe_pay"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem"
                RENAME TO "temporary_ticket_redeem"
        `);
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
                "redeemedTickets" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "ticket_redeem"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "totalSoldTicket",
                    "redeemedTickets"
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
                "raffleId",
                "totalSoldTicket",
                "redeemedTickets"
            FROM "temporary_ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_ticket_redeem"
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize"
                RENAME TO "temporary_winner_prize"
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
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
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "winner_prize"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "winnerTicketIndex",
                    "giftCount",
                    "winnerIndex",
                    "unwrappedGiftCount"
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
                "raffleId",
                "winnerTicketIndex",
                "giftCount",
                "winnerIndex",
                "unwrappedGiftCount"
            FROM "temporary_winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_winner_prize"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket"
                RENAME TO "temporary_ticket"
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
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
                "rangeEnd" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "ticket"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "rangeStart",
                    "rangeEnd"
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
                "raffleId",
                "donatorErgoTree",
                "rangeStart",
                "rangeEnd"
            FROM "temporary_ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_ticket"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME TO "temporary_gift"
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
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
                "winnerIndex" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "gift"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "winnerIndex"
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
                "raffleId",
                "donatorErgoTree",
                "winnerIndex"
            FROM "temporary_gift"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_gift"
        `);
    await queryRunner.query(`
            ALTER TABLE "raffle_box"
                RENAME TO "temporary_raffle_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_box" (
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
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "raffle_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "type"
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
                "raffleId",
                "type"
            FROM "temporary_raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_raffle_box"
        `);
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle"
                RENAME TO "temporary_inactive_raffle"
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
                "collectingTokenId" varchar
            )
        `);
    await queryRunner.query(`
            INSERT INTO "inactive_raffle"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "serviceErgoTree",
                    "implementorErgoTree",
                    "creatorErgoTree",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "winnersPercent",
                    "ticketPrice",
                    "goal",
                    "deadline",
                    "winnersPercentList",
                    "txFee",
                    "collectingTokenId"
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
                "raffleId",
                "serviceErgoTree",
                "implementorErgoTree",
                "creatorErgoTree",
                "serviceFeePercent",
                "implementerFeePercent",
                "winnersPercent",
                "ticketPrice",
                "goal",
                "deadline",
                "winnersPercentList",
                "txFee",
                "collectingTokenId"
            FROM "temporary_inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_inactive_raffle"
        `);
    await queryRunner.query(`
            ALTER TABLE "service"
                RENAME TO "temporary_service"
        `);
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "service"(
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
            FROM "temporary_service"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_service"
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
    await queryRunner.query(`
            ALTER TABLE "safe_pay"
                RENAME TO "temporary_safe_pay"
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "recipient" varchar NOT NULL,
                CONSTRAINT "UQ_6e3731698d1ef95eb1b8f78c687" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "safe_pay"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "recipient"
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
                "recipient"
            FROM "temporary_safe_pay"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_safe_pay"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem"
                RENAME TO "temporary_ticket_redeem"
        `);
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
    await queryRunner.query(`
            INSERT INTO "ticket_redeem"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "totalSoldTicket",
                    "redeemedTickets"
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
                "raffleId",
                "totalSoldTicket",
                "redeemedTickets"
            FROM "temporary_ticket_redeem"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_ticket_redeem"
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize"
                RENAME TO "temporary_winner_prize"
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
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
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_29dccb0aa4aab740d46522459ca" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "winner_prize"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "winnerTicketIndex",
                    "giftCount",
                    "winnerIndex",
                    "unwrappedGiftCount"
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
                "raffleId",
                "winnerTicketIndex",
                "giftCount",
                "winnerIndex",
                "unwrappedGiftCount"
            FROM "temporary_winner_prize"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_winner_prize"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket"
                RENAME TO "temporary_ticket"
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
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
    await queryRunner.query(`
            INSERT INTO "ticket"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "rangeStart",
                    "rangeEnd"
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
                "raffleId",
                "donatorErgoTree",
                "rangeStart",
                "rangeEnd"
            FROM "temporary_ticket"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_ticket"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME TO "temporary_gift"
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
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
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_889e6820b94d33af34859d8bbd1" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "gift"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "donatorErgoTree",
                    "winnerIndex"
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
                "raffleId",
                "donatorErgoTree",
                "winnerIndex"
            FROM "temporary_gift"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_gift"
        `);
    await queryRunner.query(`
            ALTER TABLE "raffle_box"
                RENAME TO "temporary_raffle_box"
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_box" (
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
                "type" varchar CHECK(
                    "type" IN ('ticket_repo', 'gift_token_repo', 'active_raffle')
                ) NOT NULL,
                CONSTRAINT "UQ_a5f1a28c854be139a2d7f275e70" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "raffle_box"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "type"
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
                "raffleId",
                "type"
            FROM "temporary_raffle_box"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_raffle_box"
        `);
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle"
                RENAME TO "temporary_inactive_raffle"
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
                CONSTRAINT "UQ_0ad382cb5a260aca20c82a3d0d0" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "inactive_raffle"(
                    "id",
                    "boxId",
                    "block",
                    "height",
                    "spendBlock",
                    "spendHeight",
                    "extractor",
                    "serialized",
                    "txId",
                    "raffleId",
                    "serviceErgoTree",
                    "implementorErgoTree",
                    "creatorErgoTree",
                    "serviceFeePercent",
                    "implementerFeePercent",
                    "winnersPercent",
                    "ticketPrice",
                    "goal",
                    "deadline",
                    "winnersPercentList",
                    "txFee",
                    "collectingTokenId"
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
                "raffleId",
                "serviceErgoTree",
                "implementorErgoTree",
                "creatorErgoTree",
                "serviceFeePercent",
                "implementerFeePercent",
                "winnersPercent",
                "ticketPrice",
                "goal",
                "deadline",
                "winnersPercentList",
                "txFee",
                "collectingTokenId"
            FROM "temporary_inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_inactive_raffle"
        `);
    await queryRunner.query(`
            ALTER TABLE "service"
                RENAME TO "temporary_service"
        `);
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
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
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "service"(
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
            FROM "temporary_service"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_service"
        `);
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
                "detailsId" integer,
                CONSTRAINT "FK_ea5e985a736fbe539353bbf10c0" FOREIGN KEY ("detailsId") REFERENCES "raffle_details" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
  }
}
