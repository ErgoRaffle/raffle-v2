import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739623115850 implements MigrationInterface {
  name = 'Postgres1739623115850';

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
                "txId" character varying(255) NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_5107a6615223ef101ca4488c63f" PRIMARY KEY ("id")
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
            DROP TABLE "raffle_service"
        `);
  }
}
