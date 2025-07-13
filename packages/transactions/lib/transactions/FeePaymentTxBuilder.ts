import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
} from '@fleet-sdk/core';
import { ActiveRaffleBuilder, SuccessRaffleBuilder } from '@ergo-raffle/boxes';
import { SafePayBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating fee payment transactions
 * This builder creates a transaction that:
 * 1. Takes an active raffle box and raffle details box as inputs
 * 2. Creates a success raffle box with calculated fees
 * 3. Creates service and implementer fee boxes with appropriate token distributions
 */
export class FeePaymentTxBuilder {
  private activeRaffle?: Box<Amount>;
  private raffleDetails?: Box<Amount>;
  private oracleBox?: Box<Amount>;
  private serviceErgoTree?: string;
  private implementerErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

  /**
   * Set the active raffle box input
   * @param box - The active raffle box to spend
   * @returns this builder instance
   */
  setActiveRaffle = (box: Box<Amount>): this => {
    this.activeRaffle = box;
    return this;
  };

  /**
   * Set the raffle details box input
   * @param box - The raffle details box to spend
   * @returns this builder instance
   */
  setRaffleDetails = (box: Box<Amount>): this => {
    this.raffleDetails = box;
    return this;
  };

  /**
   * Set the oracle box to use as data input
   * @param box - The oracle box to use as data input
   * @returns this builder instance
   */
  setOracleBox = (box: Box<Amount>): this => {
    this.oracleBox = box;
    return this;
  };

  /**
   * Set the service ErgoTree
   * @param ergoTree - Service ErgoTree
   * @returns this builder instance
   */
  setServiceErgoTree = (ergoTree: string): this => {
    this.serviceErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the implementer ErgoTree
   * @param ergoTree - Implementer ErgoTree
   * @returns this builder instance
   */
  setImplementerErgoTree = (ergoTree: string): this => {
    this.implementerErgoTree = ergoTree;
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
    if (!this.raffleDetails) throw new Error('Raffle details box not set');
    if (!this.oracleBox) throw new Error('Oracle box not set');
    if (!this.serviceErgoTree) throw new Error('Service ErgoTree not set');
    if (!this.implementerErgoTree)
      throw new Error('Implementer ErgoTree not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Determine if this is an ERG goal raffle based on asset count
   * @returns true if ERG goal raffle, false if token goal raffle
   */
  private isErgGoal = (): boolean => {
    return this.activeRaffle!.assets.length <= 2;
  };

  /**
   * Calculate the share of the fee
   * @param percent - Fee percentage (in basis points)
   * @returns Share of the fee
   */
  private calculateShare = (percent: bigint): bigint => {
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(this.activeRaffle!);
    const totalRaised =
      activeRaffleBuilder.getTotalSoldTickets() *
      activeRaffleBuilder.getTicketPrice();
    return (totalRaised * percent) / 1000n;
  };

  /**
   * Add the share of the fee to the box
   * @param builder - SafePayBuilder instance
   * @param percent - Fee percentage (in basis points)
   */
  private addShareToBox = (builder: SafePayBuilder, percent: bigint): void => {
    if (this.isErgGoal()) {
      builder.setValue(this.calculateShare(percent) + 2n * this.txFee!);
    } else {
      builder.setValue(2n * this.txFee!);
      builder.setTokens([
        {
          tokenId: this.activeRaffle!.assets[2].tokenId,
          amount: this.calculateShare(percent),
        },
      ]);
    }
  };

  /**
   * Build the fee payment transaction
   * @returns ErgoUnsignedTransaction instance configured for fee payment
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for active raffle with context extension
    const inputActiveRaffle = new ErgoUnsignedInput(this.activeRaffle!);
    inputActiveRaffle.setContextExtension({
      0: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.serviceErgoTree!, 'hex')),
        Array.from(Buffer.from(this.implementerErgoTree!, 'hex')),
      ]),
    });

    // Get fee percentages from active raffle box
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(this.activeRaffle!);
    const serviceFeePercent = activeRaffleBuilder.getServiceFeePercent();
    const implementerFeePercent =
      activeRaffleBuilder.getImplementerFeePercent();

    // Create success raffle box using fromActiveRaffleBox with oracle seed
    const successRaffleBuilder = SuccessRaffleBuilder.fromActiveRaffleBox(
      this.activeRaffle!,
    )
      .setCreationHeight(this.chainHeight!)
      .setSeed(Buffer.from(this.oracleBox!.boxId, 'hex'));
    const successRaffleBox = successRaffleBuilder.build();

    // Create service fee box with appropriate tokens
    const serviceFeeBuilder = new SafePayBuilder()
      .setCreationHeight(this.chainHeight!)
      .setReceiverErgoTree(this.serviceErgoTree!)
      .setTxFee(this.txFee!);
    this.addShareToBox(serviceFeeBuilder, serviceFeePercent);
    const serviceFeeBox = serviceFeeBuilder.build();

    // Create implementer fee box with appropriate tokens
    const implementerFeeBuilder = new SafePayBuilder()
      .setCreationHeight(this.chainHeight!)
      .setReceiverErgoTree(this.implementerErgoTree!)
      .setTxFee(this.txFee!);
    this.addShareToBox(implementerFeeBuilder, implementerFeePercent);

    const implementerFeeBox = implementerFeeBuilder.build();

    // Build the transaction with oracle box as data input
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([inputActiveRaffle, this.raffleDetails!])
      .to([successRaffleBox, serviceFeeBox, implementerFeeBox])
      .withDataFrom([this.oracleBox!])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
