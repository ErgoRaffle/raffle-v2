import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1740392065101 implements MigrationInterface {
  name = 'Postgres1740392065101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "inactive_raffle" (
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
                "serviceErgoTree" character varying NOT NULL,
                "implementorErgoTree" character varying NOT NULL,
                "creatorErgoTree" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "txFee" bigint NOT NULL,
                CONSTRAINT "UQ_0ad382cb5a260aca20c82a3d0d0" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_f9dee47f552e25482a1f65c282e" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "inactive_raffle"
        `);
  }
}
