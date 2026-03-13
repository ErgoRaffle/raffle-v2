import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Postgres1765798163301 implements MigrationInterface {
  name = 'Postgres1765798163301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_f5398b3f54b5cea829d8f349de0" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "serviceErgoTree" character varying NOT NULL,
                "implementorErgoTree" character varying NOT NULL,
                "creatorErgoTree" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "txFee" bigint NOT NULL,
                "collectingTokenId" character varying,
                CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_d594769fc6ec16d6a0f74db6831" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."raffle_box_type_enum" AS ENUM(
                'ticket_repo',
                'gift_token_repo',
                'active_raffle'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_box" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "type" "public"."raffle_box_type_enum" NOT NULL,
                CONSTRAINT "UQ_f00bcdc511b61e73ffb42ddacb8" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_69308e57c99a16406e064b5796e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_5b52f300111033e04538ab65c52" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_fa2886a53e844d01b8fc5524560" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                CONSTRAINT "UQ_56b3b23b4ea44ddef3ca2c1286a" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_b63c664cdd5dfc4bb7f4dfe5072" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "picture" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" character varying NOT NULL,
                "detailsId" integer,
                CONSTRAINT "PK_31ccf37c74bae202e771c0c2a38" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "donatorErgoTree" character varying NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_8807a70363dedcaa939f3980449" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_f91217caddc01a085837ebe0606" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "donatorErgoTree" character varying NOT NULL,
                "rangeStart" bigint NOT NULL,
                "rangeEnd" bigint NOT NULL,
                CONSTRAINT "UQ_bbe68508e13d66e3f552a71b384" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "winnerTicketIndex" character varying NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_40b396281b1862b726dec60d004" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_032663e4fb5462f8282e834e200" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_05196092114924cb259bf14225f" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_9558d8cd7a6a1a38b9ab2fe5bfd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "selectedWinnersList" character varying NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_0ed7139d373997bb0e225f9361b" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_10e8897c491ebca9296e4f159ed" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "totalSoldTicket" bigint NOT NULL,
                "redeemedTickets" bigint NOT NULL,
                CONSTRAINT "UQ_a27c93626c8e7726ff26215b9fe" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_b10e2752bdc4a43f093d898503a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" SERIAL NOT NULL,
                "identifier" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "recipient" character varying NOT NULL,
                CONSTRAINT "UQ_b5ebf734c46db80ec6757d2ab3f" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_511601a885f51b157dcfd751137" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "picture"
            ADD CONSTRAINT "FK_ce8d1331589e50a820e6a84c5ad" FOREIGN KEY ("detailsId") REFERENCES "raffle_details"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "picture" DROP CONSTRAINT "FK_ce8d1331589e50a820e6a84c5ad"
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
            DROP TYPE "public"."raffle_box_type_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
    await queryRunner.query(`
            DROP TABLE "service"
        `);
  }
}
