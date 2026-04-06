import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775456488604 implements MigrationInterface {
  name = 'Migration1775456488604';

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
                "details"."name" AS "name",
                "details"."description" AS "description",
                COUNT("gift"."id") AS "giftCount",
                MAX("gift"."height") AS "giftMaxHeight",
                SUM("ticket"."rangeEnd" - "ticket"."rangeStart") AS "soldTicketCount",
                MAX("ticket"."height") AS "ticketMaxHeight",
                COUNT("redeem"."id") AS "redeemCount",
                COUNT("success"."id") AS "successCount"
            FROM "inactive_raffle" "raffle"
                INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"
                LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"
                LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"
                LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"
                LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId"
            GROUP BY "raffle"."raffleId"
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
        'SELECT "raffle"."height" AS "height", "raffle"."raffleId" AS "raffleId", "raffle"."serviceErgoTree" AS "serviceErgoTree", "raffle"."implementerErgoTree" AS "implementerErgoTree", "raffle"."projectErgoTree" AS "projectErgoTree", "raffle"."serviceFeePercent" AS "serviceFeePercent", "raffle"."implementerFeePercent" AS "implementerFeePercent", "raffle"."winnersPercent" AS "winnersPercent", "raffle"."ticketPrice" AS "ticketPrice", "raffle"."goal" AS "goal", "raffle"."deadline" AS "deadline", "raffle"."winnersPercentList" AS "winnersPercentList", "raffle"."txFee" AS "txFee", "raffle"."collectingTokenId" AS "collectingTokenId", "details"."name" AS "name", "details"."description" AS "description", COUNT("gift"."id") AS "giftCount", MAX("gift"."height") AS "giftMaxHeight", SUM("ticket"."rangeEnd" - "ticket"."rangeStart") AS "soldTicketCount", MAX("ticket"."height") AS "ticketMaxHeight", COUNT("redeem"."id") AS "redeemCount", COUNT("success"."id") AS "successCount" FROM "inactive_raffle" "raffle" INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"  LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"  LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"  LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"  LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId" GROUP BY "raffle"."raffleId"',
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
      ['VIEW', 'raffle_view', 'public'],
    );
    await queryRunner.query(`
            DROP VIEW "raffle_view"
        `);
  }
}
