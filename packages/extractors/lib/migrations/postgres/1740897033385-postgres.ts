import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1740897033385 implements MigrationInterface {
  name = 'Postgres1740897033385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "safe_pays" (
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
                "txType" character varying NOT NULL,
                CONSTRAINT "UQ_6e3731698d1ef95eb1b8f78c687" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_2c13dfad534ac329832c8e93527" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "safe_pays"
        `);
  }
}
