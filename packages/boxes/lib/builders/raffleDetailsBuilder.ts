import {
  Box,
  OutputBuilder,
  Amount,
  SColl,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';
import { InactiveRaffleBuilder } from './inactiveRaffleBuilder';

/**
 * Builder class for creating Raffle Details boxes in the ErgoRaffle protocol
 * Raffle Details box holds additional information about a raffle
 *
 * Registers:
 *   R4[Coll[Coll[Byte]]]: [Name, Description, Pictures(optional)]
 * Tokens:
 *   0: Ticket
 */
export class RaffleDetailsBuilder {
  // Private fields
  private value?: bigint;
  private creationHeight?: number;
  private name?: string;
  private description?: string;
  private pictures: string[] = [];
  private ticketTokenId?: string;
  private ticketTokenAmount?: bigint;
  private txFee?: bigint;

  constructor() {}

  /**
   * Fill data from an inactive raffle box
   * @param inactiveRaffleBox - The inactive raffle box to get information from
   * @returns New RaffleDetailsBuilder instance with data from inactive raffle
   * @throws Error if inactive raffle box is invalid
   */
  static fromInactiveRaffle = (
    inactiveRaffleBox: Box<Amount>,
  ): RaffleDetailsBuilder => {
    // Use InactiveRaffleBuilder to parse the box
    const inactiveRaffleBuilder =
      InactiveRaffleBuilder.fromBox(inactiveRaffleBox);

    const builder = new RaffleDetailsBuilder();
    builder
      .setName(inactiveRaffleBuilder.getName())
      .setDescription(inactiveRaffleBuilder.getDescription())
      .setValue(inactiveRaffleBuilder.getTxFee())
      .setTicketToken(inactiveRaffleBuilder.getTicketId(), 1n)
      .setTxFee(inactiveRaffleBuilder.getTxFee());

    // Add all pictures
    inactiveRaffleBuilder
      .getPictures()
      .forEach((pic: string) => builder.addPicture(pic));

    return builder;
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
   * Set the raffle name
   * @param name - Name string
   * @returns this builder instance
   */
  setName = (name: string): this => {
    this.name = name;
    return this;
  };

  /**
   * Set the raffle description
   * @param description - Description string
   * @returns this builder instance
   */
  setDescription = (description: string): this => {
    this.description = description;
    return this;
  };

  /**
   * Add a picture to the raffle details
   * @param picture - Picture content
   * @returns this builder instance
   */
  addPicture = (picture: string): this => {
    this.pictures.push(picture);
    return this;
  };

  /**
   * Set the ticket token
   * @param tokenId - Token ID of the ticket
   * @param amount - Amount of tickets
   * @returns this builder instance
   */
  setTicketToken = (tokenId: string, amount: bigint = 1n): this => {
    this.ticketTokenId = tokenId;
    this.ticketTokenAmount = amount;
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
    if (!this.name) throw new Error('Name not set');
    if (!this.description) throw new Error('Description not set');
    if (!this.ticketTokenId) throw new Error('Ticket token not set');
    if (!this.ticketTokenAmount) throw new Error('Ticket token amount not set');

    // Validate value constraint: value == txFee (as per contract)
    if (this.txFee && this.value !== this.txFee) {
      throw new Error(`Value must be exactly ${this.txFee} nanoERG (txFee)`);
    }
  };

  /**
   * Build an output box for the raffle details contract
   * Contains raffle details information and NFT
   * @returns OutputBuilder instance configured for the raffle details box
   * @throws Error if any required parameter is missing
   */
  build = (): OutputBuilder => {
    this.validate();

    // Convert strings to byte arrays
    const nameBytes = Array.from(Buffer.from(this.name!));
    const descriptionBytes = Array.from(Buffer.from(this.description!));
    const pictureBytes = this.pictures.map((pic) =>
      Array.from(Buffer.from(pic)),
    );

    // Combine all byte arrays for R4
    const r4Data = [nameBytes, descriptionBytes, ...pictureBytes];

    return new OutputBuilder(
      this.value!,
      ErgoAddress.fromBase58(raffleInfo.addresses.raffleDetails).ergoTree,
      this.creationHeight!,
    )
      .addTokens([
        { tokenId: this.ticketTokenId!, amount: this.ticketTokenAmount! },
      ])
      .setAdditionalRegisters({
        R4: SColl(SColl(SByte), r4Data).toHex(),
      });
  };
}
