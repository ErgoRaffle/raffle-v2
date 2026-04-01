import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1772390164875 implements MigrationInterface {
  name = 'Migration1772390164875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "donation_params" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "raffleId" varchar NOT NULL,
                "ticketCount" integer NOT NULL,
                "tokenId" varchar NOT NULL,
                "tokenAmount" bigint NOT NULL,
                "donatorAddress" varchar NOT NULL,
                "bitcoinAddress" varchar NOT NULL,
                "timestamp" integer NOT NULL,
                "status" varchar CHECK("status" IN ('pending', 'in_progress', 'completed', 'timed_out')) NOT NULL
                "donationTxId" varchar,
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "donation_params"
        `);
  }
}
