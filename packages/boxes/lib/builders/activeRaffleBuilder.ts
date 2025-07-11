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

/**
 * Builder class for creating Active Raffle boxes in the ErgoRaffle protocol
 * Active Raffle box holds the raffle state while it's running
 *
 * Registers:
 *   R4[Coll[Long]]: [WinnersPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, Deadline, txFee]
 *   R5[Coll[Coll[Byte]]]: [ServiceErgoTreeHash, ImplementerErgoTreeHash, ProjectErgoTreeHash]
 *   R6[Int]: WinnersCount
 *   R7[Long]: TotalSoldTickets
 * Tokens:
 *   0: RaffleLicense
 *   1: Ticket
 *   2: CollectingToken (if token-goal raffle)
 */
export class ActiveRaffleBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private winnersPercent?: bigint;
  private serviceFeePercent?: bigint;
  private implementerFeePercent?: bigint;
  private ticketPrice?: bigint;
  private goal?: bigint;
  private deadline?: bigint;
  private txFee?: bigint;
  private winnersCount?: number;
  private totalSoldTickets?: bigint;
  private serviceErgoTreeHash?: Uint8Array;
  private implementerErgoTreeHash?: Uint8Array;
  private projectErgoTreeHash?: Uint8Array;
  private collectingTokenId?: string;
  private ticketId?: string;
  private ticketCount?: bigint;
  private collectingTokenCount?: bigint;

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
  setWinnersPercent = (percent: bigint): this => {
    this.winnersPercent = percent;
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
   * Set the ticket price in nanoERG/CollectingToken
   * @param price - Price in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Get the ticket price in nanoERG/CollectingToken
   * @returns Ticket price in nanoERG/CollectingToken
   */
  getTicketPrice = (): bigint => {
    return this.ticketPrice!;
  };

  /**
   * Set the raffle goal in nanoERG/CollectingToken
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
   * Get the raffle deadline in blocks
   * @returns Deadline in blocks
   */
  getDeadline = (): bigint => {
    return this.deadline!;
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
   * Set the number of winners
   * @param count - Number of winners
   * @returns this builder instance
   */
  setWinnersCount = (count: number): this => {
    this.winnersCount = count;
    return this;
  };

  /**
   * Get the number of winners
   * @returns Number of winners
   */
  getWinnersCount = (): number => {
    return this.winnersCount!;
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
   * Set the service address and hash its ergoTree
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setServiceAddress = (address: string): this => {
    const ergoAddress = ErgoAddress.fromBase58(address);
    this.serviceErgoTreeHash = blake2b256(
      Buffer.from(ergoAddress.ergoTree, 'hex'),
    );
    return this;
  };

  /**
   * Set the implementer address and hash its ergoTree
   * @param address - Base58 encoded Ergo address
   * @returns this builder instance
   */
  setImplementerAddress = (address: string): this => {
    const ergoAddress = ErgoAddress.fromBase58(address);
    this.implementerErgoTreeHash = blake2b256(
      Buffer.from(ergoAddress.ergoTree, 'hex'),
    );
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
   * Set the collecting token ID for token-goal raffles
   * @param tokenId - The token ID to collect
   * @returns this builder instance
   */
  setCollectingTokenId = (tokenId: string): this => {
    this.collectingTokenId = tokenId;
    return this;
  };

  /**
   * Set the ticket token ID
   * @param tokenId - The ticket token ID
   * @returns this builder instance
   */
  setTicketId = (tokenId: string): this => {
    this.ticketId = tokenId;
    return this;
  };

  /**
   * Set the ticket token count
   * @param count - Number of ticket tokens
   * @returns this builder instance
   */
  setTicketCount = (count: bigint): this => {
    this.ticketCount = count;
    return this;
  };

  /**
   * Set the collecting token count
   * @param count - Number of collecting tokens
   * @returns this builder instance
   */
  setCollectingTokenCount = (count: bigint): this => {
    this.collectingTokenCount = count;
    return this;
  };

  /**
   * Handle a donation by decreasing ticket tokens and updating total sold tickets
   * For ERG goal raffles: increases box value by ticketPrice * ticketCount
   * For token goal raffles: increases collecting token amount by ticketPrice * ticketCount
   * @param ticketCount - Number of tickets being donated
   * @returns this builder instance
   * @throws Error if ticket count is not set or insufficient tickets available
   */
  donate = (ticketCount: bigint): this => {
    if (!this.ticketCount) {
      throw new Error('Ticket count not set');
    }
    if (this.ticketCount < ticketCount) {
      throw new Error('Insufficient tickets available');
    }
    if (!this.totalSoldTickets) {
      throw new Error('Total sold tickets not set');
    }
    if (!this.ticketPrice) {
      throw new Error('Ticket price not set');
    }

    // Update ticket counts
    this.ticketCount = this.ticketCount - ticketCount;
    this.totalSoldTickets = this.totalSoldTickets + ticketCount;

    // Calculate donation amount
    const donationAmount = this.ticketPrice * ticketCount;

    if (this.collectingTokenId) {
      // Token goal raffle: increase collecting token amount
      if (!this.collectingTokenCount) {
        throw new Error('Collecting token count not set');
      }
      this.collectingTokenCount = this.collectingTokenCount + donationAmount;
    } else {
      // ERG goal raffle: increase box value
      if (!this.value) {
        throw new Error('Box value not set');
      }
      this.value = this.value + donationAmount;
    }

    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.winnersPercent) throw new Error('Winners percent not set');
    if (!this.serviceFeePercent) throw new Error('Service fee percent not set');
    if (!this.implementerFeePercent)
      throw new Error('Implementer fee percent not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.goal) throw new Error('Goal not set');
    if (!this.deadline) throw new Error('Deadline not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.winnersCount) throw new Error('Winners count not set');
    if (this.totalSoldTickets === undefined)
      throw new Error('Total sold tickets not set');
    if (!this.serviceErgoTreeHash)
      throw new Error('Service ergoTree hash not set');
    if (!this.implementerErgoTreeHash)
      throw new Error('Implementer ergoTree hash not set');
    if (!this.projectErgoTreeHash)
      throw new Error('Project ergoTree hash not set');
    if (!this.ticketId) throw new Error('Ticket ID not set');
    if (!this.ticketCount) throw new Error('Ticket count not set');
    if (this.collectingTokenId && !this.collectingTokenCount)
      throw new Error(
        'Collecting token count not set when collecting token ID is set',
      );
  };

  /**
   * Build an output box for the active raffle contract
   * Contains raffle state and configuration
   * @returns OutputBuilder instance configured for the active raffle box
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
        tokenId: this.ticketId!,
        amount: this.ticketCount!,
      },
    ];

    // Only add collecting token if its ID is set
    if (this.collectingTokenId) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenCount!,
      });
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.activeRaffle).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.winnersPercent!,
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
          Array.from(this.projectErgoTreeHash!),
        ]).toHex(),
        R6: SInt(this.winnersCount!).toHex(),
        R7: SLong(this.totalSoldTickets!).toHex(),
      });
  };

  /**
   * Create an ActiveRaffleBuilder instance from an existing box
   * @param box - Existing active raffle box to copy configuration from
   * @returns New ActiveRaffleBuilder instance with copied configuration
   * @throws Error if box structure doesn't match active raffle box requirements
   */
  static fromBox = (box: Box<Amount>): ActiveRaffleBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid active raffle box: missing required tokens');
    }

    if (box.assets.length > 3) {
      throw new Error('Invalid active raffle box: too many tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6 || !registers.R7) {
      throw new Error('Invalid active raffle box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    const r5Data = SConstant.from(registers.R5).data as Uint8Array[];
    const r6Data = SConstant.from(registers.R6).data as number;
    const r7Data = SConstant.from(registers.R7).data as bigint;

    if (r4Data.length < 7) {
      throw new Error('Invalid active raffle box: invalid R4 register format');
    }

    if (r5Data.length < 3) {
      throw new Error('Invalid active raffle box: invalid R5 register format');
    }

    const builder = new ActiveRaffleBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value))
      .setWinnersPercent(r4Data[0])
      .setServiceFeePercent(r4Data[1])
      .setImplementerFeePercent(r4Data[2])
      .setTicketPrice(r4Data[3])
      .setGoal(r4Data[4])
      .setDeadline(r4Data[5])
      .setTxFee(r4Data[6])
      .setWinnersCount(r6Data)
      .setTotalSoldTickets(r7Data)
      .setTicketId(box.assets[1].tokenId)
      .setTicketCount(BigInt(box.assets[1].amount));

    // Set ergoTree hashes
    builder.serviceErgoTreeHash = r5Data[0];
    builder.implementerErgoTreeHash = r5Data[1];
    builder.projectErgoTreeHash = r5Data[2];

    // Set collecting token ID and count if present
    if (box.assets.length > 2) {
      builder
        .setCollectingTokenId(box.assets[2].tokenId)
        .setCollectingTokenCount(BigInt(box.assets[2].amount));
    }

    return builder;
  };

  /**
   * Create an ActiveRaffleBuilder instance from an inactive raffle box
   * @param box - Inactive raffle box to read configuration from
   * @returns New ActiveRaffleBuilder instance with configuration from inactive raffle
   * @throws Error if box structure doesn't match inactive raffle box requirements
   */
  static fromInactiveRaffleBox = (box: Box<Amount>): ActiveRaffleBuilder => {
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

    if (r7Data.length < 2) {
      throw new Error(
        'Invalid inactive raffle box: invalid R7 register format',
      );
    }

    const builder = new ActiveRaffleBuilder();

    // Set all parameters using setters
    builder
      .setValue(BigInt(box.value) - 5n * r4Data[6] * BigInt(r8Data) - r4Data[6]) // Value calculation from contract
      .setWinnersPercent(r4Data[0])
      .setServiceFeePercent(r4Data[1])
      .setImplementerFeePercent(r4Data[2])
      .setTicketPrice(r4Data[3])
      .setGoal(r4Data[4])
      .setDeadline(r4Data[5])
      .setTxFee(r4Data[6])
      .setWinnersCount(r8Data)
      .setTotalSoldTickets(0n) // No sold tickets at beginning
      .setTicketId(Buffer.from(r7Data[0]).toString('hex'));

    // Set ergoTree hashes
    builder.serviceErgoTreeHash = r5Data[0];
    builder.implementerErgoTreeHash = r5Data[1];
    builder.projectErgoTreeHash = r5Data[2];

    // Set collecting token ID and count if present
    if (box.assets.length > 1) {
      builder
        .setCollectingTokenId(box.assets[1].tokenId)
        .setCollectingTokenCount(BigInt(box.assets[1].amount));
    }

    return builder;
  };
}
