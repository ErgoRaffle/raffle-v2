import {
  Box,
  OutputBuilder,
  TokenAmount,
  Amount,
  SColl,
  SLong,
  SByte,
  SInt,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating Winner boxes in the ErgoRaffle protocol
 * Winner box represents a winning ticket in a raffle
 *
 * Registers:
 *   R4[Coll[Long]]: [RewardPercent, Deadline, txFee]
 *   R5[Int]: WinnerIndex
 *   R6[Long]: GiftCount
 *   R7[Coll[Byte]]: GiftTokenId (Exists only before the gift token receipt)
 * Tokens:
 *   0: Ticket
 *   1: GiftToken
 */
export class WinnerBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private rewardPercent?: bigint;
  private deadline?: bigint;
  private txFee?: bigint;
  private winnerIndex?: number;
  private giftCount?: bigint;
  private giftTokenId?: Uint8Array;
  private ticketToken?: TokenAmount<bigint>;
  private giftToken?: TokenAmount<bigint>;

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
   * Set the reward percentage (in thousandths)
   * @param percent - Reward percentage (e.g., 100 = 10%)
   * @returns this builder instance
   */
  setRewardPercent = (percent: bigint): this => {
    this.rewardPercent = percent;
    return this;
  };

  /**
   * Set the deadline height
   * @param height - Block height for deadline
   * @returns this builder instance
   */
  setDeadline = (height: bigint): this => {
    this.deadline = height;
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
   * @param index - Winner index
   * @returns this builder instance
   */
  setWinnerIndex = (index: number): this => {
    this.winnerIndex = index;
    return this;
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
   * Set the gift token ID
   * @param id - Gift token ID as byte array
   * @returns this builder instance
   */
  setGiftTokenId = (id: Uint8Array): this => {
    this.giftTokenId = id;
    return this;
  };

  /**
   * Set the ticket token
   * @param tokenId - Ticket token ID
   * @returns this builder instance
   */
  setTicketToken = (tokenId: string): this => {
    this.ticketToken = {
      tokenId,
      amount: 1n,
    };
    return this;
  };

  /**
   * Set the gift token
   * @param tokenId - Gift token ID
   * @param amount - Number of gift tokens
   * @returns this builder instance
   */
  setGiftToken = (tokenId: string, amount: bigint): this => {
    this.giftToken = {
      tokenId,
      amount,
    };
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.rewardPercent) throw new Error('Reward percent not set');
    if (!this.deadline) throw new Error('Deadline not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnerIndex) throw new Error('Winner index not set');
    if (!this.giftCount) throw new Error('Gift count not set');
    if (!this.ticketToken) throw new Error('Ticket token not set');
  };

  /**
   * Build an output box for the winner contract
   * Contains winner information and prize
   * @returns OutputBuilder instance configured for the winner box
   * @throws Error if any required parameter is missing
   */
  buildOutput = (): OutputBuilder => {
    this.validate();

    const tokens = [this.ticketToken!];
    if (this.giftToken) {
      tokens.push(this.giftToken);
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.winner).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.rewardPercent!,
          this.deadline!,
          this.txFee!,
        ]).toHex(),
        R5: SInt(this.winnerIndex!).toHex(),
        R6: SLong(this.giftCount!).toHex(),
        R7: this.giftTokenId
          ? SColl(SByte, Array.from(this.giftTokenId)).toHex()
          : undefined,
      });
  };

  /**
   * Process gift token receipt
   * Updates the winner box with received gift tokens
   * @param giftTokenId - The ID of the gift token to receive
   * @param giftTokenCount - The number of gift tokens to receive
   * @returns this builder instance
   * @throws Error if required parameters are not set or invalid
   */
  receiveGiftTokens = (giftTokenId: string, giftTokenCount: bigint): this => {
    if (!this.giftTokenId) {
      throw new Error('Gift token ID not set');
    }
    if (!this.giftCount) {
      throw new Error('Gift count not set');
    }

    // Set the gift token with the received amount
    this.setGiftToken(giftTokenId, giftTokenCount);
    // Remove the gift token id from the R7 register
    this.giftTokenId = undefined;

    return this;
  };

  /**
   * Add a gift to the raffle
   * Releases a gift token and updates the winner box state
   * @returns this builder instance
   * @throws Error if required parameters are not set or insufficient gift tokens
   */
  addGift = (): this => {
    if (!this.giftToken) {
      throw new Error('Gift token not set');
    }
    if (!this.giftCount) {
      throw new Error('Gift count not set');
    }
    if (this.giftToken.amount < 1n) {
      throw new Error('Insufficient gift tokens available');
    }

    // Decrease gift token amount by 1
    this.setGiftToken(this.giftToken.tokenId, this.giftToken.amount - 1n);

    // Increase gift count by 1
    this.setGiftCount(this.giftCount + 1n);

    return this;
  };

  /**
   * Create a WinnerBuilder instance from an existing box
   * @param box - Existing winner box to copy configuration from
   * @returns New WinnerBuilder instance with copied configuration
   * @throws Error if box structure doesn't match winner box requirements
   */
  static fromBox = (box: Box<Amount>): WinnerBuilder => {
    if (box.assets.length < 1) {
      throw new Error('Invalid winner box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6) {
      throw new Error('Invalid winner box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid winner box: invalid R4 register format');
    }

    const builder = new WinnerBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setRewardPercent(r4Data[0])
      .setDeadline(r4Data[1])
      .setTxFee(r4Data[2])
      .setWinnerIndex(SConstant.from(registers.R5).data as number)
      .setGiftCount(SConstant.from(registers.R6).data as bigint)
      .setTicketToken(box.assets[0].tokenId);

    // Set gift token if present
    if (box.assets.length > 1) {
      builder.setGiftToken(box.assets[1].tokenId, BigInt(box.assets[1].amount));
    }

    // Set gift token ID from R7 if present
    if (registers.R7) {
      builder.setGiftTokenId(SConstant.from(registers.R7).data as Uint8Array);
    }

    return builder;
  };
}
