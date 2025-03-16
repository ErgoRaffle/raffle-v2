import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1740897040526 implements MigrationInterface {
  name = 'Sqlite1740897040526';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "safe_pay" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "txType" varchar NOT NULL,
                CONSTRAINT "UQ_6e3731698d1ef95eb1b8f78c687" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "safe_pay"
        `);
  }
}
