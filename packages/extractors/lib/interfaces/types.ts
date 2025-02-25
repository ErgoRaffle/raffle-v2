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
