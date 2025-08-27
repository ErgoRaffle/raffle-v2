import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SLong,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { SuccessRaffleBuilder } from '@ergo-raffle/boxes';
import { WinnerPrizeBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating prize creation transactions
 * This builder creates a transaction that:
 * 1. Takes a success raffle box and winner box as inputs
 * 2. Creates an updated success raffle box with winner information
 * 3. Creates a winner prize box for the selected winner
 */
export class PrizeCreationTxBuilder {
  private successRaffle?: Box<Amount>;
  private winner?: Box<Amount>;
  private winnerTicketIndex?: bigint;
  private winnerIndexList?: bigint[];
  private chainHeight?: number;
  private txFee?: bigint;

  /**
   * Set the success raffle box input
   * @param box - The success raffle box to spend
   * @returns this builder instance
   */
  setSuccessRaffle = (box: Box<Amount>): this => {
    this.successRaffle = box;
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
   * Set the winner ticket index
   * @param index - The ticket index of the winner
   * @returns this builder instance
   */
  setWinnerTicketIndex = (index: bigint): this => {
    this.winnerTicketIndex = index;
    return this;
  };

  /**
   * Set the winner index list
   * @param list - List of winner indices
   * @returns this builder instance
   */
  setWinnerIndexList = (list: bigint[]): this => {
    this.winnerIndexList = list;
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
    if (!this.successRaffle) throw new Error('Success raffle box not set');
    if (!this.winner) throw new Error('Winner box not set');
    if (this.winnerTicketIndex == undefined)
      throw new Error('Winner ticket index not set');
    if (!this.winnerIndexList) throw new Error('Winner index list not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the prize creation transaction
   * @returns ErgoUnsignedTransaction instance configured for prize creation
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for success raffle with context extension
    const inputSuccessRaffle = new ErgoUnsignedInput(this.successRaffle!);
    inputSuccessRaffle.setContextExtension({
      0: SColl(SLong, [...this.winnerIndexList!]),
      1: SLong(this.winnerTicketIndex!),
    });

    // Create winner prize box using fromWinnerAndSuccessRaffleBox
    const winnerPrizeBuilder = WinnerPrizeBuilder.fromWinnerAndSuccessRaffleBox(
      this.winner!,
      this.successRaffle!,
    )
      .setWinnerTicketIndex(this.winnerTicketIndex!)
      .setCreationHeight(this.chainHeight!);
    const winnerPrizeBox = winnerPrizeBuilder.build();

    // Create updated success raffle box using fromBox
    const successRaffleBuilder = SuccessRaffleBuilder.fromBox(
      this.successRaffle!,
    )
      .subtractPrize(winnerPrizeBuilder.getPrizeAmount())
      .setSelectedWinners([...this.winnerIndexList!, this.winnerTicketIndex!])
      .setCreationHeight(this.chainHeight!);
    // Update seed for the next winner (next seed is created by blake2b256 of the current seed)
    successRaffleBuilder.setSeed(blake2b256(successRaffleBuilder.getSeed()));
    const updatedSuccessRaffleBox = successRaffleBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([inputSuccessRaffle, this.winner!])
      .to([updatedSuccessRaffleBox, winnerPrizeBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
