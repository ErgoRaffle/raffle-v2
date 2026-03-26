import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1773446916572 implements MigrationInterface {
  name = 'Migration1773446916572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "dynamic_box" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "block" varchar NOT NULL,
                "height" integer NOT NULL,
                "extractor" varchar NOT NULL,
                "identifier" varchar NOT NULL,
                "serialized" varchar NOT NULL,
                "txId" varchar NOT NULL,
                "address" varchar NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" varchar NOT NULL,
                CONSTRAINT "UQ_7dd940d85a9a35af78ef09acac8" UNIQUE ("identifier", "extractor")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "dynamic_box"
        `);
  }
}
