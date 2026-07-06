import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783159837485 implements MigrationInterface {
  name = 'Migration1783159837485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_winner" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                "txFee" bigint NOT NULL,
                CONSTRAINT "UQ_36fc5486912c1b246171926e467" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_winner"(
                    "id",
                    "block",
                    "height",
                    "extractor",
                    "identifier",
                    "serialized",
                    "spendBlock",
                    "spendHeight",
                    "txId",
                    "raffleId",
                    "index",
                    "rewardPercent",
                    "txFee"
                )
            SELECT "id",
                "block",
                "height",
                "extractor",
                "identifier",
                "serialized",
                "spendBlock",
                "spendHeight",
                "txId",
                "raffleId",
                "index",
                "rewardPercent",
                1100000
            FROM "winner"
        `);
    await queryRunner.query(`
            DROP TABLE "winner"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_winner"
                RENAME TO "winner"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "winner"
                RENAME TO "temporary_winner"
        `);
    await queryRunner.query(`
            CREATE TABLE "winner" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "index" integer NOT NULL,
                "rewardPercent" integer NOT NULL,
                CONSTRAINT "UQ_36fc5486912c1b246171926e467" UNIQUE ("identifier", "extractor")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "winner"(
                    "id",
                    "block",
                    "height",
                    "extractor",
                    "identifier",
                    "serialized",
                    "spendBlock",
                    "spendHeight",
                    "txId",
                    "raffleId",
                    "index",
                    "rewardPercent"
                )
            SELECT "id",
                "block",
                "height",
                "extractor",
                "identifier",
                "serialized",
                "spendBlock",
                "spendHeight",
                "txId",
                "raffleId",
                "index",
                "rewardPercent"
            FROM "temporary_winner"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_winner"
        `);
  }
}
