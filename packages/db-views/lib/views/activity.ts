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
      .addSelect('raffle.projectErgoTree', 'ergoTree')
      .addSelect('raffle.raffleId', 'raffleId')
      .addSelect(`'${ActivityType.Creation}'`, 'type')
      .addSelect('0', 'ticketCount')
      .addSelect('raffle.txId', 'txId')
      .addSelect('raffle.height', 'height')
      .from(InactiveRaffleEntity, 'raffle');

    const donation = dataSource
      .createQueryBuilder()
      .addSelect('ticket.donatorErgoTree', 'ergoTree')
      .addSelect('ticket.raffleId', 'raffleId')
      .addSelect(`'${ActivityType.Donation}'`, 'type')
      .addSelect('ticket.rangeEnd - ticket.rangeStart', 'ticketCount')
      .addSelect('ticket.txId', 'txId')
      .addSelect('ticket.height', 'height')
      .from(TicketEntity, 'ticket');

    const gift = dataSource
      .createQueryBuilder()
      .addSelect('gift.donatorErgoTree', 'ergoTree')
      .addSelect('gift.raffleId', 'raffleId')
      .addSelect(`'${ActivityType.Gift}'`, 'type')
      .addSelect('0', 'ticketCount')
      .addSelect('gift.txId', 'txId')
      .addSelect('gift.height', 'height')
      .from(GiftEntity, 'gift');

    const ticketRedeem = dataSource
      .createQueryBuilder()
      .addSelect('ticket.donatorErgoTree', 'ergoTree')
      .addSelect('ticket.raffleId', 'raffleId')
      .addSelect(`'${ActivityType.TicketRedeem}'`, 'type')
      .addSelect('ticket.rangeEnd - ticket.rangeStart', 'ticketCount')
      .addSelect('safePay.txId', 'txId')
      .addSelect('safePay.height', 'height')
      .from(SafePayEntity, 'safePay')
      .innerJoin(
        TicketEntity,
        'ticket',
        'ticket.identifier = safePay.inputBoxId',
      )
      .innerJoin(TicketRedeemEntity, 'redeem', 'redeem.txId = safePay.txId');

    const giftReturn = dataSource
      .createQueryBuilder()
      .addSelect('gift.donatorErgoTree', 'ergoTree')
      .addSelect('gift.raffleId', 'raffleId')
      .addSelect(`'${ActivityType.GiftReturn}'`, 'type')
      .addSelect('0', 'ticketCount')
      .addSelect('safePay.txId', 'txId')
      .addSelect('safePay.height', 'height')
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
  txId: string;

  @ViewColumn()
  height: number;
}
