import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1736256482771 implements MigrationInterface {
  name = 'Postgres1736256482771';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" character varying NOT NULL,
                "extractor" character varying NOT NULL,
                "boxSerialized" character varying NOT NULL,
                "height" bigint NOT NULL,
                "block" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "spendHeight" bigint,
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
