import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736705562548 implements MigrationInterface {
  name = 'Sqlite1736705562548';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
                "boxId" varchar(64) PRIMARY KEY NOT NULL,
                "extractor" varchar(255) NOT NULL,
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
                "txFee" bigint NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
  }
}
