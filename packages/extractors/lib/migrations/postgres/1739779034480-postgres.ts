import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739779034480 implements MigrationInterface {
  name = 'Postgres1739779034480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_details" (
                "id" SERIAL NOT NULL,
                "boxId" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                CONSTRAINT "UQ_56b3b23b4ea44ddef3ca2c1286a" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_b63c664cdd5dfc4bb7f4dfe5072" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "pictures" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" character varying NOT NULL,
                CONSTRAINT "PK_7aa5e10dd31983e9f05b9f1fc85" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "pictures"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_details"
        `);
  }
}
