import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1775456264404 implements MigrationInterface {
  name = 'Migration1775456264404';

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
                MAX("details"."description") AS "description",
                MAX("details"."name") AS "name",
                MAX("details"."tags") AS "tags",
                MAX("details"."pictures") AS "pictures",
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
                "raffle"."collectingTokenId"
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
        'raffle_view',
        'SELECT "raffle"."height" AS "height", "raffle"."raffleId" AS "raffleId", "raffle"."serviceErgoTree" AS "serviceErgoTree", "raffle"."implementerErgoTree" AS "implementerErgoTree", "raffle"."projectErgoTree" AS "projectErgoTree", "raffle"."serviceFeePercent" AS "serviceFeePercent", "raffle"."implementerFeePercent" AS "implementerFeePercent", "raffle"."winnersPercent" AS "winnersPercent", "raffle"."ticketPrice" AS "ticketPrice", "raffle"."goal" AS "goal", "raffle"."deadline" AS "deadline", "raffle"."winnersPercentList" AS "winnersPercentList", "raffle"."txFee" AS "txFee", "raffle"."collectingTokenId" AS "collectingTokenId", MAX("details"."description") AS "description", MAX("details"."name") AS "name", MAX("details"."tags") AS "tags", MAX("details"."pictures") AS "pictures", COUNT("gift"."id") AS "giftCount", MAX("gift"."height") AS "giftMaxHeight", SUM("ticket"."rangeEnd" - "ticket"."rangeStart") AS "soldTicketCount", MAX("ticket"."height") AS "ticketMaxHeight", COUNT("redeem"."id") AS "redeemCount", COUNT("success"."id") AS "successCount" FROM "inactive_raffle" "raffle" INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"  LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"  LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"  LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"  LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId" GROUP BY "raffle"."raffleId", "raffle"."height", "raffle"."serviceErgoTree", "raffle"."implementerErgoTree", "raffle"."projectErgoTree", "raffle"."serviceFeePercent", "raffle"."implementerFeePercent", "raffle"."winnersPercent", "raffle"."ticketPrice", "raffle"."goal", "raffle"."deadline", "raffle"."winnersPercentList", "raffle"."txFee", "raffle"."collectingTokenId"',
      ],
    );
    await queryRunner.query(`
            CREATE VIEW "user_activity_view" AS
            SELECT "raffle"."projectErgoTree" AS "address",
                "raffle"."raffleId" AS "raffleId",
                'creation' AS "type",
                0 AS "ticketCount",
                "raffle"."txId" AS "txId",
                "raffle"."height" AS "height"
            FROM "inactive_raffle" "raffle"
            UNION ALL
            SELECT "ticket"."donatorErgoTree" AS "address",
                "ticket"."raffleId" AS "raffleId",
                'donation' AS "type",
                "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount",
                "ticket"."txId" AS "txId",
                "ticket"."height" AS "height"
            FROM "ticket" "ticket"
            UNION ALL
            SELECT "gift"."donatorErgoTree" AS "address",
                "gift"."raffleId" AS "raffleId",
                'gift' AS "type",
                0 AS "ticketCount",
                "gift"."txId" AS "txId",
                "gift"."height" AS "height"
            FROM "gift" "gift"
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
        'user_activity_view',
        'SELECT\n      "raffle"."projectErgoTree" AS "address",\n      "raffle"."raffleId" AS "raffleId",\n      \'creation\' AS "type",\n      0 AS "ticketCount",\n      "raffle"."txId" AS "txId",\n      "raffle"."height" AS "height"\n    FROM "inactive_raffle" "raffle"\n    UNION ALL\n    SELECT\n      "ticket"."donatorErgoTree" AS "address",\n      "ticket"."raffleId" AS "raffleId",\n      \'donation\' AS "type",\n      "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount",\n      "ticket"."txId" AS "txId",\n      "ticket"."height" AS "height"\n    FROM "ticket" "ticket"\n    UNION ALL\n    SELECT\n      "gift"."donatorErgoTree" AS "address",\n      "gift"."raffleId" AS "raffleId",\n      \'gift\' AS "type",\n      0 AS "ticketCount",\n      "gift"."txId" AS "txId",\n      "gift"."height" AS "height"\n    FROM "gift" "gift"',
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
      ['VIEW', 'raffle_view'],
    );
    await queryRunner.query(`
            DROP VIEW "raffle_view"
        `);
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
      `,
      ['VIEW', 'user_activity_view'],
    );
    await queryRunner.query(`
            DROP VIEW "user_activity_view"
      `);
  }
}
