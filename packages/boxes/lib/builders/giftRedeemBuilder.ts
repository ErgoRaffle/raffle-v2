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

/**
 * Builder class for creating Gift Redeem boxes in the ErgoRaffle protocol
 * Gift Redeem box represents a gift that is being redeemed
 *
 * Registers:
 *   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
 *   R5[Int]: WinnersCount
 *   R6[Int]: Step
 * Tokens:
 *   0: RaffleLicense
 *   1: Ticket
 *   2: CollectingToken (if token-goal raffle)
 */
export class GiftRedeemBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private totalSoldTickets?: bigint;
  private ticketPrice?: bigint;
  private txFee?: bigint;
  private winnersCount?: number;
  private step?: number;
  private ticketTokenId?: string;
  private ticketTokenAmount?: bigint;
  private collectingTokenId?: string;
  private collectingTokenAmount?: bigint;

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
   * Set the total number of sold tickets
   * @param count - Total sold tickets count
   * @returns this builder instance
   */
  setTotalSoldTickets = (count: bigint): this => {
    this.totalSoldTickets = count;
    return this;
  };

  /**
   * Set the ticket price
   * @param price - Price in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
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
   * Set the number of winners
   * @param count - Winners count
   * @returns this builder instance
   */
  setWinnersCount = (count: number): this => {
    this.winnersCount = count;
    return this;
  };

  /**
   * Get the number of winners
   * @returns Winners count
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
   * Set the ticket token
   * @param tokenId - Ticket token ID
   * @param amount - Number of ticket tokens
   * @returns this builder instance
   */
  setTicketToken = (tokenId: string, amount: bigint): this => {
    this.ticketTokenId = tokenId;
    this.ticketTokenAmount = amount;
    return this;
  };

  /**
   * Set the collecting token
   * @param tokenId - Collecting token ID
   * @param amount - Number of collecting tokens
   * @returns this builder instance
   */
  setCollectingToken = (tokenId: string, amount: bigint): this => {
    this.collectingTokenId = tokenId;
    this.collectingTokenAmount = amount;
    return this;
  };

  /**
   * Get the total sold tickets
   * @returns Total sold tickets count
   */
  getTotalSoldTickets = (): bigint => {
    return this.totalSoldTickets!;
  };

  /**
   * Get the ticket price
   * @returns Ticket price in nanoERG/CollectingToken
   */
  getTicketPrice = (): bigint => {
    return this.ticketPrice!;
  };

  /**
   * Get the transaction fee
   * @returns Transaction fee amount in nanoERG
   */
  getTxFee = (): bigint => {
    return this.txFee!;
  };

  /**
   * Get the ticket token ID
   * @returns Ticket token ID
   */
  getTicketTokenId = (): string => {
    return this.ticketTokenId!;
  };

  /**
   * Get the ticket token amount
   * @returns Ticket token amount
   */
  getTicketTokenAmount = (): bigint => {
    return this.ticketTokenAmount!;
  };

  /**
   * Get the collecting token ID
   * @returns Collecting token ID or undefined if not set
   */
  getCollectingTokenId = (): string | undefined => {
    return this.collectingTokenId;
  };

  /**
   * Get the collecting token amount
   * @returns Collecting token amount or undefined if not set
   */
  getCollectingTokenAmount = (): bigint | undefined => {
    return this.collectingTokenAmount;
  };

  /**
   * Get the current step
   * @returns Current step number
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
    if (this.totalSoldTickets === undefined)
      throw new Error('Total sold tickets not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnersCount) throw new Error('Winners count not set');
    if (this.step === undefined) throw new Error('Step not set');
    if (!this.ticketTokenId) throw new Error('Ticket token not set');
    if (!this.ticketTokenAmount) throw new Error('Ticket token amount not set');
  };

  /**
   * Build an output box for the gift redeem contract
   * Contains gift redemption information
   * @returns OutputBuilder instance configured for the gift redeem box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    const tokens = [
      { tokenId: raffleInfo.tokens.raffleLicense, amount: 1n },
      { tokenId: this.ticketTokenId!, amount: this.ticketTokenAmount! },
    ];
    if (this.collectingTokenId && this.collectingTokenAmount) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenAmount,
      });
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.giftRedeem).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.totalSoldTickets!,
          this.ticketPrice!,
          this.txFee!,
        ]).toHex(),
        R5: SInt(this.winnersCount!).toHex(),
        R6: SInt(this.step!).toHex(),
      });
  };

  /**
   * Remove a winner from the gift redeem box
   * Updates the box state by incrementing the step and adding the winner's ticket
   * @returns this builder instance
   * @throws Error if required parameters are not set
   */
  removeWinner = (): this => {
    if (!this.value) throw new Error('Value not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.step) throw new Error('Step not set');
    if (!this.ticketTokenId) throw new Error('Ticket token not set');
    if (!this.ticketTokenAmount) throw new Error('Ticket token amount not set');

    // Winner's value is 4 times the tx fee
    const winnerValue = this.txFee * 4n;

    // Update box value by adding winner's value and subtracting tx fee
    this.setValue(this.value + winnerValue - this.txFee);

    // Increment step
    this.setStep(this.step + 1);

    // Add winner's ticket to the box
    this.setTicketToken(this.ticketTokenId, this.ticketTokenAmount + 1n);

    return this;
  };

  /**
   * Create a GiftRedeemBuilder instance from an existing box
   * @param box - Existing gift redeem box to copy configuration from
   * @returns New GiftRedeemBuilder instance with copied configuration
   * @throws Error if box structure doesn't match gift redeem box requirements
   */
  static fromBox = (box: Box<Amount>): GiftRedeemBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid gift redeem box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6) {
      throw new Error('Invalid gift redeem box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid gift redeem box: invalid R4 register format');
    }

    const builder = new GiftRedeemBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setTotalSoldTickets(r4Data[0])
      .setTicketPrice(r4Data[1])
      .setTxFee(r4Data[2])
      .setWinnersCount(SConstant.from(registers.R5).data as number)
      .setStep(SConstant.from(registers.R6).data as number)
      .setTicketToken(box.assets[1].tokenId, BigInt(box.assets[1].amount));

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder.setCollectingToken(
        box.assets[2].tokenId,
        BigInt(box.assets[2].amount),
      );
    }

    return builder;
  };

  /**
   * Create a GiftRedeemBuilder instance from an active raffle box
   * @param box - Active raffle box to copy configuration from
   * @returns New GiftRedeemBuilder instance with copied configuration
   * @throws Error if box structure doesn't match active raffle box requirements
   */
  static fromActiveRaffleBox = (box: Box<Amount>): GiftRedeemBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid active raffle box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6 || !registers.R7) {
      throw new Error('Invalid active raffle box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 7) {
      throw new Error('Invalid active raffle box: invalid R4 register format');
    }

    const builder = new GiftRedeemBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setTotalSoldTickets(SConstant.from(registers.R7).data as bigint)
      .setTicketPrice(r4Data[3])
      .setTxFee(r4Data[6])
      .setWinnersCount(SConstant.from(registers.R6).data as number)
      .setStep(1)
      .setTicketToken(box.assets[1].tokenId, BigInt(box.assets[1].amount) + 1n);

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder.setCollectingToken(
        box.assets[2].tokenId,
        BigInt(box.assets[2].amount),
      );
    }

    return builder;
  };
}
