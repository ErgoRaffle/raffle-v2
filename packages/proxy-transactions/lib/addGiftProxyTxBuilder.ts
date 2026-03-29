import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  OutputBuilder,
  ErgoAddress,
  SColl,
  SLong,
  SByte,
  TokenAmount,
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { raffleInfo } from '@ergo-raffle/contracts';

import { FleetBoxSelection } from './fleetBoxSelection';

/**
 * Builder class for add-gift proxy funding transactions.
 */
export class AddGiftProxyTxBuilder {
  private feeBoxes?: Iterator<Box<Amount>>;

  private giftGiverAddress?: string;
  private giftGiverErgoTree?: string;

  private raffleId?: string;
  private winnerIndex?: number;
  private txFee?: bigint;
  private expirationHeight?: number;
  private raffleDeadline?: number;
  private chainHeight?: number;
  private giftValue?: bigint;
  private giftTokens?: TokenAmount<bigint>[];

  /**
   * Set input fee box iterator (funding boxes) for the transaction.
   * @param boxes - Iterator of funding boxes used as transaction inputs
   * @returns this builder instance
   */
  setFeeBoxes = (boxes: Iterator<Box<Amount>>): this => {
    this.feeBoxes = boxes;
    return this;
  };

  /**
   * Set the gift giver address (also used as change address).
   * @param address - Gift giver base58 address
   * @returns this builder instance
   */
  setGiftGiverAddress = (address: string): this => {
    this.giftGiverAddress = address;
    this.giftGiverErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the raffle id.
   * @param raffleId - Raffle identifier (hex string)
   * @returns this builder instance
   */
  setRaffleId = (raffleId: string): this => {
    this.raffleId = raffleId;
    return this;
  };

  /**
   * Set the winner index.
   * @param index - Winner index
   * @returns this builder instance
   */
  setWinnerIndex = (index: number): this => {
    this.winnerIndex = index;
    return this;
  };

  /**
   * Set the transaction fee.
   * @param fee - Miner fee in nanoERG
   * @returns this builder instance
   */
  setTxFee = (fee: bigint): this => {
    this.txFee = fee;
    return this;
  };

  /**
   * Set the proxy expiration height.
   * @param height - Expiration height
   * @returns this builder instance
   */
  setExpirationHeight = (height: number): this => {
    this.expirationHeight = height;
    return this;
  };

  /**
   * Set the raffle deadline height.
   * @param height - Raffle deadline height
   * @returns this builder instance
   */
  setRaffleDeadline = (height: number): this => {
    this.raffleDeadline = height;
    return this;
  };

  /**
   * Set gift tokens to be attached to the proxy box.
   * @param tokens - List of gift tokens
   * @returns this builder instance
   */
  setGiftTokens = (tokens: TokenAmount<bigint>[]): this => {
    this.giftTokens = tokens;
    return this;
  };

  /**
   * Add a single gift token.
   * @param token - Gift token to add
   * @returns this builder instance
   */
  addGiftToken = (token: TokenAmount<bigint>): this => {
    if (!this.giftTokens) this.giftTokens = [];
    this.giftTokens.push(token);
    return this;
  };

  /**
   * Set the gift value.
   * @param value - Gift value in nanoERG
   * @returns this builder instance
   */
  setGiftValue = (value: bigint): this => {
    this.giftValue = value;
    return this;
  };

  /**
   * Set current chain height.
   * @param height - Current chain height
   * @returns this builder instance
   */
  setChainHeight = (height: number): this => {
    this.chainHeight = height;
    return this;
  };

  /**
   * Validate that all required parameters are set.
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.feeBoxes) throw new Error('Fee boxes not set');
    if (!this.giftGiverErgoTree) throw new Error('Gift giver ErgoTree not set');
    if (!this.giftGiverAddress) throw new Error('Gift giver address not set');
    if (!this.raffleId) throw new Error('Raffle id not set');
    if (this.winnerIndex == null) throw new Error('Winner index not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.expirationHeight) throw new Error('Expiration height not set');
    if (!this.raffleDeadline) throw new Error('Raffle deadline not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.giftValue) throw new Error('Gift value not set');
    if (this.giftValue < 4n * this.txFee)
      throw new Error('Gift value is too low, should be at least 4 * txFee');
  };

  /**
   * Select enough fee boxes to cover proxy output and fee.
   * @returns selected fee boxes
   */
  private selectFeeBoxes = async (): Promise<Box<Amount>[]> => {
    const requiredAssets = {
      nativeToken: this.giftValue! + this.txFee!,
      tokens: (this.giftTokens ?? []).map((token) => ({
        id: token.tokenId,
        value: token.amount,
      })),
    };

    const selector = new FleetBoxSelection();

    const result = await selector.getCoveringBoxes(
      requiredAssets,
      [],
      new Map(),
      this.feeBoxes!,
    );

    if (!result.covered || result.boxes.length === 0)
      throw new Error('Not enough fee boxes to cover transaction');

    return result.boxes;
  };

  /**
   * Build the add-gift proxy output box.
   * @returns OutputBuilder instance for the proxy box
   */
  private buildAddGiftProxyBox = (): OutputBuilder => {
    const giftGiverHash = blake2b256(
      Buffer.from(this.giftGiverErgoTree!, 'hex'),
    );

    let out = new OutputBuilder(
      this.giftValue!,
      ErgoAddress.fromBase58(raffleInfo.addresses.addGiftProxy).ergoTree,
    ).setAdditionalRegisters({
      R4: SColl(SLong, [
        BigInt(this.expirationHeight!),
        BigInt(this.raffleDeadline!),
        BigInt(this.winnerIndex!),
        this.txFee!,
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.raffleId!, 'hex')),
        Array.from(giftGiverHash),
      ]).toHex(),
    });

    if (this.giftTokens?.length) out = out.addTokens(this.giftTokens);
    return out;
  };

  /**
   * Build the add-gift proxy funding transaction.
   * @returns ErgoUnsignedTransaction instance
   */
  build = async (): Promise<ErgoUnsignedTransaction> => {
    this.validate();
    const selectedFeeBoxes = await this.selectFeeBoxes();

    // The first input is the fee box that contains the gift giver ErgoTree.
    const firstInput = new ErgoUnsignedInput(selectedFeeBoxes[0]!);
    firstInput.setContextExtension({
      0: SColl(SByte, Array.from(Buffer.from(this.giftGiverErgoTree!, 'hex'))),
    });
    const proxyBox = this.buildAddGiftProxyBox();

    const tx = new TransactionBuilder(this.chainHeight!)
      .from([firstInput, ...selectedFeeBoxes.slice(1)])
      .to([proxyBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.giftGiverAddress!)
      .build();

    return tx;
  };
}
