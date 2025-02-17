import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739779028617 implements MigrationInterface {
  name = 'Sqlite1739779028617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
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
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                CONSTRAINT "UQ_56b3b23b4ea44ddef3ca2c1286a" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "raffle_details"
        `);
  }
}
