import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  OutputBuilder,
  ErgoAddress,
  SColl,
  SLong,
  SInt,
  SByte,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { Buffer } from 'buffer';

import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creation proxy funding transactions.
 */
export class CreationProxyTxBuilder {
  private feeBoxes: Box<Amount>[] = [];
  private creatorErgoTree?: string;
  private implementerErgoTree?: string;

  private creationFee?: bigint;
  private name?: string;
  private description?: string;
  private ticketPrice?: bigint;
  private goal?: bigint;
  private winnersPercent?: number;
  private winnerCount?: number;
  private winnersPercentList?: bigint[];
  private txFee?: bigint;
  private expirationHeight?: number;
  private raffleDeadline?: number;
  private collectingTokenId?: string;
  private pictures?: string[];
  private chainHeight?: number;

  /**
   * Set input fee boxes (funding boxes) for the transaction.
   * @param boxes - Funding boxes used as transaction inputs
   * @returns this builder instance
   */
  setFeeBoxes = (boxes: Box<Amount>[]): this => {
    this.feeBoxes = boxes;
    return this;
  };

  /**
   * Add a single fee box.
   * @param box - Box to add as funding input
   * @returns this builder instance
   */
  addFeeBox = (box: Box<Amount>): this => {
    this.feeBoxes.push(box);
    return this;
  };

  /**
   * Set the creator address (also used as change address).
   * @param address - Creator base58 address
   * @returns this builder instance
   */
  setCreatorAddress = (address: string): this => {
    this.creatorErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the creator ErgoTree directly.
   * @param ergoTree - Creator ErgoTree in hex format
   * @returns this builder instance
   */
  setCreatorErgoTree = (ergoTree: string): this => {
    this.creatorErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the implementer ErgoTree.
   * @param ergoTree - Implementer ErgoTree in hex format
   * @returns this builder instance
   */
  setImplementerErgoTree = (ergoTree: string): this => {
    this.implementerErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the creation fee required by the service script.
   * @param fee - Creation fee in nanoERG
   * @returns this builder instance
   */
  setCreationFee = (fee: bigint): this => {
    this.creationFee = fee;
    return this;
  };

  /**
   * Set the raffle name.
   * @param name - Raffle name
   * @returns this builder instance
   */
  setName = (name: string): this => {
    this.name = name;
    return this;
  };

  /**
   * Set the raffle description.
   * @param description - Raffle description
   * @returns this builder instance
   */
  setDescription = (description: string): this => {
    this.description = description;
    return this;
  };

  /**
   * Set the raffle ticket price.
   * @param price - Ticket price in nanoERG or collecting token
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Set the raffle goal amount.
   * @param goal - Goal amount in nanoERG or collecting token
   * @returns this builder instance
   */
  setGoal = (goal: bigint): this => {
    this.goal = goal;
    return this;
  };

  /**
   * Set the total winners share percentage.
   * @param percent - Winners share percentage (in thousandths)
   * @returns this builder instance
   */
  setWinnersPercent = (percent: number): this => {
    this.winnersPercent = percent;
    return this;
  };

  /**
   * Set the number of winners.
   * @param count - Winner count
   * @returns this builder instance
   */
  setWinnerCount = (count: number): this => {
    this.winnerCount = count;
    return this;
  };

  /**
   * Set the winners percentage list.
   * @param list - List of winner percentages (in thousandths)
   * @returns this builder instance
   */
  setWinnersPercentList = (list: bigint[]): this => {
    this.winnersPercentList = list;
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
   * Set the collecting token id for token-goal raffles.
   * @param tokenId - Collecting token id in hex format
   * @returns this builder instance
   */
  setCollectingTokenId = (tokenId: string): this => {
    this.collectingTokenId = tokenId;
    return this;
  };

  /**
   * Set the list of raffle picture URLs.
   * @param pictures - List of picture URLs
   * @returns this builder instance
   */
  setPictures = (pictures: string[]): this => {
    this.pictures = pictures;
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
    if (this.feeBoxes.length === 0) throw new Error('Fee boxes not set');
    if (!this.creatorErgoTree) throw new Error('Creator ErgoTree not set');
    if (!this.implementerErgoTree)
      throw new Error('Implementer ErgoTree not set');
    if (!this.creationFee) throw new Error('Creation fee not set');
    if (!this.name) throw new Error('Raffle name not set');
    if (!this.description) throw new Error('Raffle description not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.goal) throw new Error('Goal not set');
    if (this.winnersPercent == null) throw new Error('Winners percent not set');
    if (!this.winnerCount) throw new Error('Winner count not set');
    if (!this.winnersPercentList)
      throw new Error('Winners percent list not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.expirationHeight) throw new Error('Expiration height not set');
    if (!this.raffleDeadline) throw new Error('Raffle deadline not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
  };

  /**
   * Build the creation proxy output box.
   * @returns OutputBuilder instance for the proxy box
   */
  private buildCreationProxyBox = (): OutputBuilder => {
    const isErgGoal = this.collectingTokenId == null;
    const collectingTokenBytes = isErgGoal
      ? Array.from(Buffer.alloc(32))
      : Array.from(Buffer.from(this.collectingTokenId!, 'hex'));

    const winnersPercentListHash = Array.from(
      blake2b256(
        Buffer.concat(
          this.winnersPercentList!.map((n) => this.bigIntToUint8Array(n)),
        ),
      ),
    );

    const requiredNanoErgs =
      this.txFee! * BigInt(this.winnerCount!) * 5n + this.txFee! * 10n;
    const withCreationFee = this.creationFee! + this.txFee! * 2n;
    const value =
      requiredNanoErgs > withCreationFee ? requiredNanoErgs : withCreationFee;

    const tokens =
      this.collectingTokenId != null
        ? [{ tokenId: this.collectingTokenId, amount: 1n }]
        : [];

    const implementerHash = blake2b256(
      Buffer.from(this.implementerErgoTree!, 'hex'),
    );
    const creatorHash = blake2b256(Buffer.from(this.creatorErgoTree!, 'hex'));

    let out = new OutputBuilder(
      value,
      ErgoAddress.fromBase58(raffleInfo.addresses.creationProxy).ergoTree,
    ).setAdditionalRegisters({
      R4: SColl(SLong, [
        BigInt(this.expirationHeight!),
        BigInt(this.raffleDeadline!),
        BigInt(this.winnersPercent!),
        this.ticketPrice!,
        this.goal!,
        this.txFee!,
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(implementerHash),
        Array.from(creatorHash),
        winnersPercentListHash,
        collectingTokenBytes,
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.name!)),
        Array.from(Buffer.from(this.description!)),
        ...(this.pictures ?? []).map((p) => Array.from(Buffer.from(p))),
      ]).toHex(),
      R7: SColl(SInt, [this.winnerCount!, isErgGoal ? 1 : 0]).toHex(),
    });

    if (tokens.length > 0) out = out.addTokens(tokens);
    return out;
  };

  /**
   * Convert a bigint into a big-endian Uint8Array.
   * @param num - Bigint value to convert
   * @returns Uint8Array representation
   */
  private bigIntToUint8Array = (num: bigint): Uint8Array => {
    const hexString = num.toString(16);
    const padded = hexString.length % 2 === 0 ? hexString : `0${hexString}`;
    return Buffer.from(padded, 'hex');
  };

  /**
   * Build the creation proxy funding transaction.
   * @returns ErgoUnsignedTransaction instance
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    const proxyBox = this.buildCreationProxyBox();

    const tx = new TransactionBuilder(this.chainHeight!)
      .from(this.feeBoxes)
      .to([proxyBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.creatorErgoTree!)
      .build();

    return tx;
  };
}
