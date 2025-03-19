import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1739856465885 implements MigrationInterface {
  name = 'Postgres1739856465885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "gifts" (
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
                "donatorErgoTree" character varying NOT NULL,
                "winnerIndex" integer NOT NULL,
                CONSTRAINT "UQ_889e6820b94d33af34859d8bbd1" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_54242922934e1f322861d116af7" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "gifts"
        `);
  }
}
