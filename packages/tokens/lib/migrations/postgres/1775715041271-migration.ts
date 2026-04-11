import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775715041271 implements MigrationInterface {
  name = 'Migration1775715041271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "token" (
                "id" character varying NOT NULL,
                "name" character varying NOT NULL,
                "decimals" integer NOT NULL,
                "isVerified" boolean NOT NULL,
                CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "token"
        `);
  }
}
