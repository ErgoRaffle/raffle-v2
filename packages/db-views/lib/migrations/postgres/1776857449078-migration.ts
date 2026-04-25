import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1776857449078 implements MigrationInterface {
  name = 'Migration1776857449078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE VIEW "raffle_view" AS
            SELECT "raffle"."height" AS "height",
                "raffle"."raffleId" AS "raffleId",
                "raffle"."serviceErgoTree" AS "serviceErgoTree",
                "raffle"."implementerErgoTree" AS "implementerErgoTree",
                "raffle"."projectErgoTree" AS "projectErgoTree",
                "raffle"."serviceFeePercent" AS "serviceFeePercent",
                "raffle"."implementerFeePercent" AS "implementerFeePercent",
                "raffle"."winnersPercent" AS "winnersPercent",
                "raffle"."ticketPrice" AS "ticketPrice",
                "raffle"."goal" AS "goal",
                "raffle"."deadline" AS "deadline",
                "raffle"."winnersPercentList" AS "winnersPercentList",
                "raffle"."txFee" AS "txFee",
                "raffle"."collectingTokenId" AS "collectingTokenId",
                "token"."isVerified" AS "tokenIsVerified",
                MAX("details"."description") AS "description",
                MAX("details"."name") AS "name",
                MAX("details"."tags") AS "tags",
                MAX("details"."pictures") AS "pictures",
                COUNT(DISTINCT "gift"."id") AS "giftCount",
                MAX("gift"."height") AS "giftMaxHeight",
                SUM(DISTINCT "ticket"."rangeEnd") - SUM(DISTINCT "ticket"."rangeStart") AS "soldTicketCount",
                COUNT(DISTINCT "ticket"."id") AS "backerCount",
                MAX("ticket"."height") AS "ticketMaxHeight",
                COUNT("redeem"."id") AS "redeemCount",
                COUNT("success"."id") AS "successCount",
                MAX("token"."name") AS "tokenName",
                MAX("token"."decimals") AS "tokenDecimals"
            FROM "inactive_raffle" "raffle"
                INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"
                LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"
                LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"
                LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"
                LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId"
                LEFT JOIN "token" "token" ON "raffle"."collectingTokenId" = "token"."id"
            GROUP BY "raffle"."raffleId",
                "raffle"."height",
                "raffle"."serviceErgoTree",
                "raffle"."implementerErgoTree",
                "raffle"."projectErgoTree",
                "raffle"."serviceFeePercent",
                "raffle"."implementerFeePercent",
                "raffle"."winnersPercent",
                "raffle"."ticketPrice",
                "raffle"."goal",
                "raffle"."deadline",
                "raffle"."winnersPercentList",
                "raffle"."txFee",
                "raffle"."collectingTokenId",
                "token"."isVerified"
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'raffle_view',
        'SELECT "raffle"."height" AS "height", "raffle"."raffleId" AS "raffleId", "raffle"."serviceErgoTree" AS "serviceErgoTree", "raffle"."implementerErgoTree" AS "implementerErgoTree", "raffle"."projectErgoTree" AS "projectErgoTree", "raffle"."serviceFeePercent" AS "serviceFeePercent", "raffle"."implementerFeePercent" AS "implementerFeePercent", "raffle"."winnersPercent" AS "winnersPercent", "raffle"."ticketPrice" AS "ticketPrice", "raffle"."goal" AS "goal", "raffle"."deadline" AS "deadline", "raffle"."winnersPercentList" AS "winnersPercentList", "raffle"."txFee" AS "txFee", "raffle"."collectingTokenId" AS "collectingTokenId", "token"."isVerified" AS "tokenIsVerified", MAX("details"."description") AS "description", MAX("details"."name") AS "name", MAX("details"."tags") AS "tags", MAX("details"."pictures") AS "pictures", COUNT(DISTINCT "gift"."id") AS "giftCount", MAX("gift"."height") AS "giftMaxHeight", SUM(DISTINCT "ticket"."rangeEnd") - SUM(DISTINCT "ticket"."rangeStart") AS "soldTicketCount", COUNT(DISTINCT "ticket"."id") AS "backerCount", MAX("ticket"."height") AS "ticketMaxHeight", COUNT("redeem"."id") AS "redeemCount", COUNT("success"."id") AS "successCount", MAX("token"."name") AS "tokenName", MAX("token"."decimals") AS "tokenDecimals" FROM "inactive_raffle" "raffle" INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"  LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"  LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"  LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"  LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId"  LEFT JOIN "token" "token" ON "raffle"."collectingTokenId" = "token"."id" GROUP BY "raffle"."raffleId", "raffle"."height", "raffle"."serviceErgoTree", "raffle"."implementerErgoTree", "raffle"."projectErgoTree", "raffle"."serviceFeePercent", "raffle"."implementerFeePercent", "raffle"."winnersPercent", "raffle"."ticketPrice", "raffle"."goal", "raffle"."deadline", "raffle"."winnersPercentList", "raffle"."txFee", "raffle"."collectingTokenId", "token"."isVerified"',
      ],
    );
    await queryRunner.query(`
            CREATE VIEW "winner_view" AS
            SELECT DISTINCT "winner"."index" AS "index",
                "winner"."rewardPercent" AS "rewardPercent",
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'winner_view',
        'SELECT DISTINCT "winner"."index" AS "index", "winner"."rewardPercent" AS "rewardPercent", "gift"."serialized" AS "giftSerialized", winner."raffleId" AS "raffleId" FROM "winner" "winner" LEFT JOIN "gift" "gift" ON winner."raffleId" = gift."raffleId" AND "winner"."index" = gift."winnerIndex"',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "schema" = $3
        `,
      ['VIEW', 'winner_view', 'public'],
    );
    await queryRunner.query(`
            DROP VIEW "winner_view"
        `);
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "schema" = $3
        `,
      ['VIEW', 'raffle_view', 'public'],
    );
    await queryRunner.query(`
            DROP VIEW "raffle_view"
        `);
  }
}
