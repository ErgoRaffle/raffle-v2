import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783160465786 implements MigrationInterface {
  name = 'Migration1783160465786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE VIEW "winner_view" AS
            SELECT DISTINCT "winner"."index" AS "index",
                "winner"."rewardPercent" AS "rewardPercent",
                "winner"."txFee" AS "txFee",
                "gift"."serialized" AS "giftSerialized",
                winner."raffleId" AS "raffleId"
            FROM "winner" "winner"
                LEFT JOIN "gift" "gift" ON winner."raffleId" = gift."raffleId"
                AND "winner"."index" = gift."winnerIndex"
        `);
    await queryRunner.query(
      `
            INSERT INTO "typeorm_metadata"(
                    "database",
                    "schema",
                    "table",
                    "type",
                    "name",
                    "value"
                )
            VALUES (NULL, NULL, NULL, ?, ?, ?)
        `,
      [
        'VIEW',
        'winner_view',
        'SELECT DISTINCT "winner"."index" AS "index", "winner"."rewardPercent" AS "rewardPercent", "winner"."txFee" AS "txFee", "gift"."serialized" AS "giftSerialized", winner."raffleId" AS "raffleId" FROM "winner" "winner" LEFT JOIN "gift" "gift" ON winner."raffleId" = gift."raffleId" AND "winner"."index" = gift."winnerIndex"',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
        `,
      ['VIEW', 'winner_view'],
    );
    await queryRunner.query(`
            DROP VIEW "winner_view"
        `);
  }
}
