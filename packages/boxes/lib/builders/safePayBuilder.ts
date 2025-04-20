import {
  OutputBuilder,
  SColl,
  SLong,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating Safe Pay boxes in the ErgoRaffle protocol
 * Safe Pay box holds the payment for a raffle
 *
 * Registers:
 *   R4[Coll[Byte]]: Receiver ErgoTree Hash
 *   R5[Long]: TxFee
 * Tokens:
 *   None
 */
export class SafePayBuilder {
  private receiverErgoTreeHash?: Uint8Array;
  private txFee?: bigint;
  private value?: bigint;
  private creationHeight?: number;

  constructor() {}

  /**
   * Set the receiver's address and convert it to ErgoTree hash
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setReceiverAddress = (address: string): this => {
    const receiverErgoAddress = ErgoAddress.fromBase58(address);
    this.receiverErgoTreeHash = new Uint8Array(
      Buffer.from(receiverErgoAddress.ergoTree, 'hex'),
    );
    return this;
  };

  /**
   * Set the receiver's ergo tree hash directly
   * @param ergoTreeHash - The receiver's ergo tree hash as Uint8Array
   * @returns this builder instance
   */
  setReceiverErgoTreeHash = (ergoTreeHash: Uint8Array): this => {
    this.receiverErgoTreeHash = ergoTreeHash;
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
   * Set the box value in nanoERG
   * @param value - Amount in nanoERG
   * @returns this builder instance
   */
  setValue = (value: bigint): this => {
    this.value = value;
    return this;
  };

  /**
   * Set the creation height for the box
   * @param height - Block height
   * @returns this builder instance
   */
  setCreationHeight = (height: number): this => {
    this.creationHeight = height;
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.receiverErgoTreeHash) throw new Error('Receiver address not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
  };

  /**
   * Build an output box for the safe pay contract
   * Contains payment information
   * @returns OutputBuilder instance configured for the safe pay box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.safePay).ergoTree,
      this.creationHeight!,
    ).setAdditionalRegisters({
      R4: SColl(SByte, Array.from(this.receiverErgoTreeHash!)).toHex(),
      R5: SLong(this.txFee!).toHex(),
    });
  };
}
