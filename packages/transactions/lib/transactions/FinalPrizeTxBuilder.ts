import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
} from '@fleet-sdk/core';
import { SafePayBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating final prize transactions
 * This builder creates a transaction that:
 * 1. Takes a winner prize box as input
 * 2. Creates a safe pay box for the final prize (ERG and tokens)
 * 3. Burns the winner and ticket tokens
 */
export class FinalPrizeTxBuilder {
  private winnerPrize?: Box<Amount>;
  private ticket?: Box<Amount>;
  private winnerErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

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
    if (!this.ticket) throw new Error('Ticket box not set');
    if (!this.winnerErgoTree) throw new Error('Winner ErgoTree not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the final prize transaction
   * @returns ErgoUnsignedTransaction instance configured for final prize
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for winner prize with context extension
    const inputWinnerPrizeBox = new ErgoUnsignedInput(this.winnerPrize!);
    inputWinnerPrizeBox.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.winnerErgoTree!, 'hex'))),
    });

    const safePayBuilder = new SafePayBuilder()
      .setValue(BigInt(this.winnerPrize!.value) - this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setTxFee(this.txFee!)
      .setTokens(this.winnerPrize!.assets.slice(2));
    const finalPrizeSpendingBox = safePayBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([inputWinnerPrizeBox])
      .to([finalPrizeSpendingBox])
      .withDataFrom([this.ticket!])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .burnTokens(this.winnerPrize!.assets.slice(0, 2))
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
