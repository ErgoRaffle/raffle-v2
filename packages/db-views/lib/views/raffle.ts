import {
  BigIntValueTransformer,
  ViewColumn,
  ViewEntity,
} from '@rosen-bridge/extended-typeorm';

import {
  GiftEntity,
  GiftRedeemEntity,
  InactiveRaffleEntity,
  RaffleDetailsEntity,
  SuccessRaffleEntity,
  TicketEntity,
} from '@ergo-raffle/extractors';

/**
 * Database view joining `inactive_raffle` with `raffle_details`, `gift`, `ticket`,
 * `success_raffle` and `gift_redeem` on `raffleId`.
 * Selects all domain-relevant fields while omitting internal extraction
 * fields (`serialized`, `extractor`, `block`).
 */
@ViewEntity({
  name: 'raffle_view',
  expression: (dataSource) =>
    dataSource
      .createQueryBuilder()
      .addSelect('raffle.collectingTokenId', 'collectingTokenId')
      .addSelect('raffle.deadline', 'deadline')
      .addSelect('raffle.goal', 'goal')
      .addSelect('raffle.height', 'height')
      .addSelect('raffle.implementerErgoTree', 'implementerErgoTree')
      .addSelect('raffle.implementerFeePercent', 'implementerFeePercent')
      .addSelect('raffle.projectErgoTree', 'projectErgoTree')
      .addSelect('raffle.raffleId', 'raffleId')
      .addSelect('raffle.serviceErgoTree', 'serviceErgoTree')
      .addSelect('raffle.serviceFeePercent', 'serviceFeePercent')
      .addSelect('raffle.ticketPrice', 'ticketPrice')
      .addSelect('raffle.txFee', 'txFee')
      .addSelect('raffle.winnersPercent', 'winnersPercent')
      .addSelect('raffle.winnersPercentList', 'winnersPercentList')
      .addSelect('MAX(details.description)', 'description')
      .addSelect('MAX(details.name)', 'name')
      .addSelect('MAX(details.tags)', 'tags')
      .addSelect('MAX(details.pictures)', 'pictures')
      .addSelect('COUNT(gift.id)', 'giftCount')
      .addSelect('MAX(gift.height)', 'giftMaxHeight')
      .addSelect('SUM(ticket.rangeEnd - ticket.rangeStart)', 'soldTicketCount')
      .addSelect('MAX(ticket.height)', 'ticketMaxHeight')
      .addSelect('COUNT(redeem.id)', 'redeemCount')
      .addSelect('COUNT(success.id)', 'successCount')
      .from(InactiveRaffleEntity, 'raffle')
      .innerJoin(
        RaffleDetailsEntity,
        'details',
        'raffle.raffleId = details.raffleId',
      )
      .leftJoin(GiftEntity, 'gift', 'raffle.raffleId = gift.raffleId')
      .leftJoin(TicketEntity, 'ticket', 'raffle.raffleId = ticket.raffleId')
      .leftJoin(
        SuccessRaffleEntity,
        'success',
        'raffle.raffleId = success.raffleId',
      )
      .leftJoin(GiftRedeemEntity, 'redeem', 'raffle.raffleId = redeem.raffleId')
      .groupBy('raffle.raffleId')
      .addGroupBy('raffle.height')
      .addGroupBy('raffle.serviceErgoTree')
      .addGroupBy('raffle.implementerErgoTree')
      .addGroupBy('raffle.projectErgoTree')
      .addGroupBy('raffle.serviceFeePercent')
      .addGroupBy('raffle.implementerFeePercent')
      .addGroupBy('raffle.winnersPercent')
      .addGroupBy('raffle.ticketPrice')
      .addGroupBy('raffle.goal')
      .addGroupBy('raffle.deadline')
      .addGroupBy('raffle.winnersPercentList')
      .addGroupBy('raffle.txFee')
      .addGroupBy('raffle.collectingTokenId'),
})
export class RaffleView {
  @ViewColumn()
  raffleId: string;

  @ViewColumn()
  collectingTokenId?: string;

  @ViewColumn()
  deadline: number;

  @ViewColumn()
  tags: string;

  @ViewColumn()
  pictures: string;

  @ViewColumn()
  description: string;

  @ViewColumn()
  giftCount: number;

  @ViewColumn()
  giftMaxHeight?: number;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  goal: bigint;

  @ViewColumn()
  height: number;

  @ViewColumn()
  implementerErgoTree: string;

  @ViewColumn()
  implementerFeePercent: number;

  @ViewColumn()
  name: string;

  @ViewColumn()
  projectErgoTree: string;

  @ViewColumn()
  redeemCount: number;

  @ViewColumn()
  serviceErgoTree: string;

  @ViewColumn()
  serviceFeePercent: number;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  soldTicketCount: bigint;

  @ViewColumn()
  successCount: number;

  @ViewColumn()
  ticketMaxHeight?: number;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  ticketPrice: bigint;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  txFee: bigint;

  @ViewColumn()
  winnersPercent: number;

  @ViewColumn()
  winnersPercentList: string;
}
