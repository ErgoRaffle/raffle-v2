import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783159714890 implements MigrationInterface {
  name = 'Migration1783159714890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "winner"
            ADD "txFee" bigint NOT NULL DEFAULT 1100000
        `);
    await queryRunner.query(`
            ALTER TABLE "winner"
            ALTER COLUMN "txFee" DROP DEFAULT
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "winner" DROP COLUMN "txFee"
        `);
  }
}
