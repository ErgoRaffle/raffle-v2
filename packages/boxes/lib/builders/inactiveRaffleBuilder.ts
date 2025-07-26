import {
  OutputBuilder,
  SColl,
  SLong,
  SByte,
  SInt,
  ErgoAddress,
  Box,
  Amount,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';
import { blake2b256 } from '@fleet-sdk/crypto';
import { bigIntToUint8Array } from '../utils';
import { ServiceBuilder } from './serviceBuilder';

/**
 * Builder class for creating Inactive Raffle boxes in the ErgoRaffle protocol
 * Inactive Raffle box holds the raffle configuration before it becomes active
 *
 * Registers:
 *   R4[Coll[Long]]: [WinnersPercentage, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, Deadline, TxFee]
 *   R5[Coll[Coll[Byte]]]: [ServiceErgoTreeHash, ImplementerErgoTreeHash, CreatorErgoTreeHash]
 *   R6[Coll[Coll[Byte]]]: [Name, Description, Pictures(optional)]
 *   R7[Coll[Coll[Byte]]]: [TicketId, WinnersPercentListHash]
 *   R8[Int]: WinnersCount
 * Tokens:
 *   0: RaffleLicense
 */
export class InactiveRaffleBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private winnersPercentage?: bigint;
  private serviceFeePercent?: bigint;
  private implementerFeePercent?: bigint;
  private ticketPrice?: bigint;
  private goal?: bigint;
  private deadline?: bigint;
  private txFee?: bigint;
  private winnersCount?: number;
  private name?: string;
  private description?: string;
  private pictures?: string[];
  private ticketId?: string;
  private winnersPercentList?: bigint[];
  private winnersPercentListHash?: Uint8Array;
  private serviceErgoTreeHash?: Uint8Array;
  private implementerErgoTreeHash?: Uint8Array;
  private creatorErgoTreeHash?: Uint8Array;
  private collectingTokenId?: string;
  private collectingTokenAmount: bigint = 1n;

  constructor() {}

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
   * Set the winners percentage (in thousandths)
   * @param percent - Winners percentage (e.g., 200 = 20%)
   * @returns this builder instance
   */
  setWinnersPercentage = (percent: bigint): this => {
    this.winnersPercentage = percent;
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
   * Set the ticket price
   * @param price - Price in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Set the raffle goal
   * @param goal - Goal amount in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setGoal = (goal: bigint): this => {
    this.goal = goal;
    return this;
  };

  /**
   * Set the raffle deadline in blocks
   * @param deadline - Deadline in blocks
   * @returns this builder instance
   */
  setDeadline = (deadline: bigint): this => {
    this.deadline = deadline;
    return this;
  };

  /**
   * Set the transaction fee
   * @param fee - Transaction fee in nanoERG
   * @returns this builder instance
   */
  setTxFee = (fee: bigint): this => {
    this.txFee = fee;
    return this;
  };

  /**
   * Set the number of winners
   * @param count - Number of winners
   * @returns this builder instance
   */
  setWinnersCount = (count: number): this => {
    this.winnersCount = count;
    return this;
  };

  /**
   * Set the raffle name
   * @param name - Raffle name
   * @returns this builder instance
   */
  setName = (name: string): this => {
    this.name = name;
    return this;
  };

  /**
   * Set the raffle description
   * @param description - Raffle description
   * @returns this builder instance
   */
  setDescription = (description: string): this => {
    this.description = description;
    return this;
  };

  /**
   * Set the raffle pictures
   * @param pictures - Array of picture URLs or data
   * @returns this builder instance
   */
  setPictures = (pictures: string[]): this => {
    this.pictures = pictures;
    return this;
  };

  /**
   * Set the ticket ID
   * @param id - Ticket ID
   * @returns this builder instance
   */
  setTicketId = (id: string): this => {
    this.ticketId = id;
    return this;
  };

  /**
   * Set the winners percent list and validate it
   * @param list - Array of percentages for each winner (in thousandths)
   * @returns this builder instance
   * @throws Error if list is invalid
   */
  setWinnersPercentList = (list: bigint[]): this => {
    if (!this.winnersCount) {
      throw new Error(
        'Winners count must be set before setting winners percent list',
      );
    }

    if (list.length !== this.winnersCount) {
      throw new Error(
        `Winners percent list length (${list.length}) must match winners count (${this.winnersCount})`,
      );
    }

    const sum = list.reduce((acc, val) => acc + val, 0n);
    if (sum !== 1000n) {
      throw new Error(`Sum of winners percentages must be 1000 (got ${sum})`);
    }

    this.winnersPercentList = list;
    this.winnersPercentListHash = blake2b256(
      Buffer.concat(list.map((n) => bigIntToUint8Array(n))),
    );
    return this;
  };

  /**
   * Set the service ergoTree and hash it
   * @param ergoTree - ErgoTree in hex format
   * @returns this builder instance
   */
  setServiceErgoTree = (ergoTree: string): this => {
    this.serviceErgoTreeHash = blake2b256(Buffer.from(ergoTree, 'hex'));
    return this;
  };

  /**
   * Set the implementer ergoTree and hash it
   * @param ergoTree - ErgoTree in hex format
   * @returns this builder instance
   */
  setImplementerErgoTree = (ergoTree: string): this => {
    this.implementerErgoTreeHash = blake2b256(Buffer.from(ergoTree, 'hex'));
    return this;
  };

  /**
   * Set the creator ergoTree and hash it
   * @param ergoTree - ErgoTree in hex format
   * @returns this builder instance
   */
  setCreatorErgoTree = (ergoTree: string): this => {
    this.creatorErgoTreeHash = blake2b256(Buffer.from(ergoTree, 'hex'));
    return this;
  };

  /**
   * Set the collecting token ID for token-goal raffles
   * @param tokenId - The token ID to collect
   * @returns this builder instance
   */
  setCollectingTokenId = (tokenId: string): this => {
    this.collectingTokenId = tokenId;
    return this;
  };

  /**
   * Set the collecting token amount
   * @param amount - The amount of collecting tokens
   * @returns this builder instance
   */
  setCollectingTokenAmount = (amount: bigint): this => {
    this.collectingTokenAmount = amount;
    return this;
  };

  /**
   * Get the raffle name
   * @returns Raffle name
   */
  getName = (): string => {
    return this.name!;
  };

  /**
   * Get the raffle description
   * @returns Raffle description
   */
  getDescription = (): string => {
    return this.description!;
  };

  /**
   * Get the raffle pictures
   * @returns Array of picture URLs or data
   */
  getPictures = (): string[] => {
    return this.pictures || [];
  };

  /**
   * Get the ticket ID
   * @returns Ticket ID
   */
  getTicketId = (): string => {
    return this.ticketId!;
  };

  /**
   * Get the transaction fee
   * @returns Transaction fee amount in nanoERG
   */
  getTxFee = (): bigint => {
    return this.txFee!;
  };

  /**
   * Get the winners percentage (in thousandths)
   * @returns Winners percentage (e.g., 200 = 20%)
   */
  getWinnersPercentage = (): bigint => {
    return this.winnersPercentage!;
  };

  /**
   * Get the service fee percentage (in thousandths)
   * @returns Service fee percentage (in thousandths)
   */
  getServiceFeePercent = (): bigint => {
    return this.serviceFeePercent!;
  };

  /**
   * Get the implementer fee percentage (in thousandths)
   * @returns Implementer fee percentage (in thousandths)
   */
  getImplementerFeePercent = (): bigint => {
    return this.implementerFeePercent!;
  };

  /**
   * Get the ticket price
   * @returns Ticket price in nanoERG/CollectingToken
   */
  getTicketPrice = (): bigint => {
    return this.ticketPrice!;
  };

  /**
   * Get the raffle goal
   * @returns Goal amount in nanoERG/CollectingToken
   */
  getGoal = (): bigint => {
    return this.goal!;
  };

  /**
   * Get the raffle deadline in blocks
   * @returns Deadline in blocks
   */
  getDeadline = (): bigint => {
    return this.deadline!;
  };

  /**
   * Get the number of winners
   * @returns Number of winners
   */
  getWinnersCount = (): number => {
    return this.winnersCount!;
  };

  /**
   * Get the service ergo tree hash
   * @returns Service ergo tree hash
   */
  getServiceErgoTreeHash = (): Uint8Array => {
    return this.serviceErgoTreeHash!;
  };

  /**
   * Get the implementer ergo tree hash
   * @returns Implementer ergo tree hash
   */
  getImplementerErgoTreeHash = (): Uint8Array => {
    return this.implementerErgoTreeHash!;
  };

  /**
   * Get the creator ergo tree hash
   * @returns Creator ergo tree hash
   */
  getCreatorErgoTreeHash = (): Uint8Array => {
    return this.creatorErgoTreeHash!;
  };

  /**
   * Get the collecting token ID
   * @returns Collecting token ID or undefined if not set
   */
  getCollectingTokenId = (): string | undefined => {
    return this.collectingTokenId;
  };

  getCollectingTokenAmount = (): bigint => {
    return this.collectingTokenAmount!;
  };

  /**
   * Check if the raffle is an ERG goal raffle
   * @returns True if the raffle is an ERG goal raffle, false otherwise
   */
  isErgGoal = (): boolean => {
    return this.collectingTokenId === undefined;
  };

  /**
   * Fill data from a service box
   * @param serviceBox - The service box to get information from
   * @returns this builder instance
   * @throws Error if service box is invalid
   */
  fromServiceBox = (serviceBox: Box<Amount>): this => {
    // Use ServiceBuilder to parse the box
    const serviceBuilder = ServiceBuilder.fromBox(serviceBox);

    // Set the service fee percent and implementer fee percent from service box
    this.setServiceFeePercent(serviceBuilder.getServiceFeePercent())
      .setImplementerFeePercent(serviceBuilder.getImplementerFeePercent())
      .setTxFee(serviceBuilder.getTxFee());

    // Store the service fee ergoTree hash for later use
    this.serviceErgoTreeHash = serviceBuilder.getServiceFeeErgoTreeHash();

    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.winnersPercentage) throw new Error('Winners percentage not set');
    if (!this.serviceFeePercent) throw new Error('Service fee percent not set');
    if (!this.implementerFeePercent)
      throw new Error('Implementer fee percent not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.goal) throw new Error('Goal not set');
    if (!this.deadline) throw new Error('Deadline not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnersCount) throw new Error('Winners count not set');
    if (!this.name) throw new Error('Name not set');
    if (!this.description) throw new Error('Description not set');
    if (!this.ticketId) throw new Error('Ticket ID not set');
    if (!this.winnersPercentList)
      throw new Error('Winners percent list not set');
    if (!this.winnersPercentListHash)
      throw new Error('Winners percent list hash not set');
    if (!this.serviceErgoTreeHash)
      throw new Error('Service ergoTree hash not set');
    if (!this.implementerErgoTreeHash)
      throw new Error('Implementer ergoTree hash not set');
    if (!this.creatorErgoTreeHash)
      throw new Error('Creator ergoTree hash not set');
  };

  /**
   * Build an output box for the inactive raffle contract
   * Contains raffle configuration
   * @returns OutputBuilder instance configured for the inactive raffle box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    const tokens = [
      {
        tokenId: raffleInfo.tokens.raffleLicense,
        amount: 1n,
      },
    ];

    if (this.collectingTokenId) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenAmount!,
      });
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.inactiveRaffle).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.winnersPercentage!,
          this.serviceFeePercent!,
          this.implementerFeePercent!,
          this.ticketPrice!,
          this.goal!,
          this.deadline!,
          this.txFee!,
        ]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(this.serviceErgoTreeHash!),
          Array.from(this.implementerErgoTreeHash!),
          Array.from(this.creatorErgoTreeHash!),
        ]).toHex(),
        R6: SColl(SColl(SByte), [
          Array.from(Buffer.from(this.name!)),
          Array.from(Buffer.from(this.description!)),
          ...(this.pictures
            ? this.pictures.map((pic) => Array.from(Buffer.from(pic)))
            : []),
        ]).toHex(),
        R7: SColl(SColl(SByte), [
          Array.from(Buffer.from(this.ticketId!, 'hex')),
          Array.from(this.winnersPercentListHash!),
        ]).toHex(),
        R8: SInt(this.winnersCount!).toHex(),
      });
  };

  /**
   * Create an InactiveRaffleBuilder instance from an existing box
   * @param box - Existing inactive raffle box to copy configuration from
   * @returns New InactiveRaffleBuilder instance with copied configuration
   * @throws Error if box structure doesn't match inactive raffle box requirements
   */
  static fromBox = (box: Box<Amount>): InactiveRaffleBuilder => {
    if (box.assets.length < 1) {
      throw new Error('Invalid inactive raffle box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (
      !registers.R4 ||
      !registers.R5 ||
      !registers.R6 ||
      !registers.R7 ||
      !registers.R8
    ) {
      throw new Error(
        'Invalid inactive raffle box: missing required registers',
      );
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    const r5Data = SConstant.from(registers.R5).data as Uint8Array[];
    const r6Data = SConstant.from(registers.R6).data as Uint8Array[];
    const r7Data = SConstant.from(registers.R7).data as Uint8Array[];
    const r8Data = SConstant.from(registers.R8).data as number;

    if (r4Data.length < 7) {
      throw new Error(
        'Invalid inactive raffle box: invalid R4 register format',
      );
    }

    if (r5Data.length < 3) {
      throw new Error(
        'Invalid inactive raffle box: invalid R5 register format',
      );
    }

    if (r6Data.length < 2) {
      throw new Error(
        'Invalid inactive raffle box: invalid R6 register format',
      );
    }

    if (r7Data.length < 2) {
      throw new Error(
        'Invalid inactive raffle box: invalid R7 register format',
      );
    }

    const builder = new InactiveRaffleBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setWinnersPercentage(r4Data[0])
      .setServiceFeePercent(r4Data[1])
      .setImplementerFeePercent(r4Data[2])
      .setTicketPrice(r4Data[3])
      .setGoal(r4Data[4])
      .setDeadline(r4Data[5])
      .setTxFee(r4Data[6])
      .setWinnersCount(r8Data)
      .setName(Buffer.from(r6Data[0]).toString())
      .setDescription(Buffer.from(r6Data[1]).toString())
      .setTicketId(Buffer.from(r7Data[0]).toString('hex'));

    // Set ergoTree hashes
    builder.serviceErgoTreeHash = r5Data[0];
    builder.implementerErgoTreeHash = r5Data[1];
    builder.creatorErgoTreeHash = r5Data[2];

    // Set pictures if present
    if (r6Data.length > 2) {
      const pictures = r6Data
        .slice(2)
        .map((arr) => Buffer.from(arr).toString());
      builder.setPictures(pictures);
    }

    // Set winners percent list hash
    builder.winnersPercentListHash = r7Data[1];

    // Set collecting token if present
    if (box.assets.length > 1) {
      builder.setCollectingTokenId(box.assets[1].tokenId);
    }

    return builder;
  };
}
