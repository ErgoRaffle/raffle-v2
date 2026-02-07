import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';

import { WinnerBuilder } from '@ergo-raffle/boxes';
import { GiftTokenRepoBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating gift token receipt transactions
 * This builder creates a transaction that:
 * 1. Takes a winner box and gift token repository box as inputs
 * 2. Creates an updated winner box with gift tokens
 * 3. Creates an updated gift token repository box (if not the last step)
 */
export class GiftTokenReceiptTxBuilder {
  // Private fields for transaction configuration
  private winner?: Box<Amount>;
  private giftTokenRepo?: Box<Amount>;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

  /**
   * Set the winner box input
   * @param winner - The winner box to spend
   * @returns this builder instance
   */
  setWinner = (winner: Box<Amount>): this => {
    this.winner = winner;
    return this;
  };

  /**
   * Set the gift token repository box input
   * @param giftTokenRepo - The gift token repository box to spend
   * @returns this builder instance
   */
  setGiftTokenRepo = (giftTokenRepo: Box<Amount>): this => {
    this.giftTokenRepo = giftTokenRepo;
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
    if (!this.winner) throw new Error('Winner box not set');
    if (!this.giftTokenRepo)
      throw new Error('Gift token repository box not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the gift token receipt transaction
   * @returns ErgoUnsignedTransaction instance configured for gift token receipt
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Get gift token ID from gift token repo box
    const giftTokenId = this.giftTokenRepo!.assets[0].tokenId;

    // Create updated winner box using fromBox and add gift tokens
    const winnerBuilder = WinnerBuilder.fromBox(this.winner!)
      .setCreationHeight(this.chainHeight!)
      .receiveGiftTokens(
        giftTokenId,
        BigInt(raffleInfo.constants.giftTokenCount),
      );

    const updatedWinnerBox = winnerBuilder.build();

    // Create outputs array starting with the updated winner box
    const outputs = [updatedWinnerBox];

    // If not the last step, create updated gift token repository box
    const giftTokenRepoBuilder = GiftTokenRepoBuilder.fromBox(
      this.giftTokenRepo!,
    );
    if (
      giftTokenRepoBuilder.getStep() < giftTokenRepoBuilder.getWinnersCount()
    ) {
      giftTokenRepoBuilder
        .setCreationHeight(this.chainHeight!)
        .reduceGiftTokens(); // This will reduce gift tokens and update step

      const updatedGiftTokenRepoBox = giftTokenRepoBuilder.build();
      outputs.push(updatedGiftTokenRepoBox);
    }

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([this.winner!, this.giftTokenRepo!])
      .to(outputs)
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return transaction;
  };
}
