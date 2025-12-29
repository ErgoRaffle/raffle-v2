import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Postgres1765799319935 implements MigrationInterface {
  name = 'Postgres1765799319935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "creation_params_picture" (
                "id" SERIAL NOT NULL,
                "orderIndex" integer NOT NULL,
                "content" character varying NOT NULL,
                "paramsId" integer,
                CONSTRAINT "PK_398905b355d6477bcd1ab54afd3" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "creation_params" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                "serviceAddress" character varying NOT NULL,
                "implementorAddress" character varying NOT NULL,
                "creatorAddress" character varying NOT NULL,
                "serviceFeePercent" integer NOT NULL,
                "implementerFeePercent" integer NOT NULL,
                "winnersPercent" integer NOT NULL,
                "ticketPrice" bigint NOT NULL,
                "collectingTokenId" character varying,
                "goal" bigint NOT NULL,
                "deadline" integer NOT NULL,
                "winnerCount" integer NOT NULL,
                "winnersPercentList" character varying NOT NULL,
                "requiredValue" bigint NOT NULL,
                "requiredTokenId" character varying,
                "proxyAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                "isDeleted" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_36ad3a3a6df9b6c0bb3b99722f0" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "add_gift_params" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "winnerIndex" integer NOT NULL,
                "proxyAddress" character varying NOT NULL,
                "giftGiverAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                CONSTRAINT "PK_57fb30ad3043b1ccbf6327707b2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "donation_params" (
                "id" SERIAL NOT NULL,
                "raffleId" character varying NOT NULL,
                "ticketCount" integer NOT NULL,
                "requiredValue" bigint NOT NULL,
                "collectingTokenId" character varying,
                "collectingTokenAmount" bigint,
                "donatorAddress" character varying NOT NULL,
                "proxyAddress" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                CONSTRAINT "PK_e40e6a1cd95b87179d0f920850f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "creation_params_picture"
            ADD CONSTRAINT "FK_39135af5c7b78f2c5a494305e3f" FOREIGN KEY ("paramsId") REFERENCES "creation_params"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "creation_params_picture" DROP CONSTRAINT "FK_39135af5c7b78f2c5a494305e3f"
        `);
    await queryRunner.query(`
            DROP TABLE "donation_params"
        `);
    await queryRunner.query(`
            DROP TABLE "add_gift_params"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_params"
        `);
    await queryRunner.query(`
            DROP TABLE "creation_params_picture"
        `);
  }
}
