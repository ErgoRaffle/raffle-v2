import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';

// Import box builders from the boxes package
import { ActiveRaffleBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating donate transactions
 * This builder creates a transaction that:
 * 1. Takes an active raffle box and donator UTXOs as inputs
 * 2. Creates an updated active raffle box with donated tickets
 * 3. Sends change back to the donator
 */
export class DonateTxBuilder {
  // Private fields for transaction configuration
  private activeRaffle?: Box<Amount>;
  private donatorUtxos: Box<Amount>[] = [];
  private donatorErgoTree?: string;
  private donatorAddress?: string;
  private donationTicketCount?: bigint;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

  /**
   * Set the active raffle box input
   * @param activeRaffle - The active raffle box to spend
   * @returns this builder instance
   */
  setActiveRaffle = (activeRaffle: Box<Amount>): this => {
    this.activeRaffle = activeRaffle;
    return this;
  };

  /**
   * Set the donator UTXOs
   * @param utxos - Array of donator UTXOs
   * @returns this builder instance
   */
  setDonatorUtxos = (utxos: Box<Amount>[]): this => {
    this.donatorUtxos = utxos;
    return this;
  };

  /**
   * Add a single donator UTXO
   * @param utxo - Donator UTXO to add
   * @returns this builder instance
   */
  addDonatorUtxo = (utxo: Box<Amount>): this => {
    this.donatorUtxos.push(utxo);
    return this;
  };

  /**
   * Set the donator's address
   * @param address - Donator's address
   * @returns this builder instance
   */
  setDonatorAddress = (address: string): this => {
    this.donatorAddress = address;
    this.donatorErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the number of tickets to donate
   * @param count - Number of tickets to donate
   * @returns this builder instance
   */
  setDonationTicketCount = (count: bigint): this => {
    this.donationTicketCount = count;
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
    if (!this.activeRaffle) throw new Error('Active raffle box not set');
    if (this.donatorUtxos.length === 0)
      throw new Error('Donator UTXOs not set');
    if (!this.donatorErgoTree) throw new Error('Donator ErgoTree not set');
    if (!this.donatorAddress) throw new Error('Donator address not set');
    if (!this.donationTicketCount) throw new Error('Ticket count not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the donate transaction
   * @returns ErgoUnsignedTransaction instance configured for donate
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create unsigned input for active raffle box with context extension
    const inputActiveRaffle = new ErgoUnsignedInput(this.activeRaffle!);
    inputActiveRaffle.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.donatorErgoTree!, 'hex'))),
    });

    // Create updated active raffle box using fromBox
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(this.activeRaffle!)
      .setCreationHeight(this.chainHeight!)
      .donate(this.donationTicketCount!); // This will update ticket counts and value

    const updatedActiveRaffleBox = activeRaffleBuilder.build();

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([inputActiveRaffle, ...this.donatorUtxos])
      .to([updatedActiveRaffleBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.donatorAddress!)
      .build();

    return transaction;
  };
}
