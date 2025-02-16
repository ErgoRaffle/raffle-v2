import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739687572115 implements MigrationInterface {
  name = 'Postgres1739687572115';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "id" SERIAL NOT NULL,
                "boxId" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying(255) NOT NULL,
                "serviceErgoTree" text NOT NULL,
                "implementorErgoTree" text NOT NULL,
                "creatorErgoTree" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" text NOT NULL,
                "txFee" bigint NOT NULL,
                CONSTRAINT "UQ_4a8f47d5384df37b669cdbb33b6" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_d594769fc6ec16d6a0f74db6831" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
  }
}
