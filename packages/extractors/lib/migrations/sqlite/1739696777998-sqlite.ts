import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739696777998 implements MigrationInterface {
  name = 'Sqlite1739696777998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "service"
        `);
  }
}
