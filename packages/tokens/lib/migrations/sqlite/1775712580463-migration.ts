import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775712580463 implements MigrationInterface {
  name = 'Migration1775712580463';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "token" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL,
                "decimals" integer NOT NULL,
                "isVerified" boolean NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "token"
        `);
  }
}
