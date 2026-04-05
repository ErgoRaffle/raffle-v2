import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775417802338 implements MigrationInterface {
  name = 'Migration1775417802338';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_fn_tx_complete_donation()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE "donation_params"
        SET "status" = 'completed'
        WHERE "donationTxId" = NEW."txId";
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_tx_complete_donation"
      AFTER UPDATE OF "status" ON "transaction_entity"
      FOR EACH ROW
      WHEN (
        NEW."txType" = 'btc-donation'
        AND NEW."status" = 'completed'
        AND OLD."status" IS DISTINCT FROM 'completed'
      )
      EXECUTE FUNCTION trg_fn_tx_complete_donation()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_fn_tx_invalid_donation()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE "donation_params"
        SET "status" = 'pending'
        WHERE "donationTxId" = NEW."txId";
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_tx_invalid_donation"
      AFTER UPDATE OF "status" ON "transaction_entity"
      FOR EACH ROW
      WHEN (
        NEW."txType" = 'btc-donation'
        AND NEW."status" = 'invalid'
        AND OLD."status" IS DISTINCT FROM 'invalid'
      )
      EXECUTE FUNCTION trg_fn_tx_invalid_donation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_tx_invalid_donation" ON "transaction_entity"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS trg_fn_tx_invalid_donation()
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_tx_complete_donation" ON "transaction_entity"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS trg_fn_tx_complete_donation()
    `);
  }
}
