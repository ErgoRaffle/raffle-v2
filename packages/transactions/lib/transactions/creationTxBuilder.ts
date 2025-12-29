import { ServiceBuilder } from '@ergo-raffle/boxes';
import { InactiveRaffleBuilder } from '@ergo-raffle/boxes';
import { TicketRepoBuilder } from '@ergo-raffle/boxes';
import {
  TransactionBuilder,
  ErgoUnsignedInput,
  Box,
  Amount,
  SColl,
  SLong,
  SByte,
  ErgoAddress,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';

/**
 * Builder class for raffle creation transaction
 * This builder creates a transaction that:
 * 1. Takes a service box and fee boxes as inputs
 * 2. Creates a new service box (with decremented license)
 * 3. Creates a ticket repository box
 * 4. Creates an inactive raffle box
 * 5. Sends change to the creator
 */
export class CreationTxBuilder {
  private serviceBox?: Box<Amount>;
  private feeBoxes: Box<Amount>[] = [];
  private creatorErgoTree?: string;
  private implementerErgoTree?: string;
  private winnersCount?: number;
  private deadline?: bigint;
  private winnersPercent?: bigint[];
  private collectingTokenId?: string;
  private ticketPrice?: bigint;
  private winnersSharePercent?: bigint;
  private goal?: bigint;
  private inactiveRaffleValue?: bigint;
  private chainHeight?: number;
  private txFee?: bigint;
  private raffleName?: string;
  private raffleDescription?: string;
  private rafflePictures?: string[];
  private ticketTokenName?: string;
  private ticketTokenDescription?: string;
  private ticketTokenCount?: bigint;
  private raffleId?: string;

  /**
   * Set the service box input
   * @param serviceBox - The service box to spend
   * @returns this builder instance
   */
  setServiceBox = (serviceBox: Box<Amount>): this => {
    this.serviceBox = serviceBox;
    this.raffleId = serviceBox.boxId.toString();
    return this;
  };

  /**
   * Add fee boxes for transaction funding
   * @param feeBoxes - Array of fee boxes
   * @returns this builder instance
   */
  setFeeBoxes = (feeBoxes: Box<Amount>[]): this => {
    this.feeBoxes = feeBoxes;
    return this;
  };

  /**
   * Add a single fee box
   * @param feeBox - Fee box to add
   * @returns this builder instance
   */
  addFeeBox = (feeBox: Box<Amount>): this => {
    this.feeBoxes.push(feeBox);
    return this;
  };

  /**
   * Set the creator address
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setCreatorAddress = (address: string): this => {
    this.creatorErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the creator ErgoTree
   * @param ergoTree - ErgoTree in hex format
   * @returns this builder instance
   */
  setCreatorErgoTree = (ergoTree: string): this => {
    this.creatorErgoTree = ergoTree;
    return this;
  };

  /**
   * Set the implementer address
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setImplementerAddress = (address: string): this => {
    this.implementerErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the implementer ErgoTree
   * @param ergoTree - ErgoTree in hex format
   * @returns this builder instance
   */
  setImplementerErgoTree = (ergoTree: string): this => {
    this.implementerErgoTree = ergoTree;
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
   * Set the raffle deadline in blocks
   * @param deadline - Deadline in blocks
   * @returns this builder instance
   */
  setDeadline = (deadline: bigint): this => {
    this.deadline = deadline;
    return this;
  };

  /**
   * Set the winners percentage list
   * @param percentages - Array of winner percentages (in thousandths)
   * @returns this builder instance
   */
  setWinnersPercent = (percentages: bigint[]): this => {
    this.winnersPercent = percentages;
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
   * Set the ticket price
   * @param price - Price in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Set the winners share percentage
   * @param percent - Winners share percentage (in thousandths)
   * @returns this builder instance
   */
  setWinnersSharePercent = (percent: bigint): this => {
    this.winnersSharePercent = percent;
    return this;
  };

  /**
   * Set the raffle goal amount
   * @param goal - Goal amount in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setGoal = (goal: bigint): this => {
    this.goal = goal;
    return this;
  };

  /**
   * Set the inactive raffle box value
   * @param value - Value in nanoERG for the inactive raffle box
   * @returns this builder instance
   */
  setInactiveRaffleValue = (value: bigint): this => {
    this.inactiveRaffleValue = value;
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
   * Set the raffle name
   * @param name - Raffle name
   * @returns this builder instance
   */
  setRaffleName = (name: string): this => {
    this.raffleName = name;
    return this;
  };

  /**
   * Set the raffle description
   * @param description - Raffle description
   * @returns this builder instance
   */
  setRaffleDescription = (description: string): this => {
    this.raffleDescription = description;
    return this;
  };

  /**
   * Set the raffle pictures
   * @param pictures - Array of picture URLs
   * @returns this builder instance
   */
  setRafflePictures = (pictures: string[]): this => {
    this.rafflePictures = pictures;
    return this;
  };

  /**
   * Set the ticket token name
   * @param name - Ticket token name
   * @returns this builder instance
   */
  setTicketTokenName = (name: string): this => {
    this.ticketTokenName = name;
    return this;
  };

  /**
   * Set the ticket token description
   * @param description - Ticket token description
   * @returns this builder instance
   */
  setTicketTokenDescription = (description: string): this => {
    this.ticketTokenDescription = description;
    return this;
  };

  /**
   * Set the ticket token count
   * @param count - Number of ticket tokens to create
   * @returns this builder instance
   */
  setTicketTokenCount = (count: bigint): this => {
    this.ticketTokenCount = count;
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.serviceBox) throw new Error('Service box not set');
    if (!this.creatorErgoTree) throw new Error('Creator ErgoTree not set');
    if (!this.implementerErgoTree)
      throw new Error('Implementer ErgoTree not set');
    if (!this.winnersCount) throw new Error('Winners count not set');
    if (!this.deadline) throw new Error('Deadline not set');
    if (!this.winnersPercent) throw new Error('Winners percent not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.winnersSharePercent)
      throw new Error('Winners share percent not set');
    if (!this.goal) throw new Error('Goal not set');
    if (!this.inactiveRaffleValue)
      throw new Error('Inactive raffle value not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.raffleName) throw new Error('Raffle name not set');
    if (!this.raffleDescription) throw new Error('Raffle description not set');
    if (!this.ticketTokenCount) throw new Error('Ticket token count not set');
  };

  /**
   * Build the raffle creation transaction
   * @returns ErgoUnsignedTransaction instance configured for raffle creation
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Set context extension for service box
    const inputServiceBox = new ErgoUnsignedInput(this.serviceBox!);
    inputServiceBox.setContextExtension({
      0: SColl(SLong, this.winnersPercent!),
      1: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.implementerErgoTree!, 'hex')),
        Array.from(Buffer.from(this.creatorErgoTree!, 'hex')),
      ]),
    });

    // Create service output box (with decremented license)
    const serviceBuilder = ServiceBuilder.fromBox(this.serviceBox!)
      .setCreationHeight(this.chainHeight!)
      .decrementLicenseToken();

    const serviceOutputBox = serviceBuilder.build();

    // Create ticket repository output box
    const ticketRepoBuilder = new TicketRepoBuilder()
      .setValue(this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setTicketTokenAmount(this.ticketTokenCount!)
      .setRaffleId(this.raffleId!)
      .setTokenName(this.ticketTokenName || this.raffleName!)
      .setTokenDescription(
        this.ticketTokenDescription || this.raffleDescription!,
      )
      .setTxFee(this.txFee!);

    const ticketRepoOutputBox = ticketRepoBuilder.build();

    // Create inactive raffle output box
    const inactiveRaffleBuilder = new InactiveRaffleBuilder()
      .fromServiceBox(this.serviceBox!)
      .setValue(this.inactiveRaffleValue!)
      .setCreationHeight(this.chainHeight!)
      .setWinnersPercentage(this.winnersSharePercent!)
      .setTicketPrice(this.ticketPrice!)
      .setGoal(this.goal!)
      .setDeadline(this.deadline!)
      .setWinnersCount(this.winnersCount!)
      .setName(this.raffleName!)
      .setDescription(this.raffleDescription!)
      .setTicketId(this.raffleId!)
      .setWinnersPercentList(this.winnersPercent!)
      .setImplementerErgoTree(this.implementerErgoTree!)
      .setCreatorErgoTree(this.creatorErgoTree!);

    // Set collecting token if specified
    if (this.collectingTokenId) {
      inactiveRaffleBuilder.setCollectingTokenId(this.collectingTokenId);
    }

    // Set pictures if provided
    if (this.rafflePictures) {
      inactiveRaffleBuilder.setPictures(this.rafflePictures);
    }

    const inactiveRaffleOutputBox = inactiveRaffleBuilder.build();

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([inputServiceBox, ...this.feeBoxes])
      .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.creatorErgoTree!)
      .build();

    return transaction;
  };
}
