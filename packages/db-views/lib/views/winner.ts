import { ViewColumn, ViewEntity } from '@rosen-bridge/extended-typeorm';

import { GiftEntity, WinnerEntity } from '@ergo-raffle/extractors';

/**
 * Database view joining `winner` with `gift` on `raffleId` and winner index
 * Selects distinct winner information with associated gift serialized data
 */
@ViewEntity({
  name: 'winner_view',
  expression: (dataSource) =>
    dataSource
      .createQueryBuilder()
      .addSelect('winner."raffleId"', 'raffleId')
      .addSelect('winner.index', 'index')
      .addSelect('winner.rewardPercent', 'rewardPercent')
      .addSelect('gift.serialized', 'serialized')
      .from(WinnerEntity, 'winner')
      .leftJoin(
        GiftEntity,
        'gift',
        'winner."raffleId" = gift."raffleId" AND winner.index = gift."winnerIndex"',
      )
      .distinct(),
})
export class WinnerView {
  @ViewColumn()
  raffleId: string;

  @ViewColumn()
  index: number;

  @ViewColumn()
  rewardPercent: number;

  @ViewColumn()
  serialized?: string;
}
