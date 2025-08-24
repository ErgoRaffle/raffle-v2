import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Postgres1740812408283 implements MigrationInterface {
  name = 'Postgres1740812408283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "gift_redeem" (
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
                "step" integer NOT NULL,
                CONSTRAINT "UQ_05196092114924cb259bf14225f" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_9558d8cd7a6a1a38b9ab2fe5bfd" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "gift_redeem"
        `);
  }
}
