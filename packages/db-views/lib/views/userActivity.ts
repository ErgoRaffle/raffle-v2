import {
  BigIntValueTransformer,
  SelectQueryBuilder,
  ViewColumn,
  ViewEntity,
} from '@rosen-bridge/extended-typeorm';

import {
  GiftEntity,
  InactiveRaffleEntity,
  TicketEntity,
} from '@ergo-raffle/extractors';

import { UserActivityType } from '../types';

/**
 * Database view exposing a unified stream of user activity events (raffle
 * creations, ticket donations and gift donations) by combining rows from
 * `inactive_raffle`, `ticket` and `gift` via `UNION ALL`.
 *
 * TypeORM's `SelectQueryBuilder` does not provide a native `UNION ALL`
 * operator, so the three branches are built as individual query builders for
 * type-safety and then stitched together through a lightweight wrapper that
 * implements the single `getQuery()` method TypeORM invokes on the view
 * expression at migration time.
 */
@ViewEntity({
  name: 'user_activity_view',
  expression: (dataSource) => {
    const creation = dataSource
      .createQueryBuilder()
      .addSelect('raffle.projectErgoTree', 'ergoTree')
      .addSelect('raffle.raffleId', 'raffleId')
      .addSelect(`'creation'`, 'type')
      .addSelect('0', 'ticketCount')
      .addSelect('raffle.txId', 'txId')
      .addSelect('raffle.height', 'height')
      .from(InactiveRaffleEntity, 'raffle');

    const donation = dataSource
      .createQueryBuilder()
      .addSelect('ticket.donatorErgoTree', 'ergoTree')
      .addSelect('ticket.raffleId', 'raffleId')
      .addSelect(`'donation'`, 'type')
      .addSelect('ticket.rangeEnd - ticket.rangeStart', 'ticketCount')
      .addSelect('ticket.txId', 'txId')
      .addSelect('ticket.height', 'height')
      .from(TicketEntity, 'ticket');

    const gift = dataSource
      .createQueryBuilder()
      .addSelect('gift.donatorErgoTree', 'ergoTree')
      .addSelect('gift.raffleId', 'raffleId')
      .addSelect(`'gift'`, 'type')
      .addSelect('0', 'ticketCount')
      .addSelect('gift.txId', 'txId')
      .addSelect('gift.height', 'height')
      .from(GiftEntity, 'gift');

    return {
      getQuery: () =>
        [creation.getQuery(), donation.getQuery(), gift.getQuery()].join(
          ' UNION ALL ',
        ),
    } as SelectQueryBuilder<object>;
  },
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
