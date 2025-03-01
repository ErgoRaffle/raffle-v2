import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1740497015349 implements MigrationInterface {
  name = 'Postgres1740497015349';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_generals" (
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
                CONSTRAINT "UQ_a5f1a28c854be139a2d7f275e70" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_a0f519a2b816d1c5d848ac0d528" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "raffle_generals"
        `);
  }
}
