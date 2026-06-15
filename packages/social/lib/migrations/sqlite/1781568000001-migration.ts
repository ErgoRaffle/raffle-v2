import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

/**
 * Creates the social tables (sqlite): `raffle_social_post` (one row per accepted X post) and
 * `social_poll_cursor` (per-provider poll high-water-mark). Timestamps are epoch-ms `bigint`.
 */
export class Migration1781568000001 implements MigrationInterface {
  name = 'Migration1781568000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "raffle_social_post" (
                "tweetId" varchar PRIMARY KEY NOT NULL,
                "raffleId" varchar NOT NULL,
                "authorHandle" varchar NOT NULL,
                "createdAtMs" bigint NOT NULL,
                "fetchedAtMs" bigint NOT NULL,
                "hidden" boolean NOT NULL DEFAULT (0)
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_raffle_social_post_raffleId" ON "raffle_social_post" ("raffleId")
        `);
    await queryRunner.query(`
            CREATE TABLE "social_poll_cursor" (
                "providerName" varchar PRIMARY KEY NOT NULL,
                "lastSeenTweetId" varchar,
                "updatedAtMs" bigint NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "social_poll_cursor"`);
    await queryRunner.query(`DROP INDEX "IDX_raffle_social_post_raffleId"`);
    await queryRunner.query(`DROP TABLE "raffle_social_post"`);
  }
}
