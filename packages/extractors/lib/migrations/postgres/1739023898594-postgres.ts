import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739023898594 implements MigrationInterface {
  name = 'Postgres1739023898594';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_service" (
                "id" SERIAL NOT NULL,
                "boxId" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" text NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_5107a6615223ef101ca4488c63f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "block_entity" (
                "id" SERIAL NOT NULL,
                "height" integer NOT NULL,
                "hash" character varying NOT NULL,
                "parentHash" character varying NOT NULL,
                "status" character varying NOT NULL,
                "extra" character varying,
                "scanner" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                "year" integer,
                "month" integer,
                "day" integer,
                CONSTRAINT "UQ_7e20625b11840edf7f120565c3d" UNIQUE ("parentHash", "scanner"),
                CONSTRAINT "UQ_b1e24c5950a7c3dd48d92bbfbb2" UNIQUE ("hash", "scanner"),
                CONSTRAINT "UQ_521d830047d5fe08988538289dd" UNIQUE ("height", "scanner"),
                CONSTRAINT "PK_c3ddd57793960562837e8a402f1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "extractor_status_entity" (
                "scannerId" character varying NOT NULL,
                "extractorId" character varying NOT NULL,
                "updateHeight" integer NOT NULL,
                "updateBlockHash" character varying NOT NULL,
                CONSTRAINT "PK_74b8d00f8f0bbfc3814ef77e07e" PRIMARY KEY ("scannerId", "extractorId")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "extractor_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "block_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
  }
}
