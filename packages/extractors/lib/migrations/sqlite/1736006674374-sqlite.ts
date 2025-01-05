import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736006674374 implements MigrationInterface {
  name = 'Sqlite1736006674374';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" varchar PRIMARY KEY NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "txId" varchar NOT NULL,
                "spendBlock" text,
                "spendHeight" integer,
                "boxSerialized" varchar NOT NULL,
                "extractorName" varchar NOT NULL,
                "serviceFeePercent" bigint NOT NULL,
                "implementerFeePercent" bigint NOT NULL,
                "creationFee" bigint NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
  }
}
