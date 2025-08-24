import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Sqlite1740812389338 implements MigrationInterface {
  name = 'Sqlite1740812389338';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
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
                "step" integer NOT NULL,
                CONSTRAINT "UQ_05196092114924cb259bf14225f" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "gift_redeem"
        `);
  }
}
