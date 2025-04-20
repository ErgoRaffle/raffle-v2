import {
  Box,
  OutputBuilder,
  TokenAmount,
  Amount,
  SColl,
  SLong,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';
import { blake2b256 } from '@fleet-sdk/crypto';

/**
 * Builder class for creating Service boxes in the ErgoRaffle protocol
 * Service box holds the protocol configuration and license tokens
 *
 * Registers:
 *   R4[Coll[Long]]: [ServiceFeePercent, ImplementerFeePercent, CreationFee, TxFee]
 *   R5[Coll[Byte]]: ServiceFeeErgoTreeHash
 * Tokens:
 *   0: ServiceNft
 *   1: RaffleLicense
 */
export class ServiceBuilder {
  // Private fields
  private ergoTree?: string;
  private ownerErgoTreeHash?: Uint8Array;
  private value?: bigint;
  private creationHeight?: number;
  private serviceFeePercent?: bigint;
  private implementerFeePercent?: bigint;
  private creationFee?: bigint;
  private txFee?: bigint;
  private serviceNft?: TokenAmount<bigint>;
  private licensingToken?: TokenAmount<bigint>;

  constructor() {}

  /**
   * Set the owner address and process it to get ergoTree and hash
   * @param ownerAddress - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setOwnerAddress = (ownerAddress: string): this => {
    const ownerErgoAddress = ErgoAddress.fromBase58(ownerAddress);
    this.ergoTree = ownerErgoAddress.ergoTree;
    this.ownerErgoTreeHash = blake2b256(
      Buffer.from(ownerErgoAddress.ergoTree, 'hex'),
    );
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
   * Set the license token count
   * @param count - Number of license tokens
   * @returns this builder instance
   */
  setLicenseTokenCount = (count: bigint): this => {
    this.licensingToken = {
      tokenId: raffleInfo.tokens.raffleLicense,
      amount: count,
    };
    return this;
  };

  /**
   * Decrement license token count by one for new raffle creation
   * @returns this builder instance
   */
  decrementLicenseToken = (): this => {
    if (!this.licensingToken) {
      throw new Error('License token not set');
    }
    this.licensingToken.amount -= 1n;
    return this;
  };

  /**
   * Increment license token count by one for raffle ending
   * @returns this builder instance
   */
  incrementLicenseToken = (): this => {
    if (!this.licensingToken) {
      throw new Error('License token not set');
    }
    this.licensingToken.amount += 1n;
    return this;
  };

  /**
   * Set the service fee percentage (in thousandths)
   * @param percent - Fee percentage (e.g., 100 = 10%)
   * @returns this builder instance
   */
  setServiceFeePercent = (percent: bigint): this => {
    this.serviceFeePercent = percent;
    return this;
  };

  /**
   * Set the implementer fee percentage (in thousandths)
   * @param percent - Fee percentage (e.g., 100 = 10%)
   * @returns this builder instance
   */
  setImplementerFeePercent = (percent: bigint): this => {
    this.implementerFeePercent = percent;
    return this;
  };

  /**
   * Set the creation fee for new raffles
   * @param fee - Fee amount in nanoERG
   * @returns this builder instance
   */
  setCreationFee = (fee: bigint): this => {
    this.creationFee = fee;
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
    if (!this.ergoTree) throw new Error('ErgoTree not set');
    if (!this.ownerErgoTreeHash) throw new Error('Owner ErgoTree hash not set');
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.serviceFeePercent) throw new Error('Service fee percent not set');
    if (!this.implementerFeePercent)
      throw new Error('Implementer fee percent not set');
    if (!this.creationFee) throw new Error('Creation fee not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.serviceNft) throw new Error('Service NFT not set');
    if (!this.licensingToken) throw new Error('License token not set');
  };

  /**
   * Build an output box for the service contract
   * Contains service configuration and license tokens
   * @returns OutputBuilder instance configured for the service box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(this.value!, this.ergoTree!, this.creationHeight!)
      .addTokens([this.serviceNft!, this.licensingToken!])
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.serviceFeePercent!,
          this.implementerFeePercent!,
          this.creationFee!,
          this.txFee!,
        ]).toHex(),
        R5: SColl(SByte, Array.from(this.ownerErgoTreeHash!)).toHex(),
      });
  };

  /**
   * Create a ServiceBuilder instance from an existing box
   * @param box - Existing service box to copy configuration from
   * @returns New ServiceBuilder instance with copied configuration
   * @throws Error if box structure doesn't match service box requirements
   */
  static fromBox = (box: Box<Amount>): ServiceBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid service box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5) {
      throw new Error('Invalid service box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    const ownerErgoTreeHash = SConstant.from(registers.R5).data as Uint8Array;

    if (r4Data.length < 4) {
      throw new Error('Invalid service box: invalid R4 register format');
    }

    const builder = new ServiceBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setLicenseTokenCount(BigInt(box.assets[1].amount))
      .setServiceFeePercent(r4Data[0])
      .setImplementerFeePercent(r4Data[1])
      .setCreationFee(r4Data[2])
      .setTxFee(r4Data[3]);

    // Set tokens
    builder.serviceNft = {
      tokenId: box.assets[0].tokenId,
      amount: 1n,
    };

    // Set ergoTree and hash directly since we have them from the box
    builder.ergoTree = box.ergoTree;
    builder.ownerErgoTreeHash = ownerErgoTreeHash;

    return builder;
  };
}
