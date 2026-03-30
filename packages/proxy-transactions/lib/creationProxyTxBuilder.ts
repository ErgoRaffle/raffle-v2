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
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { raffleInfo } from '@ergo-raffle/contracts';

import { FleetBoxSelection } from './fleetBoxSelection';

/**
 * Builder class for creation proxy funding transactions.
 */
export class CreationProxyTxBuilder {
  private feeBoxes?: Iterator<Box<Amount>>;
  private organizerErgoTree?: string;
  private implementerErgoTree?: string;
  private projectErgoTree?: string;
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
   * Set input fee box iterator (funding boxes) for the transaction.
   * @param boxes - Iterator of funding boxes used as transaction inputs
   * @returns this builder instance
   */
  setFeeBoxes = (boxes: Iterator<Box<Amount>>): this => {
    this.feeBoxes = boxes;
    return this;
  };

  /**
   * Set the organizer address (also used as change address).
   * @param address - Organizer base58 address
   * @returns this builder instance
   */
  setOrganizerAddress = (address: string): this => {
    this.organizerErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the organizer ErgoTree directly.
   * @param ergoTree - Organizer ErgoTree in hex format
   * @returns this builder instance
   */
  setOrganizerErgoTree = (ergoTree: string): this => {
    this.organizerErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the project address (also used as change address).
   * @param address - Project base58 address
   * @returns this builder instance
   */
  setProjectAddress = (address: string): this => {
    this.projectErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the project ErgoTree directly.
   * @param ergoTree - Project ErgoTree in hex format
   * @returns this builder instance
   */
  setProjectErgoTree = (ergoTree: string): this => {
    this.projectErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the implementer address.
   * @param address - Implementer base58 address
   * @returns this builder instance
   */
  setImplementerAddress = (address: string): this => {
    this.implementerErgoTree = ErgoAddress.fromBase58(address).ergoTree;
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
   * Set the collecting token id for token-goal raffles, for erg-goal raffle don't set this.
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
    if (!this.feeBoxes) throw new Error('Fee boxes not set');
    if (!this.organizerErgoTree) throw new Error('Organizer ErgoTree not set');
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
    const organizerHash = blake2b256(
      Buffer.from(this.organizerErgoTree!, 'hex'),
    );
    const projectErgoTree = this.projectErgoTree ?? this.organizerErgoTree!;
    const projectHash = blake2b256(Buffer.from(projectErgoTree, 'hex'));

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
        Array.from(organizerHash),
        Array.from(projectHash),
        winnersPercentListHash,
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.name!)),
        Array.from(Buffer.from(this.description!)),
        ...(this.pictures ?? []).map((p) => Array.from(Buffer.from(p))),
      ]).toHex(),
      R7: SInt(this.winnerCount!).toHex(),
    });

    if (tokens.length > 0) out = out.addTokens(tokens);
    return out;
  };

  /**
   * Convert a bigint into an Uint8Array.
   * @param num - Bigint value to convert
   * @returns Uint8Array representation
   */
  private bigIntToUint8Array = (num: bigint): Uint8Array => {
    const b = new ArrayBuffer(8);
    new DataView(b).setBigUint64(0, num);
    return new Uint8Array(b);
  };

  /**
   * Select enough fee boxes to cover proxy output, fee and optional token.
   * @returns selected fee boxes
   */
  private selectFeeBoxes = async (): Promise<Box<Amount>[]> => {
    const proxyBox = this.buildCreationProxyBox();
    const requiredAssets = {
      nativeToken: BigInt(proxyBox.value.toString()) + this.txFee!,
      tokens:
        this.collectingTokenId != null
          ? [{ id: this.collectingTokenId, value: 1n }]
          : [],
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
   * Build the creation proxy funding transaction.
   * @returns ErgoUnsignedTransaction instance
   */
  build = async (): Promise<ErgoUnsignedTransaction> => {
    this.validate();
    const selectedFeeBoxes = await this.selectFeeBoxes();

    // The first input is the fee box that contains the winners percentage list and the implementer and creator ErgoTrees.
    const firstInput = new ErgoUnsignedInput(selectedFeeBoxes[0]!);
    firstInput.setContextExtension({
      0: SColl(SLong, this.winnersPercentList!),
      1: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.implementerErgoTree!, 'hex')),
        Array.from(Buffer.from(this.organizerErgoTree!, 'hex')),
        Array.from(Buffer.from(this.projectErgoTree!, 'hex')),
      ]),
    });
    const proxyBox = this.buildCreationProxyBox();

    const tx = new TransactionBuilder(this.chainHeight!)
      .from([firstInput, ...selectedFeeBoxes.slice(1)])
      .to([proxyBox])
      .payFee(this.txFee!)
      .sendChangeTo(this.organizerErgoTree!)
      .build();

    return tx;
  };
}
