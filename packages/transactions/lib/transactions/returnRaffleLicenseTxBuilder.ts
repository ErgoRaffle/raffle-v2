import { ServiceBuilder } from '@ergo-raffle/boxes';
import { SafePayBuilder } from '@ergo-raffle/boxes';
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

/**
 * Builder class for creating return raffle license transactions
 * This builder creates a transaction that:
 * 1. Takes an ended raffle box and service box as inputs
 * 2. Creates an updated service box with returned license
 * 3. Creates a safe pay box for change
 */
export class ReturnRaffleLicenseTxBuilder {
  private endedRaffle?: Box<Amount>;
  private service?: Box<Amount>;
  private changeErgoTree?: string;
  private chainHeight?: number;
  private txFee?: bigint;

  /**
   * Set the ended raffle box input (success raffle or ticket redeem)
   * @param box - The ended raffle box to spend
   * @returns this builder instance
   */
  setEndedRaffle = (box: Box<Amount>): this => {
    this.endedRaffle = box;
    return this;
  };

  /**
   * Set the service box input
   * @param box - The service box to spend
   * @returns this builder instance
   */
  setService = (box: Box<Amount>): this => {
    this.service = box;
    return this;
  };

  /**
   * Set the change address
   * @param address - Address to receive change
   * @returns this builder instance
   */
  setChangeAddress = (address: string): this => {
    this.changeErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the change ergo tree
   * @param ergoTree - Ergo tree to receive change
   * @returns this builder instance
   */
  setChangeErgoTree = (ergoTree: string): this => {
    this.changeErgoTree = ergoTree;
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
    if (!this.endedRaffle) throw new Error('Ended raffle box not set');
    if (!this.service) throw new Error('Service box not set');
    if (!this.changeErgoTree) throw new Error('Change address not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
  };

  /**
   * Build the return raffle license transaction
   * @returns ErgoUnsignedTransaction instance configured for return raffle license
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Create updated service box using fromBox
    const serviceBuilder = ServiceBuilder.fromBox(this.service!)
      .setCreationHeight(this.chainHeight!)
      .incrementLicenseToken();
    const updatedServiceBox = serviceBuilder.build();

    // Create safe pay box for change
    const changeBoxBuilder = new SafePayBuilder()
      .setValue(BigInt(this.endedRaffle!.value) - this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setReceiverErgoTree(this.changeErgoTree!)
      .setTxFee(this.txFee!);
    if (this.endedRaffle!.assets[2]) {
      changeBoxBuilder.setTokens([this.endedRaffle!.assets[2]]);
    }
    const changeBox = changeBoxBuilder.build();

    // Prepare input for ended raffle with context extension
    const inputEndedRaffle = new ErgoUnsignedInput(this.endedRaffle!);
    inputEndedRaffle.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.changeErgoTree!, 'hex'))),
    });

    // Build the transaction
    const tx = new TransactionBuilder(this.chainHeight!)
      .from([this.service!, inputEndedRaffle])
      .to([updatedServiceBox, changeBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .burnTokens(this.endedRaffle!.assets[1])
      .payFee(this.txFee!)
      .build();

    return tx;
  };
}
