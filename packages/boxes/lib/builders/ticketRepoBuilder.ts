import { OutputBuilder, SColl, SByte, ErgoAddress } from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for creating Ticket Repository boxes in the ErgoRaffle protocol
 * Ticket Repository box holds the ticket tokens for distribution
 *
 * Registers:
 *   R4[Coll[Byte]]: tokenName
 *   R5[Coll[Byte]]: tokenDescription
 *   R6[Coll[Byte]]: Decimals (0)
 * Tokens:
 *   0: Ticket
 */
export class TicketRepoBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private ticketTokenAmount?: bigint;
  private raffleId?: string;
  private tokenName?: string;
  private tokenDescription?: string;
  private txFee?: bigint;

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
   * Set the ticket token amount
   * @param amount - Number of ticket tokens
   * @returns this builder instance
   */
  setTicketTokenAmount = (amount: bigint): this => {
    this.ticketTokenAmount = amount;
    return this;
  };

  /**
   * Set the raffle ID
   * @param id - Raffle ID
   * @returns this builder instance
   */
  setRaffleId = (id: string): this => {
    this.raffleId = id;
    return this;
  };

  /**
   * Set the token name
   * @param name - Name of the ticket token
   * @returns this builder instance
   */
  setTokenName = (name: string): this => {
    this.tokenName = name;
    return this;
  };

  /**
   * Set the token description
   * @param description - Description of the ticket token
   * @returns this builder instance
   */
  setTokenDescription = (description: string): this => {
    this.tokenDescription = description;
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
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.value) throw new Error('Value not set');
    if (!this.creationHeight) throw new Error('Creation height not set');
    if (!this.ticketTokenAmount) throw new Error('Ticket token amount not set');
    if (!this.raffleId) throw new Error('Raffle ID not set');
    if (!this.tokenName) throw new Error('Token name not set');
    if (!this.tokenDescription) throw new Error('Token description not set');

    // Validate value constraint: value == txFee (as per contract)
    if (this.txFee && this.value !== this.txFee) {
      throw new Error(`Value must be exactly ${this.txFee} nanoERG (txFee)`);
    }
  };

  /**
   * Build an output box for the ticket repository contract
   * Contains ticket tokens
   * @returns OutputBuilder instance configured for the ticket repository box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.ticketRepo).ergoTree,
      this.creationHeight!,
    )
      .addTokens([
        {
          tokenId: this.raffleId!,
          amount: this.ticketTokenAmount!,
        },
      ])
      .setAdditionalRegisters({
        R4: SColl(SByte, Array.from(Buffer.from(this.tokenName!))).toHex(),
        R5: SColl(
          SByte,
          Array.from(Buffer.from(this.tokenDescription!)),
        ).toHex(),
        R6: SColl(SByte, Array.from(Buffer.from('0'))).toHex(), // Decimals (0)
      });
  };
}
