import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  OutputBuilder,
} from '@fleet-sdk/core';

/**
 * Builder class for creating safe withdraw transactions
 * This builder creates a transaction that:
 * 1. Takes a safe pay box as input
 * 2. Creates a custom output box for the receiver with all funds and tokens
 */
export class SafeWithdrawTxBuilder {
  private safePay?: Box<Amount>;
  private receiverAddress?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

  /**
   * Set the safe pay box input
   * @param box - The safe pay box to spend
   * @returns this builder instance
   */
  setSafePay = (box: Box<Amount>): this => {
    this.safePay = box;
    return this;
  };

  /**
   * Set the receiver address
   * @param address - Address to receive the funds
   * @returns this builder instance
   */
  setReceiverAddress = (address: string): this => {
    this.receiverAddress = address;
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
    if (!this.safePay) throw new Error('Safe pay box not set');
    if (!this.receiverAddress) throw new Error('Receiver address not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the safe withdraw transaction
   * @returns ErgoUnsignedTransaction instance configured for safe withdraw
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create custom output box for receiver with all funds and tokens
    const receiverBox = new OutputBuilder(
      BigInt(this.safePay!.value) - this.txFee!,
      this.receiverAddress!,
    ).addTokens(
      this.safePay!.assets.map((asset) => ({
        tokenId: asset.tokenId,
        amount: BigInt(asset.amount),
      })),
    );

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.safePay!])
      .to([receiverBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
