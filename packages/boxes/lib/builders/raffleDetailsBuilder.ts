import {
  Box,
  OutputBuilder,
  TokenAmount,
  Amount,
  SColl,
  SLong,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';
import { SConstant } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';

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
  private ticketToken?: TokenAmount<bigint>;

  constructor() {}

  /**
   * Fill data from an inactive raffle box
   * @param inactiveRaffleBox - The inactive raffle box to get information from
   * @returns this builder instance
   * @throws Error if inactive raffle box is invalid
   */
  fromInactiveRaffle = (inactiveRaffleBox: Box<Amount>): this => {
    if (inactiveRaffleBox.assets.length < 1) {
      throw new Error('Invalid inactive raffle box: missing required tokens');
    }

    const registers = inactiveRaffleBox.additionalRegisters;
    if (!registers.R4 || !registers.R6 || !registers.R7) {
      throw new Error(
        'Invalid inactive raffle box: missing required registers',
      );
    }

    // Get raffle details from R6
    const r6Data = SConstant.from(registers.R6).data as Uint8Array[];
    if (r6Data.length < 2) {
      throw new Error(
        'Invalid inactive raffle box: invalid R6 register format',
      );
    }

    // Extract name and description
    const name = Buffer.from(r6Data[0]).toString();
    const description = Buffer.from(r6Data[1]).toString();

    // Extract any pictures
    const pictures = r6Data.slice(2).map((arr) => Buffer.from(arr).toString());

    // Get ticket ID from R7
    const r7Data = SConstant.from(registers.R7).data as Uint8Array[];
    if (r7Data.length < 1) {
      throw new Error(
        'Invalid inactive raffle box: invalid R7 register format',
      );
    }
    const ticketId = Buffer.from(r7Data[0]).toString('hex');

    // Get txFee from R4 for value calculation
    const r4Data = SConstant.from(registers.R4).data as bigint[];
    if (r4Data.length < 7) {
      throw new Error(
        'Invalid inactive raffle box: invalid R4 register format',
      );
    }
    const txFee = r4Data[6];

    this.setName(name)
      .setDescription(description)
      .setValue(txFee)
      .setTicketToken(ticketId, 1n);

    // Add all pictures
    pictures.forEach((pic) => this.addPicture(pic));

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
  setTicketToken = (tokenId: string, amount: bigint): this => {
    this.ticketToken = {
      tokenId,
      amount,
    };
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
    if (!this.ticketToken) throw new Error('Ticket token not set');
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
      .addTokens([this.ticketToken!])
      .setAdditionalRegisters({
        R4: SColl(SColl(SByte), r4Data).toHex(),
      });
  };

  /**
   * Create a RaffleDetailsBuilder instance from an existing box
   * @param box - Existing raffle details box to copy configuration from
   * @returns New RaffleDetailsBuilder instance with copied configuration
   * @throws Error if box structure doesn't match raffle details box requirements
   */
  static fromBox(box: Box<Amount>): RaffleDetailsBuilder {
    if (box.assets.length < 1) {
      throw new Error('Invalid raffle details box: missing required tokens');
    }

    const registers = box.additionalRegisters;
    if (!registers.R4) {
      throw new Error('Invalid raffle details box: missing required registers');
    }

    const r4Data = SConstant.from(registers.R4).data as Uint8Array[];
    if (r4Data.length < 5) {
      throw new Error('Invalid raffle details box: invalid R4 register format');
    }

    const builder = new RaffleDetailsBuilder();
    builder.value = BigInt(box.value);
    builder.creationHeight = box.creationHeight;
    builder.name = Buffer.from(r4Data[0]).toString();
    builder.description = Buffer.from(r4Data[1]).toString();
    builder.pictures = r4Data
      .slice(2)
      .map((arr) => Buffer.from(arr).toString());
    builder.ticketToken = {
      tokenId: box.assets[0].tokenId,
      amount: 1n,
    };
    return builder;
  }
}
