import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1736703916775 implements MigrationInterface {
  name = 'Sqlite1736703916775';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "boxId" varchar(64) PRIMARY KEY NOT NULL,
                "extractor" varchar(255) NOT NULL,
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
