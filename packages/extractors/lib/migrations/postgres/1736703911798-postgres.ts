import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1736703911798 implements MigrationInterface {
  name = 'Postgres1736703911798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" character varying(64) NOT NULL,
                "extractor" character varying(255) NOT NULL,
                "boxSerialized" text NOT NULL,
                "height" integer NOT NULL,
                "block" text NOT NULL,
                "txId" text NOT NULL,
                "spendHeight" integer,
                "spendBlock" text,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "PK_6e064e7253a3bf34ecda2fc3624" PRIMARY KEY ("boxId")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
  }
}
