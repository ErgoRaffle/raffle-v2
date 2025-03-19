import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739856561630 implements MigrationInterface {
  name = 'Sqlite1739856561630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "gifts" (
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
                "donatorErgoTree" varchar NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_889e6820b94d33af34859d8bbd1" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "gifts"
        `);
  }
}
