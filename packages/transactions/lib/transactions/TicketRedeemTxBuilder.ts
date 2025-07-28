import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
} from '@fleet-sdk/core';

import { TicketRedeemBuilder } from '@ergo-raffle/boxes';
import { SafePayBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating ticket redeem transactions
 * This builder creates a transaction that:
 * 1. Takes a ticket redeem box and ticket box as inputs
 * 2. Creates an updated ticket redeem box with redeemed tickets
 * 3. Creates a safe pay box for the redeemed donation
 */
export class TicketRedeemTxBuilder {
  private ticketRedeem?: Box<Amount>;
  private ticket?: Box<Amount>;
  private donatorErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;
  private ticketCount?: bigint;

  /**
   * Set the ticket redeem box input
   * @param box - The ticket redeem box to spend
   * @returns this builder instance
   */
  setTicketRedeem = (box: Box<Amount>): this => {
    this.ticketRedeem = box;
    return this;
  };

  /**
   * Set the ticket box input
   * @param box - The ticket box to spend
   * @returns this builder instance
   */
  setTicket = (box: Box<Amount>): this => {
    this.ticket = box;
    this.ticketCount = BigInt(box.assets[0].amount);
    return this;
  };

  /**
   * Set the donator's ErgoTree
   * @param ergoTree - Donator's ErgoTree
   * @returns this builder instance
   */
  setDonatorErgoTree = (ergoTree: string): this => {
    this.donatorErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the chain height
   * @param height - Current chain height
   * @returns this builder instance
   */
  setChainHeight = (height: number): this => {
    this.chainHeight = height;
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
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.ticketRedeem) throw new Error('Ticket redeem box not set');
    if (!this.ticket) throw new Error('Ticket box not set');
    if (!this.donatorErgoTree) throw new Error('Donator ErgoTree not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the ticket redeem transaction
   * @returns ErgoUnsignedTransaction instance configured for ticket redeem
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for ticket with context extension
    const inputTicket = new ErgoUnsignedInput(this.ticket!);
    inputTicket.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.donatorErgoTree!, 'hex'))),
    });

    // Create updated ticket redeem box using fromBox
    const ticketRedeemBuilder = TicketRedeemBuilder.fromBox(this.ticketRedeem!)
      .setCreationHeight(this.chainHeight!)
      .redeemTickets(this.ticketCount!);
    const updatedTicketRedeemBox = ticketRedeemBuilder.build();

    // Create safe pay box for redeemed donation with tokens
    const safePayBuilder = new SafePayBuilder()
      .setCreationHeight(this.chainHeight!)
      .setReceiverErgoTree(this.donatorErgoTree!)
      .setTxFee(this.txFee!);
    // Determine if this is a token goal raffle
    const isTokenGoal = this.ticketRedeem!.assets.length > 2;
    if (isTokenGoal) {
      // For token goal raffles, return the collecting tokens to the donator
      safePayBuilder.setValue(BigInt(this.ticket!.value) - this.txFee!);
      safePayBuilder.setTokens([
        {
          tokenId: this.ticketRedeem!.assets[2].tokenId,
          amount: this.ticketCount! * ticketRedeemBuilder.getTicketPrice(),
        },
      ]);
    } else {
      safePayBuilder.setValue(
        BigInt(this.ticket!.value) -
          this.txFee! +
          ticketRedeemBuilder.getTicketPrice() * this.ticketCount!,
      );
    }
    const safePayBox = safePayBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.ticketRedeem!, inputTicket])
      .to([updatedTicketRedeemBox, safePayBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
