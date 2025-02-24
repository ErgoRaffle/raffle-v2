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
                "txId" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "creationFee" bigint NOT NULL,
                CONSTRAINT "UQ_e25fd5268f192a7a6cc6617957b" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_5107a6615223ef101ca4488c63f" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "raffle_service"
        `);
  }
}
