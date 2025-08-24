import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Sqlite1739776460056 implements MigrationInterface {
  name = 'Sqlite1739776460056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "winner" (
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
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_5b52f300111033e04538ab65c52" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "winner"
        `);
  }
}
