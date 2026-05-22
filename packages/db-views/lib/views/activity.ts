import {
  BigIntValueTransformer,
  SelectQueryBuilder,
  ViewColumn,
  ViewEntity,
} from '@rosen-bridge/extended-typeorm';

import {
  GiftEntity,
  GiftRedeemEntity,
  InactiveRaffleEntity,
  SafePayEntity,
  TicketEntity,
  TicketRedeemEntity,
} from '@ergo-raffle/extractors';

import { ActivityType, UserActivityType } from '../types';

/**
 * Database view unifying user activity events (creations, donations, gifts,
 * ticket redeems, gift returns) into one row stream via `UNION ALL`.
 *
 * Redeem/return branches read the tx id from `safe_pay` and require a
 * matching `ticket_redeem`/`gift_redeem` row so unrelated safe-pay boxes
 * that happen to spend a ticket/gift are excluded.
 */
@ViewEntity({
  name: 'activity_view',
  expression: (dataSource) => {
    const creation = dataSource
      .createQueryBuilder()
      .select([
        'raffle.projectErgoTree AS "ergoTree"',
        'raffle.raffleId AS "raffleId"',
        `'${ActivityType.Creation}' AS type`,
        '0 AS "ticketCount"',
        '-1 AS "winnerIndex"',
        'raffle.txId AS "txId"',
        'raffle.height AS "height"',
      ])
      .from(InactiveRaffleEntity, 'raffle');

    const donation = dataSource
      .createQueryBuilder()
      .select([
        'ticket.donatorErgoTree AS "ergoTree"',
        'ticket.raffleId AS "raffleId"',
        `'${ActivityType.Donation}' AS type`,
        'ticket.rangeEnd - ticket.rangeStart AS "ticketCount"',
        '-1 AS "winnerIndex"',
        'ticket.txId AS "txId"',
        'ticket.height AS "height"',
      ])
      .from(TicketEntity, 'ticket');

    const gift = dataSource
      .createQueryBuilder()
      .select([
        'gift.donatorErgoTree AS "ergoTree"',
        'gift.raffleId AS "raffleId"',
        `'${ActivityType.Gift}' AS type`,
        '0 AS "ticketCount"',
        'gift.winnerIndex AS "winnerIndex"',
        'gift.txId AS "txId"',
        'gift.height AS "height"',
      ])
      .from(GiftEntity, 'gift');

    const ticketRedeem = dataSource
      .createQueryBuilder()
      .select([
        'ticket.donatorErgoTree AS "ergoTree"',
        'ticket.raffleId AS "raffleId"',
        `'${ActivityType.TicketRedeem}' AS type`,
        'ticket.rangeEnd - ticket.rangeStart AS "ticketCount"',
        '-1 AS "winnerIndex"',
        'safePay.txId AS "txId"',
        'safePay.height AS "height"',
      ])
      .from(SafePayEntity, 'safePay')
      .innerJoin(
        TicketEntity,
        'ticket',
        'ticket.identifier = safePay.inputBoxId',
      )
      .innerJoin(TicketRedeemEntity, 'redeem', 'redeem.txId = safePay.txId');

    const giftReturn = dataSource
      .createQueryBuilder()
      .select([
        'gift.donatorErgoTree AS "ergoTree"',
        'gift.raffleId AS "raffleId"',
        `'${ActivityType.GiftReturn}' AS type`,
        '0 AS "ticketCount"',
        'gift.winnerIndex AS "winnerIndex"',
        'safePay.txId AS "txId"',
        'safePay.height AS "height"',
      ])
      .from(SafePayEntity, 'safePay')
      .innerJoin(GiftEntity, 'gift', 'gift.identifier = safePay.inputBoxId')
      .innerJoin(GiftRedeemEntity, 'redeem', 'redeem.txId = safePay.txId');
    return {
      getQuery: () =>
        [
          creation.getQuery(),
          donation.getQuery(),
          gift.getQuery(),
          ticketRedeem.getQuery(),
          giftReturn.getQuery(),
        ].join(' UNION ALL '),
    } as SelectQueryBuilder<object>;
  },
})
export class ActivityView {
  @ViewColumn()
  ergoTree: string;

  @ViewColumn()
  raffleId: string;

  @ViewColumn()
  type: UserActivityType;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  ticketCount?: bigint;

  @ViewColumn()
  winnerIndex?: number;

  @ViewColumn()
  txId: string;

  @ViewColumn()
  height: number;
}
