import {
  OutputBuilder,
  SColl,
  SLong,
  SByte,
  ErgoAddress,
  Box,
  Amount,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { raffleInfo } from '@ergo-raffle/contracts';
import { SConstant } from '@fleet-sdk/serializer';

/**
 * Builder class for creating Ticket boxes in the ErgoRaffle protocol
 * Ticket box represents a participant's entry in a raffle
 *
 * Registers:
 *   R4[Coll[Byte]]: DonatorErgoTreeHash
 *   R5[Coll[Long]]: [RangeStart, RangeEnd, TicketPrice, Deadline]
 * Tokens:
 *   0: Ticket (amount = ticketCount)
 */
export class TicketBuilder {
  // Private fields
  private donatorErgoTreeHash?: Uint8Array;
  private rangeStart?: bigint;
  private rangeEnd?: bigint;
  private ticketPrice?: bigint;
  private deadline?: bigint;
  private ticketCount?: bigint;
  private value?: bigint;
  private creationHeight?: number;
  private txFee?: bigint;

  constructor() {}

  /**
   * Configure the builder for donating to a specific raffle
   * @param activeRaffleBox - The active raffle box to donate to
   * @returns this builder instance
   * @throws Error if active raffle box is invalid
   */
  donateToRaffle = (activeRaffleBox: Box<Amount>): this => {
    if (activeRaffleBox.assets.length < 2) {
      throw new Error('Invalid active raffle box: missing required tokens');
    }

    const registers = activeRaffleBox.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6 || !registers.R7) {
      throw new Error('Invalid active raffle box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 7) {
      throw new Error('Invalid active raffle box: invalid R4 register format');
    }

    const ticketPrice = r4Data[3];
    const deadline = r4Data[5];
    const txFee = r4Data[6];
    const totalSoldTickets = SConstant.from(registers.R7).data as bigint;

    // Calculate required value (3 * txFee as per contract)
    const requiredValue = 3n * txFee;

    this.setRangeStart(totalSoldTickets)
      .setTicketPrice(ticketPrice)
      .setDeadline(deadline)
      .setTxFee(txFee)
      .setValue(requiredValue);

    return this;
  };

  /**
   * Set the donator's address and convert it to ErgoTree hash
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
   * Set the ticket range start
   * @param start - Starting number of the ticket range
   * @returns this builder instance
   */
  setRangeStart = (start: bigint): this => {
    this.rangeStart = start;
    return this;
  };

  /**
   * Set the number of tickets and update range end
   * @param count - Number of tickets to create
   * @returns this builder instance
   * @throws Error if range start is not set
   */
  setTicketCount = (count: bigint): this => {
    if (!this.rangeStart) {
      throw new Error('Range start must be set before setting ticket count');
    }
    this.ticketCount = count;
    this.rangeEnd = this.rangeStart + count;
    return this;
  };

  /**
   * Set the ticket price
   * @param price - Price per ticket in nanoERG/CollectingToken
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Set the raffle deadline
   * @param deadline - Block height when raffle expires
   * @returns this builder instance
   */
  setDeadline = (deadline: bigint): this => {
    this.deadline = deadline;
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
   * Set the transaction fee (optional only used for validation)
   * @param fee - Transaction fee in nanoERG
   * @returns this builder instance
   */
  setTxFee = (fee: bigint): this => {
    this.txFee = fee;
    return this;
  };

  /**
   * Validate that all required parameters are set and consistent
   * @throws Error if any required parameter is missing or inconsistent
   */
  private validate = (): void => {
    if (!this.donatorErgoTreeHash) throw new Error('Donator address not set');
    if (!this.rangeStart) throw new Error('Range start not set');
    if (!this.rangeEnd) throw new Error('Range end not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.deadline) throw new Error('Deadline not set');
    if (!this.ticketCount) throw new Error('Ticket count not set');
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');

    // Validate range consistency
    if (this.rangeEnd! - this.rangeStart! !== this.ticketCount!) {
      throw new Error('Range end must be range start plus ticket count');
    }

    // Validate value constraint: value >= 3 * txFee
    const minimumValue = 3n * this.txFee!;
    if (this.txFee && this.value < 3n * this.txFee) {
      throw new Error(
        `Value is too low. Minimum required: ${minimumValue} nanoERG (3 * txFee)`,
      );
    }
  };

  /**
   * Build an output box for the ticket contract
   * Contains ticket information and NFT
   * @returns OutputBuilder instance configured for the ticket box
   * @throws Error if any required parameter is missing or inconsistent
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.ticket).ergoTree,
      this.creationHeight!,
    )
      .addTokens([
        {
          tokenId: raffleInfo.tokens.ticketCollectorNft,
          amount: this.ticketCount!,
        },
      ])
      .setAdditionalRegisters({
        R4: SColl(SByte, Array.from(this.donatorErgoTreeHash!)).toHex(),
        R5: SColl(SLong, [
          this.rangeStart!,
          this.rangeEnd!,
          this.ticketPrice!,
          this.deadline!,
        ]).toHex(),
      });
  };
}
