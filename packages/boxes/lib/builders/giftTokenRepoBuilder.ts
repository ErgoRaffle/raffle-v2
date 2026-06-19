import {
  Box,
  OutputBuilder,
  Amount,
  SColl,
  SByte,
  SLong,
  SInt,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';

import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating Gift Token Repository boxes in the ErgoRaffle protocol
 * Gift Token Repository box holds the gift tokens for distribution
 *
 * Registers:
 *   R4[Coll[Byte]]: TokenName
 *   R5[Coll[Byte]]: TokenDescription
 *   R6[Coll[Byte]]: Decimals (0)
 *   R7[Coll[Long]]: [GiftTokenCount, txFee]
 *   R8[Coll[Byte]]: TicketId
 *   R9[Coll[Int]]: [WinnersCount, Step]
 * Tokens:
 *   0: GiftToken
 */
export class GiftTokenRepoBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private giftTokenId?: string;
  private giftTokenAmount?: bigint;
  private tokenName?: Uint8Array;
  private tokenDescription?: Uint8Array;
  private decimals?: Uint8Array;
  private giftTokensPerWinner?: bigint;
  private txFee?: bigint;
  private ticketId?: Uint8Array;
  private winnersCount?: number;
  private step?: number;

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
   * Set the gift token ID
   * @param tokenId - The gift token ID
   * @returns this builder instance
   */
  setGiftTokenId = (tokenId: string): this => {
    this.giftTokenId = tokenId;
    return this;
  };

  /**
   * Set the gift token amount
   * @param amount - Number of gift tokens
   * @returns this builder instance
   */
  setGiftTokenAmount = (amount: bigint): this => {
    this.giftTokenAmount = amount;
    return this;
  };

  /**
   * Set the token name
   * @param name - Token name as byte array
   * @returns this builder instance
   */
  setTokenName = (name: Uint8Array): this => {
    this.tokenName = name;
    return this;
  };

  /**
   * Set the token description
   * @param description - Token description as byte array
   * @returns this builder instance
   */
  setTokenDescription = (description: Uint8Array): this => {
    this.tokenDescription = description;
    return this;
  };

  /**
   * Set the token decimals (should be 0)
   * @param decimals - Token decimals as byte array
   * @returns this builder instance
   */
  setDecimals = (decimals: Uint8Array): this => {
    this.decimals = decimals;
    return this;
  };

  /**
   * Set the gift tokens per winner
   * @param count - Number of gift tokens per winner
   * @returns this builder instance
   */
  setGiftTokensPerWinner = (count: bigint): this => {
    this.giftTokensPerWinner = count;
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
   * Set the ticket ID
   * @param id - Ticket ID as byte array
   * @returns this builder instance
   */
  setTicketId = (id: string): this => {
    this.ticketId = Buffer.from(id, 'hex');
    return this;
  };

  /**
   * Get the ticket ID
   * @returns Ticket ID as hex string
   */
  getTicketId = (): string => {
    return Buffer.from(this.ticketId!).toString('hex');
  };

  /**
   * Set the number of winners
   * @param count - Number of winners
   * @returns this builder instance
   */
  setWinnersCount = (count: number): this => {
    this.winnersCount = count;
    return this;
  };

  /**
   * Get the number of winners
   * @returns Number of winners
   */
  getWinnersCount = (): number => {
    return this.winnersCount!;
  };

  /**
   * Set the current step
   * @param step - Current step number
   * @returns this builder instance
   */
  setStep = (step: number): this => {
    this.step = step;
    return this;
  };

  /**
   * Get the current step
   * @returns Current step
   */
  getStep = (): number => {
    return this.step!;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.giftTokenId) throw new Error('Gift token ID not set');
    if (!this.giftTokenAmount) throw new Error('Gift token amount not set');
    if (!this.tokenName) throw new Error('Token name not set');
    if (!this.tokenDescription) throw new Error('Token description not set');
    if (!this.decimals) throw new Error('Decimals not set');
    if (!this.giftTokensPerWinner)
      throw new Error('Gift tokens per winner not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.ticketId) throw new Error('Ticket ID not set');
    if (!this.winnersCount) throw new Error('Winners count not set');
    if (this.step === undefined) throw new Error('Step not set');
  };

  /**
   * Reduce gift tokens for a winner box
   * Decreases gift token amount by giftTokensPerWinner and increments step
   * @returns this builder instance
   * @throws Error if required parameters are not set or insufficient tokens
   */
  reduceGiftTokens = (): this => {
    if (!this.giftTokenAmount) {
      throw new Error('Gift token amount not set');
    }
    if (!this.giftTokensPerWinner) {
      throw new Error('Gift tokens per winner not set');
    }
    if (!this.step) {
      throw new Error('Step not set');
    }
    if (!this.winnersCount) {
      throw new Error('Winners count not set');
    }
    if (!this.txFee) {
      throw new Error('Transaction fee not set');
    }
    if (!this.value) {
      throw new Error('Box value not set');
    }
    if (this.giftTokenAmount < this.giftTokensPerWinner) {
      throw new Error('Insufficient gift tokens available');
    }
    if (this.step >= this.winnersCount) {
      throw new Error('All winners have received their gift tokens');
    }
    if (this.value < this.txFee) {
      throw new Error('Insufficient box value to cover transaction fee');
    }

    // Reduce gift token amount
    this.giftTokenAmount = this.giftTokenAmount - this.giftTokensPerWinner;

    // Increment step
    this.step = this.step + 1;

    // Reduce box value by txFee
    this.value = this.value - this.txFee;

    return this;
  };

  /**
   * Build an output box for the gift token repository contract
   * Contains gift tokens for distribution
   * @returns OutputBuilder instance configured for the gift token repository box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.giftTokenRepo).ergoTree,
      this.creationHeight!,
    )
      .addTokens([
        {
          tokenId: this.giftTokenId!,
          amount: this.giftTokenAmount!,
        },
      ])
      .setAdditionalRegisters({
        R4: SColl(SByte, Array.from(this.tokenName!)).toHex(),
        R5: SColl(SByte, Array.from(this.tokenDescription!)).toHex(),
        R6: SColl(SByte, Array.from(this.decimals!)).toHex(),
        R7: SColl(SLong, [this.giftTokensPerWinner!, this.txFee!]).toHex(),
        R8: SColl(SByte, Array.from(this.ticketId!)).toHex(),
        R9: SColl(SInt, [this.winnersCount!, this.step!]).toHex(),
      });
  };

  /**
   * Create a GiftTokenRepoBuilder instance from an existing box
   * @param box - Existing gift token repository box to copy configuration from
   * @returns New GiftTokenRepoBuilder instance with copied configuration
   * @throws Error if box structure doesn't match gift token repository box requirements
   */
  static fromBox = (box: Box<Amount>): GiftTokenRepoBuilder => {
    if (box.assets.length < 1) {
      throw new Error(
        'Invalid gift token repository box: missing required tokens',
      );
    }

    const registers = box.additionalRegisters;
    if (
      !registers.R4 ||
      !registers.R5 ||
      !registers.R6 ||
      !registers.R7 ||
      !registers.R8 ||
      !registers.R9
    ) {
      throw new Error(
        'Invalid gift token repository box: missing required registers',
      );
    }

    const r7Data = SConstant.from(registers.R7).data as bigint[];
    const r9Data = SConstant.from(registers.R9).data as number[];

    if (r7Data.length < 2) {
      throw new Error(
        'Invalid gift token repository box: invalid R7 register format',
      );
    }

    if (r9Data.length < 2) {
      throw new Error(
        'Invalid gift token repository box: invalid R9 register format',
      );
    }

    const builder = new GiftTokenRepoBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setGiftTokenId(box.assets[0].tokenId)
      .setGiftTokenAmount(BigInt(box.assets[0].amount))
      .setTokenName(SConstant.from(registers.R4).data as Uint8Array)
      .setTokenDescription(SConstant.from(registers.R5).data as Uint8Array)
      .setDecimals(SConstant.from(registers.R6).data as Uint8Array)
      .setGiftTokensPerWinner(r7Data[0])
      .setTxFee(r7Data[1])
      .setTicketId(
        Buffer.from(SConstant.from(registers.R8).data as Uint8Array).toString(
          'hex',
        ),
      )
      .setWinnersCount(r9Data[0])
      .setStep(r9Data[1]);

    return builder;
  };
}
