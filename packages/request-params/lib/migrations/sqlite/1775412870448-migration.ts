import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775412870448 implements MigrationInterface {
  name = 'Migration1775412870448';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS "trg_tx_complete_donation"
      AFTER UPDATE OF "status" ON "transaction_entity"
      FOR EACH ROW
      WHEN NEW."txType" = 'btc-donation'
        AND NEW."status" = 'completed'
        AND OLD."status" != 'completed'
      BEGIN
        UPDATE "donation_params"
        SET "status" = 'completed'
        WHERE "donationTxId" = NEW."txId";
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS "trg_tx_invalid_donation"
      AFTER UPDATE OF "status" ON "transaction_entity"
      FOR EACH ROW
      WHEN NEW."txType" = 'btc-donation'
        AND NEW."status" = 'invalid'
        AND OLD."status" != 'invalid'
      BEGIN
        UPDATE "donation_params"
        SET "status" = 'pending'
        WHERE "donationTxId" = NEW."txId";
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_tx_invalid_pending_donation"
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_tx_confirmed_complete_donation"
    `);
  }
}
