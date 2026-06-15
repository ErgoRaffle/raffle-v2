import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

/**
 * Creates the social tables (postgres): `raffle_social_post` (one row per accepted X post) and
 * `social_poll_cursor` (per-provider poll high-water-mark). Timestamps are epoch-ms `bigint`.
 */
export class Migration1781568000000 implements MigrationInterface {
  name = 'Migration1781568000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_social_post" (
                "tweetId" character varying NOT NULL,
                "raffleId" character varying NOT NULL,
                "authorHandle" character varying NOT NULL,
                "createdAtMs" bigint NOT NULL,
                "fetchedAtMs" bigint NOT NULL,
                "hidden" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_raffle_social_post" PRIMARY KEY ("tweetId")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_raffle_social_post_raffleId" ON "raffle_social_post" ("raffleId")
        `);
    await queryRunner.query(`
            CREATE TABLE "social_poll_cursor" (
                "providerName" character varying NOT NULL,
                "lastSeenTweetId" character varying,
                "updatedAtMs" bigint NOT NULL,
                CONSTRAINT "PK_social_poll_cursor" PRIMARY KEY ("providerName")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "social_poll_cursor"`);
    await queryRunner.query(`DROP INDEX "IDX_raffle_social_post_raffleId"`);
    await queryRunner.query(`DROP TABLE "raffle_social_post"`);
  }
}
