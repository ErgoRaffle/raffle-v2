import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736599914434 implements MigrationInterface {
  name = 'Sqlite1736599914434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" text PRIMARY KEY NOT NULL,
                "extractor" text NOT NULL,
                "boxSerialized" text NOT NULL,
                "height" integer NOT NULL,
                "block" text NOT NULL,
                "txId" text NOT NULL,
                "spendHeight" integer,
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
