import { AbstractEntityData } from '@rosen-bridge/abstract-extractor';
import { InitializeOptions } from '@rosen-bridge/abstract-extractor';

import { RaffleBoxType } from '../entities';

export interface AbstractRaffleBoxInterface extends AbstractEntityData {
  txId: string;
  raffleId: string;
}

export interface ServiceBoxInterface extends AbstractEntityData {
  txId: string;
  serviceFeePercent: number;
  implementerFeePercent: number;
  creationFee: bigint;
  txFee: bigint;
}

export interface InactiveRaffleBoxInterface extends AbstractRaffleBoxInterface {
  serviceErgoTree: string;
  implementerErgoTree: string;
  projectErgoTree: string;
  serviceFeePercent: number;
  implementerFeePercent: number;
  winnersPercent: number;
  ticketPrice: bigint;
  goal: bigint;
  deadline: number;
  winnersPercentList: string;
  txFee: bigint;
  collectingTokenId?: string;
}

export interface RaffleBoxInterface extends AbstractRaffleBoxInterface {
  type: RaffleBoxType;
}

export interface CreationProxyBoxInterface extends AbstractEntityData {
  txId: string;
  address: string;
  expirationHeight: number;
  raffleDeadline: number;
  winnersPercent: number;
  ticketPrice: bigint;
  goal: bigint;
  txFee: bigint;
  implementerErgoTree: string;
  organizerErgoTree: string;
  projectErgoTree: string;
  winnersPercentList: string;
  collectingTokenId: string;
  name: string;
  description: string;
  tags: string;
  pictures: string;
  winnerCount: number;
}

export interface DonationProxyBoxInterface extends AbstractRaffleBoxInterface {
  address: string;
  expirationHeight: number;
  raffleDeadline: number;
  ticketCount: number;
  txFee: bigint;
  donatorErgoTree: string;
}

export interface AddGiftProxyBoxInterface extends AbstractRaffleBoxInterface {
  address: string;
  expirationHeight: number;
  raffleDeadline: number;
  winnerIndex: number;
  txFee: bigint;
  giftGiverErgoTree: string;
}

export interface WinnerBoxInterface extends AbstractRaffleBoxInterface {
  index: number;
  rewardPercent: number;
  txFee: bigint;
}

export interface RaffleDetailsBoxInterface extends AbstractRaffleBoxInterface {
  id?: number;
  name: string;
  description: string;
  tags: string;
  pictures: string;
}

export interface GiftBoxInterface extends AbstractRaffleBoxInterface {
  donatorErgoTree: string;
  winnerIndex: number;
}

export interface TicketBoxInterface extends AbstractRaffleBoxInterface {
  donatorErgoTree: string;
  rangeStart: bigint;
  rangeEnd: bigint;
}

export interface WinnerPrizeBoxInterface extends AbstractRaffleBoxInterface {
  winnerTicketIndex: number;
  giftCount: number;
  winnerIndex: number;
  unwrappedGiftCount: number;
}

export interface GiftRedeemBoxInterface extends AbstractRaffleBoxInterface {
  step: number;
}

export interface SuccessRaffleBoxInterface extends AbstractRaffleBoxInterface {
  selectedWinnersList: string;
  step: number;
}

export interface TicketRedeemBoxInterface extends AbstractRaffleBoxInterface {
  totalSoldTicket: bigint;
  redeemedTickets: bigint;
}

export interface SafePayBoxInterface extends AbstractEntityData {
  txId: string;
  inputBoxId: string;
  recipient: string;
}

/** InitializeOptions with active defaulting to true when omitted */
export type ExtractorInitOptions = Omit<InitializeOptions, 'active'> & {
  active?: boolean;
};
