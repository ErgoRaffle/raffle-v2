import {
  Box,
  OutputBuilder,
  Amount,
  SColl,
  SLong,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating Ticket Redeem boxes in the ErgoRaffle protocol
 * Ticket Redeem box represents a ticket that is being redeemed
 *
 * Registers:
 *   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, TxFee]
 *   R5[Long]: RedeemedTickets
 * Tokens:
 *   0: RaffleLicense
 *   1: Ticket
 *   2: CollectingToken (if token-goal raffle)
 */
export class TicketRedeemBuilder {
  private value?: bigint;
  private creationHeight?: number;
  private totalSoldTickets?: bigint;
  private ticketPrice?: bigint;
  private txFee?: bigint;
  private redeemedTickets?: bigint;
  private collectingTokenId?: string;
  private collectingTokenAmount?: bigint;
  private ticketTokenId?: string;
  private ticketTokenCount?: bigint;

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
   * Set the total number of sold tickets
   * @param count - Total ticket count
   * @returns this builder instance
   */
  setTotalSoldTickets = (count: bigint): this => {
    this.totalSoldTickets = count;
    return this;
  };

  /**
   * Set the ticket price
   * @param price - Price in nanoERG
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
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
   * Set the number of redeemed tickets
   * @param count - Redeemed ticket count
   * @returns this builder instance
   */
  setRedeemedTickets = (count: bigint): this => {
    this.redeemedTickets = count;
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
   * Set the ticket token ID
   * @param tokenId - The ticket token ID
   * @returns this builder instance
   */
  setTicketTokenId = (tokenId: string): this => {
    this.ticketTokenId = tokenId;
    return this;
  };

  /**
   * Set the ticket token count
   * @param count - Number of ticket tokens
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
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.totalSoldTickets) throw new Error('Total sold tickets not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.redeemedTickets) throw new Error('Redeemed tickets not set');
    if (!this.ticketTokenId) throw new Error('Ticket token ID not set');
    if (!this.ticketTokenCount) throw new Error('Ticket token count not set');
  };

  /**
   * Build an output box for the ticket redeem contract
   * Contains ticket redeem information and tokens
   * @returns OutputBuilder instance configured for the ticket redeem box
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
        amount: this.ticketTokenCount!,
      },
    ];

    // Add collecting token if set
    if (this.collectingTokenId && this.collectingTokenAmount) {
      tokens.push({
        tokenId: this.collectingTokenId,
        amount: this.collectingTokenAmount,
      });
    }

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.ticketRedeem).ergoTree,
      this.creationHeight!,
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          this.totalSoldTickets!,
          this.ticketPrice!,
          this.txFee!,
        ]).toHex(),
        R5: SLong(this.redeemedTickets!).toHex(),
      });
  };

  /**
   * Create a TicketRedeemBuilder instance from an existing box
   * @param box - Existing ticket redeem box to copy configuration from
   * @returns New TicketRedeemBuilder instance with copied configuration
   * @throws Error if box structure doesn't match ticket redeem box requirements
   */
  static fromBox = (box: Box<Amount>): TicketRedeemBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid ticket redeem box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5) {
      throw new Error('Invalid ticket redeem box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid ticket redeem box: invalid R4 register format');
    }

    const redeemedTickets = SConstant.from(registers.R5).data as bigint;

    const builder = new TicketRedeemBuilder()
      .setValue(BigInt(box.value))
      .setTotalSoldTickets(r4Data[0])
      .setTicketPrice(r4Data[1])
      .setTxFee(r4Data[2])
      .setRedeemedTickets(redeemedTickets)
      .setTicketTokenId(box.assets[1].tokenId)
      .setTicketTokenCount(BigInt(box.assets[1].amount));

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder
        .setCollectingTokenId(box.assets[2].tokenId)
        .setCollectingTokenAmount(BigInt(box.assets[2].amount));
    }

    return builder;
  };

  /**
   * Create a TicketRedeemBuilder instance from a gift redeem box
   * @param box - Gift redeem box to read configuration from
   * @returns New TicketRedeemBuilder instance with configuration from gift redeem box
   * @throws Error if box structure doesn't match gift redeem box requirements
   */
  static fromGiftRedeemBox = (box: Box<Amount>): TicketRedeemBuilder => {
    if (box.assets.length < 2) {
      throw new Error('Invalid gift redeem box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4 || !registers.R5 || !registers.R6) {
      throw new Error('Invalid gift redeem box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 3) {
      throw new Error('Invalid gift redeem box: invalid R4 register format');
    }

    const builder = new TicketRedeemBuilder()
      .setValue(BigInt(box.value))
      .setTotalSoldTickets(r4Data[0])
      .setTicketPrice(r4Data[1])
      .setTxFee(r4Data[2])
      .setRedeemedTickets(0n) // Start with 0 redeemed tickets
      .setTicketTokenId(box.assets[1].tokenId)
      .setTicketTokenCount(BigInt(box.assets[1].amount));

    // Set collecting token if present
    if (box.assets.length > 2) {
      builder
        .setCollectingTokenId(box.assets[2].tokenId)
        .setCollectingTokenAmount(BigInt(box.assets[2].amount));
    }

    return builder;
  };

  /**
   * Redeem tickets and update box value or collecting tokens
   * @param ticketCount - Number of tickets to redeem
   * @returns Updated builder with reduced value or collecting tokens
   * @throws Error if ticket token ID or count is not set, or if ticket count exceeds available tickets
   */
  redeemTickets = (ticketCount: bigint): TicketRedeemBuilder => {
    if (!this.ticketTokenId) {
      throw new Error('Ticket token ID not set');
    }
    if (!this.ticketTokenCount) {
      throw new Error('Ticket token count not set');
    }
    if (!this.ticketPrice) {
      throw new Error('Ticket price not set');
    }
    if (!this.value) {
      throw new Error('Box value not set');
    }
    if (ticketCount > this.ticketTokenCount) {
      throw new Error('Requested ticket count exceeds available tickets');
    }

    // Calculate value to deduct
    const valueToDeduct = ticketCount * this.ticketPrice;

    // Create updated builder with changed values
    const updatedBuilder = new TicketRedeemBuilder()
      .setRedeemedTickets((this.redeemedTickets || 0n) + ticketCount)
      .setTicketTokenCount(this.ticketTokenCount + ticketCount);

    // Deduct value from box value or collecting tokens
    if (this.collectingTokenId && this.collectingTokenAmount) {
      // Token-goal raffle: deduct from collecting tokens
      updatedBuilder.setCollectingTokenAmount(
        this.collectingTokenAmount - valueToDeduct,
      );
    } else {
      // ERG-goal raffle: deduct from box value
      updatedBuilder.setValue(this.value - valueToDeduct);
    }

    return updatedBuilder;
  };
}
