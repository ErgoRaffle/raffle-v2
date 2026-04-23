import {
  BigIntValueTransformer,
  ViewColumn,
  ViewEntity,
} from '@rosen-bridge/extended-typeorm';

import { UserActivityType } from '../types';

@ViewEntity({
  name: 'user_activity_view',
  expression: `
    SELECT
      "raffle"."projectErgoTree" AS "ergoTree",
      "raffle"."raffleId" AS "raffleId",
      'creation' AS "type",
      0 AS "ticketCount",
      "raffle"."txId" AS "txId",
      "raffle"."height" AS "height"
    FROM "inactive_raffle" "raffle"
    UNION ALL
    SELECT
      "ticket"."donatorErgoTree" AS "ergoTree",
      "ticket"."raffleId" AS "raffleId",
      'donation' AS "type",
      "ticket"."rangeEnd" - "ticket"."rangeStart" AS "ticketCount",
      "ticket"."txId" AS "txId",
      "ticket"."height" AS "height"
    FROM "ticket" "ticket"
    UNION ALL
    SELECT
      "gift"."donatorErgoTree" AS "ergoTree",
      "gift"."raffleId" AS "raffleId",
      'gift' AS "type",
      0 AS "ticketCount",
      "gift"."txId" AS "txId",
      "gift"."height" AS "height"
    FROM "gift" "gift"
  `,
})
export class UserActivityView {
  @ViewColumn()
  ergoTree: string;

  @ViewColumn()
  raffleId: string;

  @ViewColumn()
  type: UserActivityType;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  ticketCount?: bigint;

  @ViewColumn()
  txId: string;

  @ViewColumn()
  height: number;
}
