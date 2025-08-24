import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Postgres1740896772976 implements MigrationInterface {
  name = 'Postgres1740896772976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "ticket_redeem" (
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
                "totalSoldTicket" bigint NOT NULL,
                "redeemedTickets" bigint NOT NULL,
                CONSTRAINT "UQ_3b61e1d13c6b9c7c3203ca96282" UNIQUE ("boxId", "extractor"),
                CONSTRAINT "PK_00c286feb3c545bd6dbfa08a1e6" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "ticket_redeem"
        `);
  }
}
