import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';

// Import box builders from the boxes package
import { GiftRedeemBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating failure transactions
 * This builder creates a transaction that:
 * 1. Takes an active raffle box and raffle details box as inputs
 * 2. Creates a gift redeem box for handling gift returns and ticket redemptions
 */
export class FailureTxBuilder {
  // Private fields for transaction configuration
  private activeRaffle?: Box<Amount>;
  private raffleDetails?: Box<Amount>;
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
   * Set the raffle details box input
   * @param raffleDetails - The raffle details box to spend
   * @returns this builder instance
   */
  setRaffleDetails = (raffleDetails: Box<Amount>): this => {
    this.raffleDetails = raffleDetails;
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
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the failure transaction
   * @returns ErgoUnsignedTransaction instance configured for failure
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create gift redeem box using fromActiveRaffleBox
    const giftRedeemBuilder = GiftRedeemBuilder.fromActiveRaffleBox(
      this.activeRaffle!,
    ).setCreationHeight(this.chainHeight!);

    const giftRedeemBox = giftRedeemBuilder.build();

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([this.activeRaffle!, this.raffleDetails!])
      .to([giftRedeemBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return transaction;
  };
}
