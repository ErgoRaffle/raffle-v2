import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Sqlite1740814926217 implements MigrationInterface {
  name = 'Sqlite1740814926217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
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
                "selectedWinnersList" varchar NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_0ed7139d373997bb0e225f9361b" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "success_raffle"
        `);
  }
}
