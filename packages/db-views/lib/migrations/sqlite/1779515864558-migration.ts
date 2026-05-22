import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1779515864558 implements MigrationInterface {
  name = 'Migration1779515864558';

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
            VALUES (NULL, NULL, NULL, ?, ?, ?)
        `,
      [
        'VIEW',
        'raffle_view',
        'SELECT "raffle"."height" AS "height", "raffle"."raffleId" AS "raffleId", "raffle"."serviceErgoTree" AS "serviceErgoTree", "raffle"."implementerErgoTree" AS "implementerErgoTree", "raffle"."projectErgoTree" AS "projectErgoTree", "raffle"."serviceFeePercent" AS "serviceFeePercent", "raffle"."implementerFeePercent" AS "implementerFeePercent", "raffle"."winnersPercent" AS "winnersPercent", "raffle"."ticketPrice" AS "ticketPrice", "raffle"."goal" AS "goal", "raffle"."deadline" AS "deadline", "raffle"."winnersPercentList" AS "winnersPercentList", "raffle"."txFee" AS "txFee", "raffle"."collectingTokenId" AS "collectingTokenId", "token"."isVerified" AS "tokenIsVerified", MAX("details"."description") AS "description", MAX("details"."name") AS "name", MAX("details"."tags") AS "tags", MAX("details"."pictures") AS "pictures", COUNT(DISTINCT "gift"."id") AS "giftCount", MAX("gift"."height") AS "giftMaxHeight", SUM(DISTINCT "ticket"."rangeEnd") - SUM(DISTINCT "ticket"."rangeStart") AS "soldTicketCount", COUNT(DISTINCT "ticket"."id") AS "backerCount", MAX("ticket"."height") AS "ticketMaxHeight", COUNT("redeem"."id") AS "redeemCount", COUNT("success"."id") AS "successCount", MAX("token"."name") AS "tokenName", MAX("token"."decimals") AS "tokenDecimals" FROM "inactive_raffle" "raffle" INNER JOIN "raffle_details" "details" ON "raffle"."raffleId" = "details"."raffleId"  LEFT JOIN "gift" "gift" ON "raffle"."raffleId" = "gift"."raffleId"  LEFT JOIN "ticket" "ticket" ON "raffle"."raffleId" = "ticket"."raffleId"  LEFT JOIN "success_raffle" "success" ON "raffle"."raffleId" = "success"."raffleId"  LEFT JOIN "gift_redeem" "redeem" ON "raffle"."raffleId" = "redeem"."raffleId"  LEFT JOIN "token" "token" ON "raffle"."collectingTokenId" = "token"."id" GROUP BY "raffle"."raffleId", "raffle"."height", "raffle"."serviceErgoTree", "raffle"."implementerErgoTree", "raffle"."projectErgoTree", "raffle"."serviceFeePercent", "raffle"."implementerFeePercent", "raffle"."winnersPercent", "raffle"."ticketPrice", "raffle"."goal", "raffle"."deadline", "raffle"."winnersPercentList", "raffle"."txFee", "raffle"."collectingTokenId", "token"."isVerified"',
      ],
    );
    await queryRunner.query(`
            CREATE VIEW "activity_view" AS
            SELECT "raffle"."projectErgoTree" AS "ergoTree",
                "raffle"."raffleId" AS "raffleId",
                'creation' AS type,
                0 AS "ticketCount",
                -1 AS "winnerIndex",
                "raffle"."txId" AS "txId",
                "raffle"."height" AS "height"
            FROM "inactive_raffle" "raffle"
            UNION ALL
            SELECT "ticket"."donatorErgoTree" AS "ergoTree",
                "ticket"."raffleId" AS "raffleId",
                'donation' AS type,
                "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount",
                -1 AS "winnerIndex",
                "ticket"."txId" AS "txId",
                "ticket"."height" AS "height"
            FROM "ticket" "ticket"
            UNION ALL
            SELECT "gift"."donatorErgoTree" AS "ergoTree",
                "gift"."raffleId" AS "raffleId",
                'gift' AS type,
                0 AS "ticketCount",
                "gift"."winnerIndex" AS "winnerIndex",
                "gift"."txId" AS "txId",
                "gift"."height" AS "height"
            FROM "gift" "gift"
            UNION ALL
            SELECT "ticket"."donatorErgoTree" AS "ergoTree",
                "ticket"."raffleId" AS "raffleId",
                'ticket_redeem' AS type,
                "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount",
                -1 AS "winnerIndex",
                "safePay"."txId" AS "txId",
                "safePay"."height" AS "height"
            FROM "safe_pay" "safePay"
                INNER JOIN "ticket" "ticket" ON "ticket"."identifier" = "safePay"."inputBoxId"
                INNER JOIN "ticket_redeem" "redeem" ON "redeem"."txId" = "safePay"."txId"
            UNION ALL
            SELECT "gift"."donatorErgoTree" AS "ergoTree",
                "gift"."raffleId" AS "raffleId",
                'gift_return' AS type,
                0 AS "ticketCount",
                "gift"."winnerIndex" AS "winnerIndex",
                "safePay"."txId" AS "txId",
                "safePay"."height" AS "height"
            FROM "safe_pay" "safePay"
                INNER JOIN "gift" "gift" ON "gift"."identifier" = "safePay"."inputBoxId"
                INNER JOIN "gift_redeem" "redeem" ON "redeem"."txId" = "safePay"."txId"
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
        'activity_view',
        'SELECT "raffle"."projectErgoTree" AS "ergoTree", "raffle"."raffleId" AS "raffleId", \'creation\' AS type, 0 AS "ticketCount", -1 AS "winnerIndex", "raffle"."txId" AS "txId", "raffle"."height" AS "height" FROM "inactive_raffle" "raffle" UNION ALL SELECT "ticket"."donatorErgoTree" AS "ergoTree", "ticket"."raffleId" AS "raffleId", \'donation\' AS type, "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount", -1 AS "winnerIndex", "ticket"."txId" AS "txId", "ticket"."height" AS "height" FROM "ticket" "ticket" UNION ALL SELECT "gift"."donatorErgoTree" AS "ergoTree", "gift"."raffleId" AS "raffleId", \'gift\' AS type, 0 AS "ticketCount", "gift"."winnerIndex" AS "winnerIndex", "gift"."txId" AS "txId", "gift"."height" AS "height" FROM "gift" "gift" UNION ALL SELECT "ticket"."donatorErgoTree" AS "ergoTree", "ticket"."raffleId" AS "raffleId", \'ticket_redeem\' AS type, "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount", -1 AS "winnerIndex", "safePay"."txId" AS "txId", "safePay"."height" AS "height" FROM "safe_pay" "safePay" INNER JOIN "ticket" "ticket" ON "ticket"."identifier" = "safePay"."inputBoxId"  INNER JOIN "ticket_redeem" "redeem" ON "redeem"."txId" = "safePay"."txId" UNION ALL SELECT "gift"."donatorErgoTree" AS "ergoTree", "gift"."raffleId" AS "raffleId", \'gift_return\' AS type, 0 AS "ticketCount", "gift"."winnerIndex" AS "winnerIndex", "safePay"."txId" AS "txId", "safePay"."height" AS "height" FROM "safe_pay" "safePay" INNER JOIN "gift" "gift" ON "gift"."identifier" = "safePay"."inputBoxId"  INNER JOIN "gift_redeem" "redeem" ON "redeem"."txId" = "safePay"."txId"',
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
            VALUES (NULL, NULL, NULL, ?, ?, ?)
        `,
      [
        'VIEW',
        'winner_view',
        'SELECT DISTINCT "winner"."index" AS "index", "winner"."rewardPercent" AS "rewardPercent", "gift"."serialized" AS "giftSerialized", winner."raffleId" AS "raffleId" FROM "winner" "winner" LEFT JOIN "gift" "gift" ON winner."raffleId" = gift."raffleId" AND "winner"."index" = gift."winnerIndex"',
      ],
    );
    await queryRunner.query(`
            CREATE VIEW "activity_with_time_view" AS
            SELECT "activity"."ergoTree" AS "ergoTree",
                "activity"."raffleId" AS "raffleId",
                "activity"."type" AS "type",
                "activity"."ticketCount" AS "ticketCount",
                "activity"."winnerIndex" AS "winnerIndex",
                "activity"."txId" AS "txId",
                "activity"."height" AS "height",
                "block"."timestamp" AS "timestamp",
                "details"."name" AS "raffleName"
            FROM "activity_view" "activity"
                LEFT JOIN "block_entity" "block" ON "block"."height" = "activity"."height"
                AND "block"."scanner" = 'ergo'
                LEFT JOIN "raffle_details" "details" ON "details"."raffleId" = "activity"."raffleId"
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
        'activity_with_time_view',
        'SELECT "activity"."ergoTree" AS "ergoTree", "activity"."raffleId" AS "raffleId", "activity"."type" AS "type", "activity"."ticketCount" AS "ticketCount", "activity"."winnerIndex" AS "winnerIndex", "activity"."txId" AS "txId", "activity"."height" AS "height", "block"."timestamp" AS "timestamp", "details"."name" AS "raffleName" FROM "activity_view" "activity" LEFT JOIN "block_entity" "block" ON "block"."height" = "activity"."height" AND "block"."scanner" = \'ergo\'  LEFT JOIN "raffle_details" "details" ON "details"."raffleId" = "activity"."raffleId"',
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
      ['VIEW', 'activity_with_time_view'],
    );
    await queryRunner.query(`
            DROP VIEW "activity_with_time_view"
        `);
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
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
        `,
      ['VIEW', 'activity_view'],
    );
    await queryRunner.query(`
            DROP VIEW "activity_view"
        `);
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
  }
}
