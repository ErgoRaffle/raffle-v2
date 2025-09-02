import {
  Box,
  OutputBuilder,
  Amount,
  SColl,
  SLong,
  SByte,
  SInt,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';
import { blake2b256 } from '@fleet-sdk/crypto';
import { ActiveRaffleBuilder } from './activeRaffleBuilder';

/**
 * Builder class for creating Success Raffle boxes in the ErgoRaffle protocol
 * Success Raffle box represents a completed raffle
 *
 * Registers:
 *   R4[Coll[Long]]: [TotalPrize, totalSoldTickets, TxFee]
 *   R5[Int]: WinnersCount
 *   R6[Coll[Byte]]: ProjectErgoTreeHash
 *   R7[Coll[Coll[Byte]]]: [Seed, SelectedWinnersListHash]
 *   R8[Int]: Step
 * Tokens:
 *   0: RaffleLicense
 *   1: Ticket
 *   2: CollectingToken (if token-goal raffle)
 */
export class SuccessRaffleBuilder {
  private value?: bigint;
  private creationHeight?: number;
  private totalPrize?: bigint;
  private totalSoldTickets?: bigint;
  private txFee?: bigint;
  private winnerCount?: number;
  private projectErgoTreeHash?: Uint8Array;
  private seed?: Uint8Array;
  private step?: number;
  private ticketTokenId?: string;
  private ticketTokenAmount?: bigint;
  private collectingTokenId?: string;
  private collectingTokenAmount?: bigint;
  private selectedWinners: bigint[] = [];

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
   * Set the total prize amount
   * @param amount - Prize amount in nanoERG
   * @returns this builder instance
   */
  setTotalPrize = (amount: bigint): this => {
    this.totalPrize = amount;
    return this;
  };

  /**
   * Get the total prize amount
   * @returns Total prize amount in nanoERG
   */
  getTotalPrize = (): bigint => {
    return this.totalPrize!;
  };

  /**
   * Check if the raffle is an ERG goal raffle
   * @returns True if the raffle is an ERG goal raffle, false otherwise
   */
  isErgGoal = (): boolean => {
    return this.collectingTokenId === undefined;
  };

  /**
   * Set the total number of tickets sold
   * @param count - Number of tickets sold
   * @returns this builder instance
   */
  setTotalSoldTickets = (count: bigint): this => {
    this.totalSoldTickets = count;
    return this;
  };

  /**
   * Get the total number of tickets sold
   * @returns Total number of tickets sold
   */
  getTotalSoldTickets = (): bigint => {
    return this.totalSoldTickets!;
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
   * Set the winner count
   * @param count - Number of winners
   * @returns this builder instance
   */
  setWinnerCount = (count: number): this => {
    this.winnerCount = count;
    return this;
  };

  /**
   * Get the winner count
   * @returns The winner count
   */
  getWinnerCount = (): number => {
    return this.winnerCount!;
  };

  /**
   * Set the project ergo tree hash
   * @param hash - The project's ergo tree hash
   * @returns this builder instance
   */
  setProjectErgoTreeHash = (hash: Uint8Array): this => {
    this.projectErgoTreeHash = hash;
    return this;
  };

  /**
   * Set the project address and hash its ergoTree
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setProjectAddress = (address: string): this => {
    const ergoAddress = ErgoAddress.fromBase58(address);
    this.projectErgoTreeHash = blake2b256(
      Buffer.from(ergoAddress.ergoTree, 'hex'),
    );
    return this;
  };

  /**
   * Set the seed for winner selection
   * @param seed - The seed bytes
   * @returns this builder instance
   */
  setSeed = (seed: Uint8Array): this => {
    this.seed = seed;
    return this;
  };

  /**
   * Get the seed for winner selection
   * @returns The seed bytes
   */
  getSeed = (): Uint8Array => {
    return this.seed!;
  };

  /**
   * Set the current step
   * @param step - The current step number
   * @returns this builder instance
   */
  setStep = (step: number): this => {
    this.step = step;
    return this;
  };

  /**
   * Get the current step
   * @returns The current step number
   */
  getStep = (): number => {
    return this.step!;
  };

  /**
   * Set the ticket token ID
   * @param tokenId - The ticket token ID
   * @returns this builder instance
   */
  setTicketTokenId = (tokenId: string): this => {
    this.ticketTokenId = tokenId;
    return this;
  };

  /**
   * Get the ticket token ID
   * @returns The ticket token ID
   */
  getTicketTokenId = (): string => {
    return this.ticketTokenId!;
  };

  /**
   * Set the ticket token amount
   * @param amount - Ticket token amount
   * @returns this builder instance
   */
  setTicketTokenAmount = (amount: bigint): this => {
    this.ticketTokenAmount = amount;
    return this;
  };

  /**
   * Set the collecting token ID
   * @param tokenId - The collecting token ID
   * @returns this builder instance
   */
  setCollectingTokenId = (tokenId: string): this => {
    this.collectingTokenId = tokenId;
    return this;
  };

  /**
   * Set the collecting token amount
   * @param amount - Collecting token amount
   * @returns this builder instance
   */
  setCollectingTokenAmount = (amount: bigint): this => {
    this.collectingTokenAmount = amount;
    return this;
  };

  /**
   * Set the list of selected winners
   * @param winners - List of selected winner ticket indices
   * @returns this builder instance
   */
  setSelectedWinners = (winners: bigint[]): this => {
    this.selectedWinners = winners;
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (this.totalPrize == undefined) throw new Error('Total prize not set');
    if (this.totalSoldTickets === undefined)
      throw new Error('Total sold tickets not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnerCount) throw new Error('Winner count not set');
    if (!this.projectErgoTreeHash)
      throw new Error('Project ergo tree hash not set');
    if (!this.seed) throw new Error('Seed not set');
    if (!this.step) throw new Error('Step not set');
    if (!this.ticketTokenId) throw new Error('Ticket token ID not set');
    if (!this.ticketTokenAmount) throw new Error('Ticket token amount not set');
    if (this.selectedWinners.length > this.winnerCount!) {
      throw new Error('Selected winners count exceeds winner count');
    }
  };

  /**
   * Build an output box for the success raffle contract
   * Contains success raffle information and tokens
   * @returns OutputBuilder instance configured for the success raffle box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    const tokens = [
      {
        tokenId: raffleInfo.tokens.raffleLicense,
        amount: 1n,
      },
      {
        tokenId: this.ticketTokenId!,
        amount: this.ticketTokenAmount!,
      },
    ];

    // Add collecting token if set
    if (this.collectingTokenId && this.collectingTokenAmount) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenAmount,
      });
    }

    // Calculate selected winners list hash
    const selectedWinnersListHash = blake2b256(
      Buffer.concat(
        this.selectedWinners.map((n) =>
          Buffer.from(n.toString(16).padStart(16, '0'), 'hex'),
        ),
      ),
    );

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.successRaffle).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.totalPrize!,
          this.totalSoldTickets!,
          this.txFee!,
        ]).toHex(),
        R5: SInt(this.winnerCount!).toHex(),
        R6: SColl(SByte, Array.from(this.projectErgoTreeHash!)).toHex(),
        R7: SColl(SColl(SByte), [
          Array.from(this.seed!),
          Array.from(selectedWinnersListHash),
        ]).toHex(),
        R8: SInt(this.step!).toHex(),
      });
  };

  /**
   * Create a SuccessRaffleBuilder instance from an existing box
   * @param box - Existing success raffle box to copy configuration from
   * @returns New SuccessRaffleBuilder instance with copied configuration
   * @throws Error if box structure doesn't match success raffle box requirements
   */
  static fromBox = (box: Box<Amount>): SuccessRaffleBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid success raffle box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (
      !registers.R4 ||
      !registers.R5 ||
      !registers.R6 ||
      !registers.R7 ||
      !registers.R8
    ) {
      throw new Error('Invalid success raffle box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid success raffle box: invalid R4 register format');
    }

    const winnerCount = SConstant.from(registers.R5).data as number;
    const projectErgoTreeHash = SConstant.from(registers.R6).data as Uint8Array;
    const r7Data = SConstant.from(registers.R7).data as Uint8Array[];
    const step = SConstant.from(registers.R8).data as number;

    const builder = new SuccessRaffleBuilder()
      .setValue(BigInt(box.value))
      .setTotalPrize(r4Data[0])
      .setTotalSoldTickets(r4Data[1])
      .setTxFee(r4Data[2])
      .setWinnerCount(winnerCount)
      .setProjectErgoTreeHash(projectErgoTreeHash)
      .setSeed(Buffer.from(r7Data[0]))
      .setStep(step)
      .setTicketTokenId(box.assets[1].tokenId)
      .setTicketTokenAmount(BigInt(box.assets[1].amount));

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder
        .setCollectingTokenId(box.assets[2].tokenId)
        .setCollectingTokenAmount(BigInt(box.assets[2].amount));
    }

    return builder;
  };

  /**
   * Create a SuccessRaffleBuilder instance from an active raffle box
   * @param box - Active raffle box to read configuration from
   * @returns New SuccessRaffleBuilder instance with configuration from active raffle
   * @throws Error if box structure doesn't match active raffle box requirements
   */
  static fromActiveRaffleBox = (box: Box<Amount>): SuccessRaffleBuilder => {
    // Use ActiveRaffleBuilder to parse the box
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(box);

    // Calculate total prize based on winners percent
    const winnersPercent = activeRaffleBuilder.getWinnersPercent();
    const ticketPrice = activeRaffleBuilder.getTicketPrice();
    const txFee = activeRaffleBuilder.getTxFee();
    const totalSoldTickets = activeRaffleBuilder.getTotalSoldTickets();
    const totalRaised = ticketPrice * totalSoldTickets;
    const totalPrize = (totalRaised * winnersPercent) / 1000n;

    // Calculate fee amount
    const serviceFeePercent = activeRaffleBuilder.getServiceFeePercent();
    const implementerFeePercent =
      activeRaffleBuilder.getImplementerFeePercent();
    const totalFeePercent = serviceFeePercent + implementerFeePercent;
    const totalFeeAmount = (totalRaised * totalFeePercent) / 1000n;

    // Calculate success raffle value and collecting token amount
    const activeRaffleValue = BigInt(box.value);

    let successRaffleValue: bigint;
    let collectingTokenAmount: bigint | undefined;

    if (activeRaffleBuilder.isErgGoal()) {
      // For ERG goal raffles, deduct fees from ERG value
      successRaffleValue = activeRaffleValue - totalFeeAmount - 4n * txFee;
    } else {
      // For token goal raffles, keep ERG value but deduct fees from collecting token
      successRaffleValue = activeRaffleValue - 4n * txFee;
      const totalCollectingTokenAmount = BigInt(box.assets[2].amount);
      collectingTokenAmount = totalCollectingTokenAmount - totalFeeAmount;
    }

    const builder = new SuccessRaffleBuilder()
      .setValue(successRaffleValue)
      .setTotalPrize(totalPrize)
      .setTotalSoldTickets(totalSoldTickets)
      .setTxFee(txFee)
      .setWinnerCount(activeRaffleBuilder.getWinnersCount())
      .setProjectErgoTreeHash(activeRaffleBuilder.getProjectErgoTreeHash())
      .setStep(1)
      .setTicketTokenId(activeRaffleBuilder.getTicketId())
      .setTicketTokenAmount(activeRaffleBuilder.getTicketCount() + 1n);

    // Set collecting token if present
    const collectingTokenId = activeRaffleBuilder.getCollectingTokenId();
    if (collectingTokenId && collectingTokenAmount) {
      builder
        .setCollectingTokenId(collectingTokenId)
        .setCollectingTokenAmount(collectingTokenAmount);
    }

    return builder;
  };

  /**
   * Subtract prize from success raffle box when a winner is removed
   * Updates the box state by subtracting the winner's reward and updating the selected winners list
   * @param winnerBox - The winner box being removed
   * @param winnerTicketIndex - Index of the winning ticket
   * @returns Updated SuccessRaffleBuilder instance
   * @throws Error if required parameters are not set or invalid
   */
  subtractPrize = (prizeAmount: bigint): SuccessRaffleBuilder => {
    if (!this.value) throw new Error('Value not set');
    if (this.totalPrize == undefined) throw new Error('Total prize not set');
    if (!this.winnerCount) throw new Error('Winners count not set');
    if (!this.step) throw new Error('Step not set');
    if (!this.seed) throw new Error('Seed not set');
    if (!this.txFee) throw new Error('Transaction fee not set');

    // Create updated builder with only the changed parameters
    const updatedBuilder = this.setStep(this.step + 1);

    // For token goal raffles, subtract from collecting token amount instead of box value
    if (this.collectingTokenId && this.collectingTokenAmount) {
      updatedBuilder
        .setCollectingTokenAmount(this.collectingTokenAmount - prizeAmount)
        .setValue(this.value); // Keep box value unchanged
    } else {
      updatedBuilder.setValue(this.value - prizeAmount);
    }

    return updatedBuilder;
  };
}
