import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1773447357104 implements MigrationInterface {
  name = 'Migration1773447357104';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "dynamic_box" (
                "id" SERIAL NOT NULL,
                "block" character varying NOT NULL,
                "height" integer NOT NULL,
                "extractor" character varying NOT NULL,
                "identifier" character varying NOT NULL,
                "serialized" character varying NOT NULL,
                "txId" character varying NOT NULL,
                "address" character varying NOT NULL,
                "tokenId" character varying NOT NULL,
                "amount" character varying NOT NULL,
                CONSTRAINT "UQ_7dd940d85a9a35af78ef09acac8" UNIQUE ("identifier", "extractor"),
                CONSTRAINT "PK_fd7aae41539dfa38135368d3296" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "dynamic_box"
        `);
  }
}
