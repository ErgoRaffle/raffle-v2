import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1736705568860 implements MigrationInterface {
  name = 'Postgres1736705568860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "boxId" character varying(64) NOT NULL,
                "extractor" character varying(255) NOT NULL,
                "boxSerialized" text NOT NULL,
                "height" integer NOT NULL,
                "block" text NOT NULL,
                "txId" text NOT NULL,
                "spendHeight" integer,
                "spendBlock" text,
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
                CONSTRAINT "PK_6b8699dc1bd049777584b52bbb2" PRIMARY KEY ("boxId")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
  }
}
