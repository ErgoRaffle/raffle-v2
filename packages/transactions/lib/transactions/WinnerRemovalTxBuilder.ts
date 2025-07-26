import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';

import { GiftRedeemBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating winner removal transactions
 * This builder creates a transaction that:
 * 1. Takes a gift redeem box and winner box as inputs
 * 2. Creates an updated gift redeem box (removes winner, increments step)
 * 3. Burns the winner's ticket token
 */
export class WinnerRemovalTxBuilder {
  private giftRedeem?: Box<Amount>;
  private winner?: Box<Amount>;
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
   * Set the winner box input
   * @param box - The winner box to spend
   * @returns this builder instance
   */
  setWinner = (box: Box<Amount>): this => {
    this.winner = box;
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
    if (!this.winner) throw new Error('Winner box not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the winner removal transaction
   * @returns ErgoUnsignedTransaction instance configured for winner removal
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Update giftRedeem box using fromBox and removeWinner logic
    const giftRedeemBuilder = GiftRedeemBuilder.fromBox(this.giftRedeem!)
      .setCreationHeight(this.chainHeight!)
      .removeWinner();
    const updatedGiftRedeemBox = giftRedeemBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.giftRedeem!, this.winner!])
      .to([updatedGiftRedeemBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .burnTokens(this.winner!.assets[1]!)
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
