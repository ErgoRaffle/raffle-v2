import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  ErgoUnsignedInput,
  SColl,
  SByte,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { WinnerBuilder } from '@ergo-raffle/boxes';
import { SafePayBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating gift return transactions
 * This builder creates a transaction that:
 * 1. Takes a gift redeem box, winner box, and gift box as inputs
 * 2. Creates an updated winner box with returned gift
 * 3. Creates a safe pay box for the redeemed gift
 */
export class GiftReturnTxBuilder {
  private giftRedeem?: Box<Amount>;
  private winner?: Box<Amount>;
  private gift?: Box<Amount>;
  private giftGiverErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  constructor() {}

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
   * Set the gift box input
   * @param box - The gift box to spend
   * @returns this builder instance
   */
  setGift = (box: Box<Amount>): this => {
    this.gift = box;
    return this;
  };

  /**
   * Set the gift giver's ErgoTree
   * @param ergoTree - Gift giver's ErgoTree
   * @returns this builder instance
   */
  setGiftGiverErgoTree = (ergoTree: string): this => {
    this.giftGiverErgoTree = ergoTree;
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
    if (!this.gift) throw new Error('Gift box not set');
    if (!this.giftGiverErgoTree) throw new Error('Gift giver ErgoTree not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the gift return transaction
   * @returns ErgoUnsignedTransaction instance configured for gift return
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Prepare input for gift with context extension
    const inputGiftBox = new ErgoUnsignedInput(this.gift!);
    inputGiftBox.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.giftGiverErgoTree!, 'hex'))),
    });

    // Update winner box using fromBox and sendGift logic
    const winnerBuilder = WinnerBuilder.fromBox(this.winner!)
      .setCreationHeight(this.chainHeight!)
      .sendGift(); // Send a gift back to the gift giver
    const updatedWinnerBox = winnerBuilder.build();

    // Create SafePay output for the redeemed gift
    // Use R4 from the gift box as the receiver hash
    const receiverHash = blake2b256(
      Buffer.from(this.giftGiverErgoTree!, 'hex'),
    );
    const safePayBuilder = new SafePayBuilder()
      .setValue(BigInt(this.gift!.value) - this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setTxFee(this.txFee!)
      .setReceiverErgoTreeHash(receiverHash)
      .setTokens(this.gift!.assets.slice(1));
    const safePayBox = safePayBuilder.build();

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.winner!, inputGiftBox])
      .to([updatedWinnerBox, safePayBox])
      .withDataFrom([this.giftRedeem!])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
