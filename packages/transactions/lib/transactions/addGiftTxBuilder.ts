import { WinnerBuilder } from '@ergo-raffle/boxes';
import { GiftBuilder } from '@ergo-raffle/boxes';
import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
  TokenAmount,
  ErgoAddress,
} from '@fleet-sdk/core';

/**
 * Builder class for creating add gift transactions
 * This builder creates a transaction that:
 * 1. Takes a winner box and gift giver UTXOs as inputs
 * 2. Creates an updated winner box with reduced gift tokens
 * 3. Creates a gift box with the gift tokens
 */
export class AddGiftTxBuilder {
  private winner?: Box<Amount>;
  private giftGiverUtxos: Box<Amount>[] = [];
  private giftGiverErgoTree?: string;
  private giftGiverAddress?: string;
  private giftValue?: bigint;
  private chainHeight?: number;
  private txFee?: bigint;
  private giftTokens?: TokenAmount<bigint>[];

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
   * Set the gift giver UTXOs
   * @param utxos - Array of gift giver UTXOs
   * @returns this builder instance
   */
  setGiftGiverUtxos = (utxos: Box<Amount>[]): this => {
    this.giftGiverUtxos = utxos;
    return this;
  };

  /**
   * Add a single gift giver UTXO
   * @param utxo - Gift giver UTXO to add
   * @returns this builder instance
   */
  addGiftGiverUtxo = (utxo: Box<Amount>): this => {
    this.giftGiverUtxos.push(utxo);
    return this;
  };

  /**
   * Set the gift giver's address
   * @param address - Gift giver's address
   * @returns this builder instance
   */
  setGiftGiverAddress = (address: string): this => {
    this.giftGiverAddress = address;
    this.giftGiverErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the gift box value
   * @param value - Gift box value in nanoERG
   * @returns this builder instance
   */
  setGiftValue = (value: bigint): this => {
    this.giftValue = value;
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
   * Set the gift tokens to include in the gift box
   * @param tokens - Array of gift tokens
   * @returns this builder instance
   */
  setGiftTokens = (tokens: TokenAmount<bigint>[]): this => {
    this.giftTokens = tokens;
    return this;
  };

  /**
   * Add a single gift token
   * @param token - Gift token to add
   * @returns this builder instance
   */
  addGiftToken = (token: TokenAmount<bigint>): this => {
    this.giftTokens?.push(token);
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.winner) throw new Error('Winner box not set');
    if (this.giftGiverUtxos.length === 0)
      throw new Error('Gift giver UTXOs not set');
    if (!this.giftGiverErgoTree) throw new Error('Gift giver ErgoTree not set');
    if (!this.giftGiverAddress) throw new Error('Gift giver address not set');
    if (!this.giftValue) throw new Error('Gift value not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the add gift transaction
   * @returns ErgoUnsignedTransaction instance configured for add gift
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create unsigned input for winner box with context extension
    const inputWinner = new ErgoUnsignedInput(this.winner!);
    inputWinner.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.giftGiverErgoTree!, 'hex'))),
    });

    // Create updated winner box using fromBox
    const winnerBuilder = WinnerBuilder.fromBox(this.winner!)
      .setCreationHeight(this.chainHeight!)
      .addGift(); // This will reduce gift tokens and increase gift count

    const updatedWinnerBox = winnerBuilder.build();

    // Create gift box using giftForWinner method
    const giftBuilder = GiftBuilder.giftForWinner(this.winner!)
      .setDonatorAddress(this.giftGiverAddress!)
      .setCreationHeight(this.chainHeight!)
      .setValue(this.giftValue!);

    // Add gift tokens if provided
    if (this.giftTokens) {
      giftBuilder.addGifts(this.giftTokens);
    }

    const giftBox = giftBuilder.build();

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([inputWinner, ...this.giftGiverUtxos])
      .to([updatedWinnerBox, giftBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.giftGiverAddress!)
      .build();

    return transaction;
  };
}
