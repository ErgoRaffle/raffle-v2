import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739716652155 implements MigrationInterface {
  name = 'Postgres1739716652155';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "active_raffle" (
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
                CONSTRAINT "UQ_a3b27d120375dcecd09545ac8ec" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_753a920f53efb2f49d1183f9ca4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "gift_token_repo" (
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
                CONSTRAINT "UQ_33c8f55fe25ee47a022de0b1c95" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_d624a0570954f89246d2ffa445e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "ticket_repo" (
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
                CONSTRAINT "UQ_60dc7afccca8dff6b311bc2e8f3" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_86394a01d1fb5a4fc113d978721" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "ticket_repo"
        `);
    await queryRunner.query(`
            DROP TABLE "gift_token_repo"
        `);
    await queryRunner.query(`
            DROP TABLE "active_raffle"
        `);
  }
}
