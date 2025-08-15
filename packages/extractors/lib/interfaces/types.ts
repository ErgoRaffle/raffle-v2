import { RaffleBoxType } from '../entities/raffleBoxEntity';

export { SpendInfo } from '@rosen-bridge/abstract-extractor';

export interface ExtractedBox {
  boxId: string;
  txId: string;
  serialized: string;
}

export interface ServiceBoxInterface extends ExtractedBox {
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

export interface RaffleBoxInterface extends ExtractedBox {
  raffleId: string;
  type: RaffleBoxType;
}

export interface DynamicBoxInterface extends ExtractedBox {
  address: string;
}

export interface WinnerBoxInterface extends ExtractedBox {
  raffleId: string;
  index: number;
  rewardPercent: number;
}

export interface PictureInterface {
  orderIndex: number;
  raffleId: string;
  content: string;
}

export interface RaffleDetailsBoxInterface extends ExtractedBox {
  id?: number;
  raffleId: string;
  name: string;
  description: string;
  pictures?: PictureInterface[];
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

export interface SuccessRaffleBoxInterface extends ExtractedBox {
  raffleId: string;
  selectedWinnersList: string;
  step: number;
}

export interface TicketRedeemBoxInterface extends ExtractedBox {
  raffleId: string;
  totalSoldTicket: bigint;
  redeemedTickets: bigint;
}

export interface SafePayBoxInterface extends ExtractedBox {
  recipient: string;
}
