import {
  OutputBuilder,
  TokenAmount,
  SColl,
  SByte,
  SInt,
  SLong,
  ErgoAddress,
  Box,
  Amount,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { raffleInfo } from '@ergo-raffle/contracts';

import { WinnerBuilder } from './winnerBuilder';

/**
 * Builder class for creating Gift boxes in the ErgoRaffle protocol
 * Gift box represents a gift token that can be unwrapped or returned
 *
 * Registers:
 *   R4[Coll[Byte]]: [DonatorErgoTreeHash]
 *   R5[Int]: WinnerIndex
 *   R6[Long]: txFee
 * Tokens:
 *   0: GiftToken
 *   1..n: Gifts (array of tokens)
 */
export class GiftBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private donatorErgoTreeHash?: Uint8Array;
  private winnerIndex?: number;
  private txFee?: bigint;
  private giftTokenId?: string;
  private giftTokenAmount?: bigint;
  private gifts: TokenAmount<Amount>[] = [];

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
   * Set the donator's address and process it to get ErgoTree hash
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setDonatorAddress = (address: string): this => {
    const donatorErgoAddress = ErgoAddress.fromBase58(address);
    this.donatorErgoTreeHash = blake2b256(
      Buffer.from(donatorErgoAddress.ergoTree, 'hex'),
    );
    return this;
  };

  /**
   * Set the winner index
   * @param index - Winner index
   * @returns this builder instance
   */
  setWinnerIndex = (index: number): this => {
    this.winnerIndex = index;
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
   * Set the gift token identifier
   * @param tokenId - Gift token ID
   * @returns this builder instance
   */
  setGiftToken = (tokenId: string, amount: bigint = 1n): this => {
    this.giftTokenId = tokenId;
    this.giftTokenAmount = amount;
    return this;
  };

  /**
   * Add a gift token to the array
   * @param tokenId - Gift token ID
   * @param amount - Number of gifts
   * @returns this builder instance
   */
  addGift = (gift: TokenAmount<Amount>): this => {
    this.gifts.push(gift);
    return this;
  };

  /**
   * Add multiple gift tokens as a batch
   * @param gifts - Array of gift tokens to add
   * @returns this builder instance
   */
  addGifts = (gifts: TokenAmount<Amount>[]): this => {
    this.gifts.push(...gifts);
    return this;
  };

  /**
   * Clear all gift tokens
   * @returns this builder instance
   */
  clearGifts = (): this => {
    this.gifts = [];
    return this;
  };

  /**
   * Set the donator's ErgoTree hash
   * @param hash - Donator's ErgoTree hash as byte array
   * @returns this builder instance
   */
  setDonatorErgoTreeHash = (hash: Uint8Array): this => {
    this.donatorErgoTreeHash = hash;
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (this.value < 2n * this.txFee) throw new Error('Value is too low');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.donatorErgoTreeHash)
      throw new Error('Donator ErgoTree hash not set');
    if (this.winnerIndex === undefined) throw new Error('Winner index not set');
    if (!this.giftTokenId) throw new Error('Gift token not set');
  };

  /**
   * Build an output box for the gift contract
   * Contains gift token and array of gifts
   * @returns OutputBuilder instance configured for the gift box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.gift).ergoTree,
      this.creationHeight!,
    )
      .addTokens([
        { tokenId: this.giftTokenId!, amount: this.giftTokenAmount ?? 1n },
        ...this.gifts,
      ])
      .setAdditionalRegisters({
        R4: SColl(SByte, Array.from(this.donatorErgoTreeHash!)).toHex(),
        R5: SInt(this.winnerIndex!).toHex(),
        R6: SLong(this.txFee!).toHex(),
      });
  };

  /**
   * Fill private parameters from a winner box
   * CAUTION: This method wont set gift array, gifts should be added manually
   * @param winnerBox - Winner box to extract information from
   * @returns this builder instance
   * @throws Error if box structure doesn't match winner box requirements
   */
  static giftForWinner = (winnerBox: Box<Amount>): GiftBuilder => {
    // Use WinnerBuilder to parse the box
    const winnerBuilder = WinnerBuilder.fromBox(winnerBox);

    // Create new builder instance
    const builder = new GiftBuilder();

    // Set all parameters using setters
    builder
      .setValue(2n * winnerBuilder.getTxFee()) // 2 * txFee
      .setWinnerIndex(winnerBuilder.getWinnerIndex())
      .setTxFee(winnerBuilder.getTxFee())
      .setGiftToken(winnerBuilder.getGiftTokenId()!);

    return builder;
  };
}
