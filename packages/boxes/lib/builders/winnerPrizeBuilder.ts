import {
  Box,
  OutputBuilder,
  Amount,
  SColl,
  SLong,
  SInt,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';
import { WinnerBuilder } from './winnerBuilder';
import { SuccessRaffleBuilder } from './successRaffleBuilder';

/**
 * Builder class for creating Winner Prize boxes in the ErgoRaffle protocol
 * Winner Prize box holds the prize for a raffle winner
 *
 * Registers:
 *   R4[Coll[Long]]: [WinnerTicketIndex, GiftCount, TxFee]
 *   R5[Int]: WinnerIndex
 *   R6[Long]: UnwrappedGiftCount
 * Tokens:
 *   0: Ticket
 *   1: GiftToken
 *   2: CollectingToken (if token-goal raffle)
 */
export class WinnerPrizeBuilder {
  private value?: bigint;
  private creationHeight?: number;
  private winnerTicketIndex?: bigint;
  private giftCount?: bigint;
  private txFee?: bigint;
  private winnerIndex?: number;
  private unwrappedGiftCount?: bigint;
  private ticketTokenId?: string;
  private giftTokenId?: string;
  private giftTokenCount?: bigint;
  private collectingTokenId?: string;
  private collectingTokenAmount?: bigint;
  private prizeAmount?: bigint;

  constructor() {}

  /**
   * Set the box value in nanoERG
   * @param value - Amount in nanoERG
   * @returns this builder instance
   */
  setValue = (value: bigint): this => {
    this.value = value;
    return this;
  };

  /**
   * Set the creation height for the box
   * @param height - Block height
   * @returns this builder instance
   */
  setCreationHeight = (height: number): this => {
    this.creationHeight = height;
    return this;
  };

  /**
   * Set the winner ticket index
   * @param index - Index of the winning ticket
   * @returns this builder instance
   */
  setWinnerTicketIndex = (index: bigint): this => {
    this.winnerTicketIndex = index;
    return this;
  };

  /**
   * Get the winner ticket index
   * @returns The winner ticket index
   */
  getWinnerTicketIndex = (): bigint => {
    if (!this.winnerTicketIndex) throw new Error('Winner ticket index not set');
    return this.winnerTicketIndex;
  };

  /**
   * Set the gift count
   * @param count - Number of gifts
   * @returns this builder instance
   */
  setGiftCount = (count: bigint): this => {
    this.giftCount = count;
    return this;
  };

  /**
   * Set the transaction fee
   * @param fee - Fee amount in nanoERG
   * @returns this builder instance
   */
  setTxFee = (fee: bigint): this => {
    this.txFee = fee;
    return this;
  };

  /**
   * Set the winner index
   * @param index - Index of the winner
   * @returns this builder instance
   */
  setWinnerIndex = (index: number): this => {
    this.winnerIndex = index;
    return this;
  };

  /**
   * Get the winner index
   * @returns The winner index
   */
  getWinnerIndex = (): number => {
    if (!this.winnerIndex) throw new Error('Winner index not set');
    return this.winnerIndex;
  };

  /**
   * Set the unwrapped gift count
   * @param count - Number of unwrapped gifts
   * @returns this builder instance
   */
  setUnwrappedGiftCount = (count: bigint): this => {
    this.unwrappedGiftCount = count;
    return this;
  };

  /**
   * Set the ticket token ID
   * @param tokenId - The ticket token ID
   * @returns this builder instance
   */
  setTicketTokenId = (tokenId: string): this => {
    this.ticketTokenId = tokenId;
    return this;
  };

  /**
   * Get the ticket token ID
   * @returns The ticket token ID
   */
  getTicketTokenId = (): string => {
    if (!this.ticketTokenId) throw new Error('Ticket token ID not set');
    return this.ticketTokenId;
  };

  /**
   * Set the gift token ID
   * @param tokenId - The gift token ID
   * @returns this builder instance
   */
  setGiftTokenId = (tokenId: string): this => {
    this.giftTokenId = tokenId;
    return this;
  };

  /**
   * Set the gift token count
   * @param count - Number of gift tokens
   * @returns this builder instance
   */
  setGiftTokenCount = (count: bigint): this => {
    this.giftTokenCount = count;
    return this;
  };

  /**
   * Set the collecting token ID
   * @param tokenId - The collecting token ID
   * @returns this builder instance
   */
  setCollectingTokenId = (tokenId: string): this => {
    this.collectingTokenId = tokenId;
    return this;
  };

  /**
   * Set the collecting token amount
   * @param amount - Collecting token amount
   * @returns this builder instance
   */
  setCollectingTokenAmount = (amount: bigint): this => {
    this.collectingTokenAmount = amount;
    return this;
  };

  /**
   * Set the prize amount
   * @param amount - Prize amount
   * @returns this builder instance
   */
  setPrizeAmount = (amount: bigint): this => {
    this.prizeAmount = amount;
    return this;
  };

  /**
   * Get the prize amount
   * @returns Prize amount
   */
  getPrizeAmount = (): bigint => {
    if (this.prizeAmount == undefined) {
      throw new Error('Prize amount not set');
    }
    return this.prizeAmount;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (this.winnerTicketIndex == undefined)
      throw new Error('Winner ticket index not set');
    if (this.giftCount == undefined) throw new Error('Gift count not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnerIndex) throw new Error('Winner index not set');
    if (this.unwrappedGiftCount == undefined)
      throw new Error('Unwrapped gift count not set');
    if (!this.ticketTokenId) throw new Error('Ticket token ID not set');
    if (!this.giftTokenId) throw new Error('Gift token ID not set');
    if (!this.giftTokenCount) throw new Error('Gift token count not set');
  };

  /**
   * Build an output box for the winner prize contract
   * Contains prize information and tokens
   * @returns OutputBuilder instance configured for the winner prize box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    const tokens = [
      {
        tokenId: this.ticketTokenId!,
        amount: 1n,
      },
      {
        tokenId: this.giftTokenId!,
        amount: this.giftTokenCount!,
      },
    ];

    // Add collecting token if set
    if (this.collectingTokenId && this.collectingTokenAmount) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenAmount,
      });
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.winnerPrize).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.winnerTicketIndex!,
          this.giftCount!,
          this.txFee!,
        ]).toHex(),
        R5: SInt(this.winnerIndex!).toHex(),
        R6: SLong(this.unwrappedGiftCount!).toHex(),
      });
  };

  /**
   * Create a WinnerPrizeBuilder instance from an existing box
   * @param box - Existing winner prize box to copy configuration from
   * @returns New WinnerPrizeBuilder instance with copied configuration
   * @throws Error if box structure doesn't match winner prize box requirements
   */
  static fromBox = (box: Box<Amount>): WinnerPrizeBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid winner prize box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6) {
      throw new Error('Invalid winner prize box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid winner prize box: invalid R4 register format');
    }

    const winnerIndex = SConstant.from(registers.R5).data as number;
    const unwrappedGiftCount = SConstant.from(registers.R6).data as bigint;

    const builder = new WinnerPrizeBuilder()
      .setValue(BigInt(box.value))
      .setWinnerTicketIndex(r4Data[0])
      .setGiftCount(r4Data[1])
      .setTxFee(r4Data[2])
      .setWinnerIndex(winnerIndex)
      .setUnwrappedGiftCount(unwrappedGiftCount)
      .setTicketTokenId(box.assets[0].tokenId)
      .setGiftTokenId(box.assets[1].tokenId)
      .setGiftTokenCount(BigInt(box.assets[1].amount));

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder
        .setCollectingTokenId(box.assets[2].tokenId)
        .setCollectingTokenAmount(BigInt(box.assets[2].amount));
    }

    return builder;
  };

  /**
   * Create a WinnerPrizeBuilder instance from a winner box
   * @param winnerBox - Winner box to read configuration from
   * @param successRaffleBox - Success raffle box to get total prize from
   * @returns New WinnerPrizeBuilder instance with configuration from winner box
   * @throws Error if box structure doesn't match winner box requirements
   */
  static fromWinnerAndSuccessRaffleBox = (
    winnerBox: Box<Amount>,
    successRaffleBox: Box<Amount>,
  ): WinnerPrizeBuilder => {
    // Use WinnerBuilder to parse the winner box
    const winnerBuilder = WinnerBuilder.fromBox(winnerBox);

    // Use SuccessRaffleBuilder to parse the success raffle box
    const successRaffleBuilder = SuccessRaffleBuilder.fromBox(successRaffleBox);

    // Calculate prize amount
    const rewardPercent = winnerBuilder.getRewardPercent();
    const totalPrize = successRaffleBuilder.getTotalPrize();
    const prizeAmount = (totalPrize * rewardPercent) / 1000n;

    // Check if it's a token-goal raffle

    const builder = new WinnerPrizeBuilder()
      .setGiftCount(winnerBuilder.getGiftCount())
      .setTxFee(winnerBuilder.getTxFee())
      .setWinnerIndex(winnerBuilder.getWinnerIndex())
      .setUnwrappedGiftCount(0n)
      .setTicketTokenId(winnerBuilder.getTicketTokenId())
      .setGiftTokenId(winnerBuilder.getGiftTokenId()!)
      .setGiftTokenCount(winnerBuilder.getGiftTokenAmount()!)
      .setPrizeAmount(prizeAmount);

    // Set value and collecting token for token-goal raffles
    if (successRaffleBuilder.isErgGoal()) {
      builder.setValue(prizeAmount + 3n * winnerBuilder.getTxFee());
    } else {
      builder
        .setValue(3n * winnerBuilder.getTxFee())
        .setCollectingTokenId(successRaffleBox.assets[2].tokenId)
        .setCollectingTokenAmount(prizeAmount);
    }

    return builder;
  };

  /**
   * Unwrap a gift
   * @returns this builder instance
   */
  unwrapGift = (): this => {
    if (this.unwrappedGiftCount == undefined)
      throw new Error('Unwrapped gift count not set');
    if (this.giftCount == undefined) throw new Error('Gift count not set');
    if (!this.giftTokenCount) throw new Error('Gift token count not set');

    this.unwrappedGiftCount = this.unwrappedGiftCount! + 1n;
    this.giftTokenCount = this.giftTokenCount! + 1n;
    return this;
  };
}
