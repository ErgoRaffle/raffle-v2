import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736162463033 implements MigrationInterface {
  name = 'Sqlite1736162463033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" varchar PRIMARY KEY NOT NULL,
                "extractorName" varchar NOT NULL,
                "boxSerialized" varchar NOT NULL,
                "height" bigint NOT NULL,
                "block" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "spendHeight" bigint,
                "spendBlock" text,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
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
