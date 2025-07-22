import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1752930141304 implements MigrationInterface {
  name = 'Postgres1752930141304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "dynamic_box" (
                "id" SERIAL NOT NULL,
                "boxId" character varying NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" character varying,
                "spendHeight" integer,
                "extractor" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "address" character varying NOT NULL,
                CONSTRAINT "UQ_feefdeac8f946da3dd3712dab63" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_fd7aae41539dfa38135368d3296" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "dynamic_box"
        `);
  }
}
