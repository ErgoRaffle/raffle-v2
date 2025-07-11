import {
  TransactionBuilder,
  Box,
  Amount,
  ErgoUnsignedTransaction,
} from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';

// Import box builders from the boxes package
import { ActiveRaffleBuilder } from '@ergo-raffle/boxes';
import { RaffleDetailsBuilder } from '@ergo-raffle/boxes';
import { GiftTokenRepoBuilder } from '@ergo-raffle/boxes';
import { WinnerBuilder } from '@ergo-raffle/boxes';

/**
 * Builder class for creating raffle activation transactions
 * This builder creates a transaction that:
 * 1. Takes an inactive raffle box and ticket repo box as inputs
 * 2. Creates an active raffle box
 * 3. Creates a raffle details box
 * 4. Creates a gift token repository box
 * 5. Creates winner boxes for each winner
 */
export class ActivationTxBuilder {
  // Private fields for transaction configuration
  private inactiveRaffle?: Box<Amount>;
  private ticketRepo?: Box<Amount>;
  private winnersSharePercent?: bigint[];
  private chainHeight?: number;
  private txFee?: bigint;
  private giftTokenId?: string;
  private ticketTokenId?: string;
  private winnersCount?: number;
  private giftTokenName?: Buffer;
  private giftTokenDescription?: Buffer;

  constructor() {}

  /**
   * Set the inactive raffle box input
   * @param inactiveRaffle - The inactive raffle box to spend
   * @returns this builder instance
   */
  setInactiveRaffle = (inactiveRaffle: Box<Amount>): this => {
    this.inactiveRaffle = inactiveRaffle;
    this.giftTokenId = inactiveRaffle.boxId.toString();
    return this;
  };

  /**
   * Set the ticket repository box input
   * @param ticketRepo - The ticket repository box to spend
   * @returns this builder instance
   */
  setTicketRepo = (ticketRepo: Box<Amount>): this => {
    this.ticketRepo = ticketRepo;
    this.ticketTokenId = ticketRepo.assets[0].tokenId;
    return this;
  };

  /**
   * Set the winners share percentage list
   * @param percentages - Array of winner percentages (in thousandths)
   * @returns this builder instance
   */
  setWinnersSharePercent = (percentages: bigint[]): this => {
    this.winnersSharePercent = percentages;
    this.winnersCount = percentages.length;
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
   * Set the gift token name
   * @param name - Gift token name as string
   * @returns this builder instance
   */
  setGiftTokenName = (name: string): this => {
    this.giftTokenName = Buffer.from(name, 'utf-8');
    return this;
  };

  /**
   * Set the gift token description
   * @param description - Gift token description as string
   * @returns this builder instance
   */
  setGiftTokenDescription = (description: string): this => {
    this.giftTokenDescription = Buffer.from(description, 'utf-8');
    return this;
  };

  /**
   * Validate that all required parameters are set
   * @throws Error if any required parameter is missing
   */
  private validate = (): void => {
    if (!this.inactiveRaffle) throw new Error('Inactive raffle box not set');
    if (!this.ticketRepo) throw new Error('Ticket repository box not set');
    if (!this.winnersSharePercent)
      throw new Error('Winners share percent not set');
    if (!this.chainHeight) throw new Error('Chain height not set');
    if (!this.txFee) throw new Error('Transaction fee not set');
    if (!this.giftTokenName) throw new Error('Gift token name not set');
    if (!this.giftTokenDescription)
      throw new Error('Gift token description not set');
  };

  /**
   * Build the raffle activation transaction
   * @returns ErgoUnsignedTransaction instance configured for raffle activation
   * @throws Error if any required parameter is missing
   */
  build = (): ErgoUnsignedTransaction => {
    this.validate();

    // Calculate ticket token amount for active raffle
    const activeRaffleTicketAmount =
      BigInt(this.ticketRepo!.assets[0].amount.toString()) -
      BigInt(this.winnersCount! + 1);

    // Create active raffle output box using fromInactiveRaffleBox
    const activeRaffleBuilder = ActiveRaffleBuilder.fromInactiveRaffleBox(
      this.inactiveRaffle!,
    )
      .setCreationHeight(this.chainHeight!)
      .setTotalSoldTickets(0n)
      .setTicketCount(activeRaffleTicketAmount);

    const activeRaffleOutputBox = activeRaffleBuilder.build();

    // Create raffle details output box using fromInactiveRaffle
    const raffleDetailsBuilder = RaffleDetailsBuilder.fromInactiveRaffle(
      this.inactiveRaffle!,
    ).setCreationHeight(this.chainHeight!);

    const raffleDetailsOutputBox = raffleDetailsBuilder.build();

    // Create gift token repository output box
    const giftTokenRepoBuilder = new GiftTokenRepoBuilder()
      .setTokenName(this.giftTokenName!)
      .setTokenDescription(this.giftTokenDescription!)
      .setDecimals(Buffer.from('0', 'utf-8'))
      .setGiftTokensPerWinner(BigInt(raffleInfo.constants.giftTokenCount))
      .setValue(this.txFee! * BigInt(this.winnersCount!))
      .setTxFee(this.txFee!)
      .setCreationHeight(this.chainHeight!)
      .setWinnersCount(activeRaffleBuilder.getWinnersCount())
      .setStep(1) // step 1 for start
      .setGiftTokenAmount(
        BigInt(raffleInfo.constants.giftTokenCount * this.winnersCount!),
      )
      .setTicketId(this.ticketTokenId!)
      .setGiftTokenId(this.giftTokenId!);

    const giftTokenRepoOutputBox = giftTokenRepoBuilder.build();

    // Create winner boxes
    const winnersBoxes = [];
    for (let i = 0; i < this.winnersCount!; i++) {
      const winnerBuilder = new WinnerBuilder()
        .setValue(4n * this.txFee!)
        .setTxFee(this.txFee!)
        .setCreationHeight(this.chainHeight!)
        .setWinnerIndex(i + 1)
        .setTicketToken(this.ticketTokenId!)
        .setDeadline(activeRaffleBuilder.getDeadline())
        .setUnavailableGiftTokenId(Buffer.from(this.giftTokenId!, 'hex'))
        .setGiftCount(0n) // zero gifts for start
        .setRewardPercent(this.winnersSharePercent![i]);

      winnersBoxes.push(winnerBuilder.build());
    }

    // Build the transaction
    const transaction = new TransactionBuilder(this.chainHeight!)
      .from([this.inactiveRaffle!, this.ticketRepo!])
      .to([
        activeRaffleOutputBox,
        raffleDetailsOutputBox,
        giftTokenRepoOutputBox,
        ...winnersBoxes,
      ])
      .configureSelector((selector) => {
        selector.defineStrategy((inputs) => inputs);
      })
      .payFee(this.txFee!)
      .build();

    return transaction;
  };
}
