import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sqlite1739877562133 implements MigrationInterface {
  name = 'Sqlite1739877562133';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "winner_prize" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "boxId" varchar NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "spendBlock" varchar,
                "spendHeight" integer,
                "extractor" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "raffleId" varchar NOT NULL,
                "winnerTicketIndex" varchar NOT NULL,
                "giftCount" integer NOT NULL,
                "winnerIndex" integer NOT NULL,
                "unwrappedGiftCount" integer NOT NULL,
                CONSTRAINT "UQ_29dccb0aa4aab740d46522459ca" UNIQUE ("boxId", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "winner_prize"
        `);
  }
}
