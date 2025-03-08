import { MigrationInterface, QueryRunner } from 'typeorm';

export class Postgres1741460339594 implements MigrationInterface {
  name = 'Postgres1741460339594';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "box" DROP CONSTRAINT "UQ_a5f1a28c854be139a2d7f275e70"
        `);
    await queryRunner.query(`
            ALTER TABLE "box"
            ADD CONSTRAINT "UQ_8a69b9a18ca9500611b3d596339" UNIQUE ("boxId", "extractor")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "box" DROP CONSTRAINT "UQ_8a69b9a18ca9500611b3d596339"
        `);
    await queryRunner.query(`
            ALTER TABLE "box"
            ADD CONSTRAINT "UQ_a5f1a28c854be139a2d7f275e70" UNIQUE ("boxId", "extractor")
        `);
  }
}
