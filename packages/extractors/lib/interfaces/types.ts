export { SpendInfo } from '@rosen-bridge/abstract-extractor';

export interface ExtractedBox {
  boxId: string;
  txId: string;
  serialized: string;
}

export interface RaffleServiceBoxInterface extends ExtractedBox {
  serviceFeePercent: number;
  implementerFeePercent: number;
  creationFee: bigint;
}

export interface InactiveRaffleBoxInterface extends ExtractedBox {
  serviceErgoTree: string;
  implementorErgoTree: string;
  creatorErgoTree: string;
  serviceFeePercent: number;
  implementerFeePercent: number;
  winnersPercent: number;
  ticketPrice: bigint;
  goal: bigint;
  deadline: number;
  winnersPercentList: string;
  txFee: bigint;
  raffleId: string;
}

export interface RaffleGeneralInterface extends ExtractedBox {
  raffleId: string;
}

export interface WinnerBoxInterface extends ExtractedBox {
  raffleId: string;
  index: number;
  rewardPercent: number;
}

export interface RaffleDetailsBoxInterface extends ExtractedBox {
  raffleId: string;
  name: string;
  description: string;
}

export interface GiftBoxInterface extends ExtractedBox {
  raffleId: string;
  donatorErgoTree: string;
  winnerIndex: number;
}

export interface TicketBoxInterface extends ExtractedBox {
  raffleId: string;
  donatorErgoTree: string;
  rangeStart: bigint;
  rangeEnd: bigint;
}

export interface WinnerPrizeBoxInterface extends ExtractedBox {
  raffleId: string;
  winnerTicketIndex: number;
  giftCount: number;
  winnerIndex: number;
  unwrappedGiftCount: number;
}

export interface GiftRedeemBoxInterface extends ExtractedBox {
  raffleId: string;
  step: number;
}
