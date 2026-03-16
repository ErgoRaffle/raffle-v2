import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
  OutputBuilder,
  ErgoAddress,
  SColl,
  SLong,
  SByte,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { Buffer } from 'buffer';

import { raffleInfo } from '@ergo-raffle/contracts';

/**
 * Builder class for donation proxy funding transactions.
 */
export class DonationProxyTxBuilder {
  private feeBoxes: Box<Amount>[] = [];

  private donatorAddress?: string;
  private donatorErgoTree?: string;

  private ticketCount?: bigint;
  private ticketPrice?: bigint;
  private raffleId?: string;
  private txFee?: bigint;
  private expirationHeight?: number;
  private raffleDeadline?: number;
  private requiredTokenId?: string;
  private chainHeight?: number;

  /**
   * Set input fee boxes (funding boxes) for the transaction.
   * @param boxes - Funding boxes used as transaction inputs
   * @returns this builder instance
   */
  setFeeBoxes = (boxes: Box<Amount>[]): this => {
    this.feeBoxes = boxes;
    return this;
  };

  /**
   * Add a single fee box.
   * @param box - Box to add as funding input
   * @returns this builder instance
   */
  addFeeBox = (box: Box<Amount>): this => {
    this.feeBoxes.push(box);
    return this;
  };

  /**
   * Set the donator address (also used as change address).
   * @param address - Donator base58 address
   * @returns this builder instance
   */
  setDonatorAddress = (address: string): this => {
    this.donatorAddress = address;
    this.donatorErgoTree = ErgoAddress.fromBase58(address).ergoTree;
    return this;
  };

  /**
   * Set the ticket count to donate.
   * @param count - Ticket count
   * @returns this builder instance
   */
  setTicketCount = (count: bigint): this => {
    this.ticketCount = count;
    return this;
  };

  /**
   * Set the ticket price.
   * @param price - Ticket price in nanoERG or collecting token
   * @returns this builder instance
   */
  setTicketPrice = (price: bigint): this => {
    this.ticketPrice = price;
    return this;
  };

  /**
   * Set the raffle id.
   * @param raffleId - Raffle identifier (hex string)
   * @returns this builder instance
   */
  setRaffleId = (raffleId: string): this => {
    this.raffleId = raffleId;
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
   * Set the required token id for token-goal donations.
   * @param tokenId - Required token id in hex format
   * @returns this builder instance
   */
  setRequiredTokenId = (tokenId: string): this => {
    this.requiredTokenId = tokenId;
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
    if (this.feeBoxes.length === 0) throw new Error('Fee boxes not set');
    if (!this.donatorErgoTree) throw new Error('Donator ErgoTree not set');
    if (!this.donatorAddress) throw new Error('Donator address not set');
    if (!this.ticketCount) throw new Error('Ticket count not set');
    if (!this.ticketPrice) throw new Error('Ticket price not set');
    if (!this.raffleId) throw new Error('Raffle id not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.expirationHeight) throw new Error('Expiration height not set');
    if (!this.raffleDeadline) throw new Error('Raffle deadline not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
  };

  /**
   * Build the donation proxy output box.
   * @returns OutputBuilder instance for the proxy box
   */
  private buildDonationProxyBox = (): OutputBuilder => {
    const value =
      this.requiredTokenId != null
        ? this.txFee! * 4n
        : this.ticketPrice! * this.ticketCount! + this.txFee! * 4n;

    const tokens =
      this.requiredTokenId != null
        ? [
            {
              tokenId: this.requiredTokenId,
              amount: this.ticketPrice! * this.ticketCount!,
            },
          ]
        : [];

    const donatorHash = blake2b256(Buffer.from(this.donatorErgoTree!, 'hex'));

    let out = new OutputBuilder(
      value,
      ErgoAddress.fromBase58(raffleInfo.addresses.donationProxy).ergoTree,
    ).setAdditionalRegisters({
      R4: SColl(SLong, [
        BigInt(this.expirationHeight!),
        BigInt(this.raffleDeadline!),
        BigInt(this.ticketCount!),
        this.txFee!,
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(this.raffleId!, 'hex')),
        Array.from(donatorHash),
      ]).toHex(),
    });

    if (tokens.length > 0) out = out.addTokens(tokens);
    return out;
  };

  /**
   * Build the donation proxy funding transaction.
   * @returns ErgoUnsignedTransaction instance
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    const proxyBox = this.buildDonationProxyBox();

    const tx = new TransactionBuilder(this.chainHeight!)
      .from(this.feeBoxes)
      .to([proxyBox])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .sendChangeTo(this.donatorAddress!)
      .build();

    return tx;
  };
}
