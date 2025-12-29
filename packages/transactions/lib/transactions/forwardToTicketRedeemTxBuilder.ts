import { TicketRedeemBuilder } from '@ergo-raffle/boxes';
import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';

/**
 * Builder class for creating forward to ticket redeem transactions
 * This builder creates a transaction that:
 * 1. Takes a gift redeem box as input
 * 2. Creates a ticket redeem output box for ticket redemptions
 */
export class ForwardToTicketRedeemTxBuilder {
  private giftRedeem?: Box<Amount>;
  private chainHeight?: number;
  private txFee?: bigint;

  /**
   * Set the gift redeem box input
   * @param box - The gift redeem box to spend
   * @returns this builder instance
   */
  setGiftRedeem = (box: Box<Amount>): this => {
    this.giftRedeem = box;
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
    if (!this.giftRedeem) throw new Error('GiftRedeem box not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the forward to ticket redeem transaction
   * @returns ErgoUnsignedTransaction instance configured for forward to ticket redeem
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create ticket redeem output box using fromBox if available, otherwise set required fields
    const ticketRedeemBuilder = TicketRedeemBuilder.fromGiftRedeemBox(
      this.giftRedeem!,
    )
      .setValue(BigInt(this.giftRedeem!.value) - this.txFee!)
      .setCreationHeight(this.chainHeight!);
    const ticketRedeemBox = ticketRedeemBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.giftRedeem!])
      .to([ticketRedeemBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
