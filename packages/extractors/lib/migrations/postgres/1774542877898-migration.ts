import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1774542877898 implements MigrationInterface {
  name = 'Migration1774542877898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "add_gift_proxy" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "address" character varying NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "txFee" bigint NOT NULL,
                "raffleId" character varying NOT NULL,
                "giftGiverErgoTree" character varying NOT NULL,
                CONSTRAINT "UQ_fda636f4a4491d2549e0b8dcef3" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_a50fec39714fe9086b954de2972" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_proxy" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "address" character varying NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "txFee" bigint NOT NULL,
                "implementerErgoTree" character varying NOT NULL,
                "creatorErgoTree" character varying NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "collectingTokenId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                "pictures" text NOT NULL,
                "winnerCount" integer NOT NULL,
                CONSTRAINT "UQ_dc8a55846404e70e4bc1c0ecd9d" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_8d9ee82089cda3a3907783d3039" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_proxy" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "address" character varying NOT NULL,
                "expirationHeight" integer NOT NULL,
                "raffleDeadline" integer NOT NULL,
                "ticketCount" integer NOT NULL,
                "txFee" bigint NOT NULL,
                "raffleId" character varying NOT NULL,
                "donatorErgoTree" character varying NOT NULL,
                CONSTRAINT "UQ_baf9bc9a4c9d9dd1e7088aeffa8" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_013085d35a7aaf95408d59a4ad2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "donatorErgoTree" character varying NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_a1f3a095e9fa0da75bcb55f3beb" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_f91217caddc01a085837ebe0606" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_3ccbdfb6201479cf48a9d8e287a" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_9558d8cd7a6a1a38b9ab2fe5bfd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "serviceErgoTree" character varying NOT NULL,
                "implementerErgoTree" character varying NOT NULL,
                "projectErgoTree" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "txFee" bigint NOT NULL,
                "collectingTokenId" character varying,
                CONSTRAINT "UQ_c2e3e341f40b8c89661d703a087" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_d594769fc6ec16d6a0f74db6831" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                CONSTRAINT "UQ_109f63f620bd465691539f77314" UNIQUE ("identifier", "extractor"),
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
            CREATE TYPE "public"."raffle_box_type_enum" AS ENUM(
                'ticket_repo',
                'gift_token_repo',
                'active_raffle'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "raffle_box" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "type" "public"."raffle_box_type_enum" NOT NULL,
                CONSTRAINT "UQ_fd4e7f56c331657543469ee7fd0" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_69308e57c99a16406e064b5796e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "recipient" character varying NOT NULL,
                CONSTRAINT "UQ_115a113db9ef5a803eb2afb958e" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_511601a885f51b157dcfd751137" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_66bed30d3a894f96ccaaae03d8b" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "selectedWinnersList" character varying NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_c34631dd663f78714c38ba64ac4" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_10e8897c491ebca9296e4f159ed" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "donatorErgoTree" character varying NOT NULL,
                "rangeStart" bigint NOT NULL,
                "rangeEnd" bigint NOT NULL,
                CONSTRAINT "UQ_aa9ea2c083381587c20d963a122" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "totalSoldTicket" bigint NOT NULL,
                "redeemedTickets" bigint NOT NULL,
                CONSTRAINT "UQ_2bdadc72ec3dfd1be75ffcf3a22" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_b10e2752bdc4a43f093d898503a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_36fc5486912c1b246171926e467" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_fa2886a53e844d01b8fc5524560" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "winnerTicketIndex" character varying NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_1c3eb64d3ed8435c9eb69d41005" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_032663e4fb5462f8282e834e200" PRIMARY KEY ("id")
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
            DROP TYPE "public"."raffle_box_type_enum"
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
