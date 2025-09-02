import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1756629990732 implements MigrationInterface {
  name = 'Postgres1756629990732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle" DROP CONSTRAINT "UQ_0ad382cb5a260aca20c82a3d0d0"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift" DROP CONSTRAINT "UQ_889e6820b94d33af34859d8bbd1"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket" DROP CONSTRAINT "UQ_fa212c50aeb37e573b8369b2e90"
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize" DROP CONSTRAINT "UQ_29dccb0aa4aab740d46522459ca"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem" DROP CONSTRAINT "UQ_3b61e1d13c6b9c7c3203ca96282"
        `);
    await queryRunner.query(`
            ALTER TABLE "safe_pay" DROP CONSTRAINT "UQ_6e3731698d1ef95eb1b8f78c687"
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_params_picture" (
                "id" SERIAL NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" character varying NOT NULL,
                "paramsId" integer,
                CONSTRAINT "PK_398905b355d6477bcd1ab54afd3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_params" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                "serviceAddress" character varying NOT NULL,
                "implementorAddress" character varying NOT NULL,
                "creatorAddress" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "collectingTokenId" character varying,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnerCount" integer NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "requiredValue" bigint NOT NULL,
                "requiredTokenId" character varying,
                "proxyAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                "isDeleted" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_36ad3a3a6df9b6c0bb3b99722f0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "add_gift_params" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "winnerIndex" integer NOT NULL,
                "proxyAddress" character varying NOT NULL,
                "giftGiverAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                CONSTRAINT "PK_57fb30ad3043b1ccbf6327707b2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_params" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "ticketCount" integer NOT NULL,
                "requiredValue" bigint NOT NULL,
                "collectingTokenId" character varying,
                "collectingTokenAmount" bigint,
                "donatorAddress" character varying NOT NULL,
                "proxyAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                CONSTRAINT "PK_e40e6a1cd95b87179d0f920850f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle"
            ADD CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
            ADD CONSTRAINT "UQ_8807a70363dedcaa939f3980449" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket"
            ADD CONSTRAINT "UQ_bbe68508e13d66e3f552a71b384" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize"
            ADD CONSTRAINT "UQ_40b396281b1862b726dec60d004" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem"
            ADD CONSTRAINT "UQ_a27c93626c8e7726ff26215b9fe" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "safe_pay"
            ADD CONSTRAINT "UQ_b5ebf734c46db80ec6757d2ab3f" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "creation_params_picture"
            ADD CONSTRAINT "FK_39135af5c7b78f2c5a494305e3f" FOREIGN KEY ("paramsId") REFERENCES "creation_params"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "creation_params_picture" DROP CONSTRAINT "FK_39135af5c7b78f2c5a494305e3f"
        `);
    await queryRunner.query(`
            ALTER TABLE "safe_pay" DROP CONSTRAINT "UQ_b5ebf734c46db80ec6757d2ab3f"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem" DROP CONSTRAINT "UQ_a27c93626c8e7726ff26215b9fe"
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize" DROP CONSTRAINT "UQ_40b396281b1862b726dec60d004"
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket" DROP CONSTRAINT "UQ_bbe68508e13d66e3f552a71b384"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift" DROP CONSTRAINT "UQ_8807a70363dedcaa939f3980449"
        `);
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle" DROP CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6"
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
            ADD CONSTRAINT "UQ_6e3731698d1ef95eb1b8f78c687" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket_redeem"
            ADD CONSTRAINT "UQ_3b61e1d13c6b9c7c3203ca96282" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "winner_prize"
            ADD CONSTRAINT "UQ_29dccb0aa4aab740d46522459ca" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "ticket"
            ADD CONSTRAINT "UQ_fa212c50aeb37e573b8369b2e90" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
            ADD CONSTRAINT "UQ_889e6820b94d33af34859d8bbd1" UNIQUE ("boxId", "extractor")
        `);
    await queryRunner.query(`
            ALTER TABLE "inactive_raffle"
            ADD CONSTRAINT "UQ_0ad382cb5a260aca20c82a3d0d0" UNIQUE ("boxId", "extractor")
        `);
  }
}
