import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
} from '@fleet-sdk/core';
import { WinnerPrizeBuilder } from '@ergo-raffle/boxes';
import { SafePayBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating gift unwrap transactions
 * This builder creates a transaction that:
 * 1. Takes a winner prize box and gift for winner box as inputs
 * 2. Creates an updated winner prize box with unwrapped gift count
 * 3. Creates a safe pay box for the unwrapped gift tokens
 */
export class GiftUnwrapTxBuilder {
  private winnerPrize?: Box<Amount>;
  private giftForWinner?: Box<Amount>;
  private ticket?: Box<Amount>;
  private winnerErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  /**
   * Set the winner prize box input
   * @param box - The winner prize box to spend
   * @returns this builder instance
   */
  setWinnerPrize = (box: Box<Amount>): this => {
    this.winnerPrize = box;
    return this;
  };

  /**
   * Set the gift for winner box input
   * @param box - The gift for winner box to spend
   * @returns this builder instance
   */
  setGiftForWinner = (box: Box<Amount>): this => {
    this.giftForWinner = box;
    return this;
  };

  /**
   * Set the ticket box for data input
   * @param box - The ticket box to use as data input
   * @returns this builder instance
   */
  setTicket = (box: Box<Amount>): this => {
    this.ticket = box;
    return this;
  };

  /**
   * Set the winner's ErgoTree
   * @param ergoTree - Winner's ErgoTree
   * @returns this builder instance
   */
  setWinnerErgoTree = (ergoTree: string): this => {
    this.winnerErgoTree = ergoTree;
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
    if (!this.winnerPrize) throw new Error('Winner prize box not set');
    if (!this.giftForWinner) throw new Error('Gift for winner box not set');
    if (!this.ticket) throw new Error('Ticket box not set');
    if (!this.winnerErgoTree) throw new Error('Winner ErgoTree not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the gift unwrap transaction
   * @returns ErgoUnsignedTransaction instance configured for gift unwrap
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for gift for winner with context extension
    const inputGiftBox = new ErgoUnsignedInput(this.giftForWinner!);
    inputGiftBox.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.winnerErgoTree!, 'hex'))),
    });

    // Create updated winner prize box using fromBox
    const winnerPrizeBuilder = WinnerPrizeBuilder.fromBox(this.winnerPrize!)
      .unwrapGift()
      .setCreationHeight(this.chainHeight!);
    const updatedWinnerPrizeBox = winnerPrizeBuilder.build();

    // Create safe pay box for unwrapped gift tokens
    const giftTokens = this.giftForWinner!.assets.slice(1);
    const safePayBuilder = new SafePayBuilder()
      .setValue(BigInt(this.giftForWinner!.value) - this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setTxFee(this.txFee!)
      .setReceiverErgoTree(this.winnerErgoTree!)
      .setTokens(
        giftTokens.map((token) => ({
          tokenId: token.tokenId,
          amount: BigInt(token.amount),
        })),
      );
    const unwrappedGiftBox = safePayBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.winnerPrize!, inputGiftBox])
      .to([updatedWinnerPrizeBox, unwrappedGiftBox])
      .withDataFrom([this.ticket!])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
