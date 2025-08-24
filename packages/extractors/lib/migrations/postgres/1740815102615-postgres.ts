import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Postgres1740815102615 implements MigrationInterface {
  name = 'Postgres1740815102615';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "success_raffle" (
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
                "selectedWinnersList" character varying NOT NULL,
                "step" integer NOT NULL,
                CONSTRAINT "UQ_0ed7139d373997bb0e225f9361b" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_10e8897c491ebca9296e4f159ed" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "success_raffle"
        `);
  }
}
