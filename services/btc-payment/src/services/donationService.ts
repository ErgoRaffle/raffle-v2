import { Amount, Box } from '@fleet-sdk/common';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { ActiveRaffleBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import {
  DonationParamsEntity,
  DonationStatus,
} from '@ergo-raffle/request-params';
import { DonateTxBuilder } from '@ergo-raffle/transactions';

import { ErgoNodeNetwork, FleetBoxSelection, signTransaction } from '../ergo';
import {
  Donation as DonationConfig,
  Ergo as ErgoConfig,
} from '../types/configs';
import { DbService } from './dbService';
import { ScannerService } from './scannerService';
import { TxPotService } from './txPotService';

export class DonationService extends PeriodicTaskService {
  name = 'DonationService';
  private static instance: DonationService;
  private readonly ergoNodeNetwork: ErgoNodeNetwork;
  private readonly selector: FleetBoxSelection;
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  private constructor(
    private readonly config: DonationConfig,
    private readonly ergoConfig: ErgoConfig,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.selector = new FleetBoxSelection(this.logger);
    this.ergoNodeNetwork = new ErgoNodeNetwork(this.ergoConfig.nodeUrl, logger);
  }

  static readonly init = async (
    config: DonationConfig,
    ergoConfig: ErgoConfig,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new DonationService(config, ergoConfig, logger);
  };

  static readonly getInstance = (): DonationService => {
    if (!this.instance) {
      throw new Error('DonationService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Logs the start of the DonationService.
   */
  protected preStart = async (): Promise<void> => {
    this.logger.debug('Starting DonationService');
  };

  /**
   * Logs the stop of the DonationService.
   */
  protected postStop = async (): Promise<void> => {
    this.logger.info('DonationService stopped');
  };

  /**
   * Returns the tasks for the DonationService.
   * - processDonationTimeouts: Update old pending donation requests to timed out.
   * - processDonations: Process confirmed and filled donations.
   * @returns The tasks for the DonationService.
   */
  protected getTasks = () => {
    const intervalMs = this.config.interval * 1000;
    return [
      {
        fn: async () => {
          try {
            await this.processDonationTimeouts();
          } catch (err) {
            this.logger.error(
              `DonationService processDonationTimeouts failed: ${err}`,
            );
            if (err instanceof Error && err.stack) {
              this.logger.debug(err.stack);
            }
          }
        },
        interval: intervalMs,
      },
      {
        fn: async () => {
          try {
            await this.processDonations();
          } catch (err) {
            this.logger.error(
              `DonationService processDonations failed: ${err}`,
            );
            if (err instanceof Error && err.stack) {
              this.logger.debug(err.stack);
            }
          }
        },
        interval: intervalMs,
      },
    ];
  };

  /**
   * Mark pending donation requests as timed out when they have passed the deadline.
   */
  private processDonationTimeouts = async (): Promise<void> => {
    const db = DbService.getInstance();
    const ongoing = await db.getOngoingDonationRequests();
    if (ongoing.length === 0) {
      this.logger.debug('No ongoing donation requests, skipping timeout check');
      return;
    }

    const latestBlock = await db.getLatestBlock(
      ScannerService.getInstance().getBitcoinScannerName(),
    );
    if (latestBlock === null) {
      this.logger.debug(
        'No blocks stored yet, skipping donation timeout check',
      );
      return;
    }

    for (const donation of ongoing) {
      try {
        const ageSeconds = Math.floor(
          (latestBlock.timestamp - donation.timestamp) / 1000,
        );
        if (ageSeconds >= this.config.requestTimeout) {
          await db.updateDonationStatus(donation.id, DonationStatus.TimedOut);
          this.logger.info(
            `Donation request id=${donation.id} timed out (age=${ageSeconds}s, raffleId=${donation.raffleId})`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Error timing out donation id=${donation.id}: ${err}`,
        );
        if (err instanceof Error && err.stack) {
          this.logger.error(err.stack);
        }
      }
    }
  };

  /**
   * Query ongoing donation requests, check satisfaction and confirmation via dynamic boxes,
   * then create donation transaction and mark completed when ready.
   */
  private processDonations = async (): Promise<void> => {
    const db = DbService.getInstance();
    const ongoing = await db.getOngoingDonationRequests();
    if (ongoing.length === 0) {
      this.logger.debug(
        'No ongoing donation requests, skipping donation check',
      );
      return;
    }

    const latestBlock = await db.getLatestBlock(
      ScannerService.getInstance().getBitcoinScannerName(),
    );
    if (latestBlock === null) {
      this.logger.debug('No blocks stored yet, skipping donation check');
      return;
    }

    const minConfirmedHeight =
      latestBlock.height - this.config.requiredConfirmations;

    for (const donation of ongoing) {
      try {
        const tokenId = donation.tokenId;
        const tokenAmount = donation.tokenAmount;
        const confirmedSum = await db.getConfirmedDynamicBoxSum(
          donation.bitcoinAddress,
          tokenId,
          minConfirmedHeight,
        );

        if (confirmedSum < tokenAmount) {
          this.logger.info(
            `Donation request id=${donation.id} not satisfied (confirmedSum=${confirmedSum}, tokenAmount=${tokenAmount})`,
          );
          continue;
        }

        this.logger.info(
          `Donation request id=${donation.id} satisfied and confirmed (raffleId=${donation.raffleId}, ticketCount=${donation.ticketCount})`,
        );

        await this.createDonationTransaction(donation);
        await db.updateDonationStatus(donation.id, DonationStatus.Completed);
      } catch (err) {
        this.logger.error(
          `Error processing donation id=${donation.id}: ${err}`,
        );
        if (err instanceof Error && err.stack) {
          this.logger.error(err.stack);
        }
      }
    }
  };

  /**
   * Finds the latest unspent active raffle box for the given raffleId.
   *
   * Iterates over unspent boxes at the activeRaffle address, selects the box
   * whose first token is the raffleLicense and whose second token matches
   * raffleId, then tracks it through any signed/sent TxPot transactions to
   * return the most up-to-date unspent version.
   *
   * @param raffleId - The raffle token id used as the ticket token in the box
   * @returns The latest unspent active raffle box, or null if not found or
   *   fully spent with no matching output
   */
  private getLastActiveRaffleBox = async (
    raffleId: string,
  ): Promise<Box<Amount> | null> => {
    for await (const box of this.ergoNodeNetwork.unspentBoxesByAddressIterator(
      raffleInfo.addresses.activeRaffle,
    )) {
      if (
        box.assets[0]?.tokenId === raffleInfo.tokens.raffleLicense &&
        box.assets[1]?.tokenId === raffleId
      ) {
        return TxPotService.getInstance().trackToLatestUnspentBox(box);
      }
    }
    return null;
  };

  /**
   * Async generator that iterates unspent wallet boxes, resolving each through
   * TxPot to skip boxes already spent in pending transactions and yield their
   * latest unspent descendants.
   */
  private async *walletBoxIterator(
    walletAddress: string,
  ): AsyncGenerator<Box<Amount>> {
    for await (const box of this.ergoNodeNetwork.unspentBoxesByAddressIterator(
      walletAddress,
    )) {
      this.logger.debug(`Processing box with id ${box.boxId}`);
      const lastBox =
        await TxPotService.getInstance().trackToLatestUnspentBox(box);
      if (lastBox === null) {
        this.logger.debug(`Box [${box.boxId}] was spent in TxPot, skipping`);
        continue;
      }
      this.logger.debug(`Resolved box [${box.boxId}] → [${lastBox.boxId}]`);
      yield lastBox;
    }
  }

  /**
   * Create a donation transaction for the specified raffle.
   *
   * Steps:
   *  1. Resolve the latest unspent active raffle box via getLastActiveRaffleBox
   *  2. Read ticket price and raffle type (ERG-goal vs token-goal) from the box
   *  3. Select wallet UTXOs via FleetBoxSelection covering required ERG and tokens
   *  4. Build the transaction with DonateTxBuilder
   *  5. Sign with the service wallet key and register in TxPot
   */
  private createDonationTransaction = async (
    donation: DonationParamsEntity,
  ): Promise<void> => {
    this.logger.info(
      `Creating donation transaction for request id=${donation.id} on raffle [${donation.raffleId}]`,
    );

    const activeRaffleBox = await this.getLastActiveRaffleBox(
      donation.raffleId,
    );
    if (!activeRaffleBox) {
      throw new Error(
        `Active raffle box not found for raffle [${donation.raffleId}]`,
      );
    }

    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(activeRaffleBox);
    const ticketPrice = activeRaffleBuilder.getTicketPrice();
    const collectingTokenId = activeRaffleBuilder.getCollectingTokenId();
    const txFee = this.ergoConfig.fee;
    const ticketCount = BigInt(donation.ticketCount);

    // For token-goal raffles the ticket cost is paid in the collecting token;
    // for ERG-goal raffles it is paid in ERG.  Both cases need ERG to cover fees.
    const requiredAssets = {
      nativeToken:
        collectingTokenId != null
          ? txFee * 5n
          : ticketPrice * ticketCount + txFee * 5n,
      tokens:
        collectingTokenId != null
          ? [{ id: collectingTokenId, value: ticketPrice * ticketCount }]
          : [],
    };
    this.logger.debug(
      `Required assets for donation request id=${donation.id} on raffle [${donation.raffleId}]: ${JsonBigInt.stringify(requiredAssets)}`,
    );

    const walletKey = ErgoHDKey.fromMnemonicSync(this.ergoConfig.mnemonic);
    const walletAddress = walletKey.address.toString();

    const result = await this.selector.getCoveringBoxes(
      requiredAssets,
      [],
      new Map(),
      this.walletBoxIterator(walletAddress),
    );

    if (!result.covered) {
      throw new Error(
        `Insufficient wallet funds to cover donation for raffle [${donation.raffleId}], required assets: ${JsonBigInt.stringify(requiredAssets)}, uncovered assets: ${JsonBigInt.stringify(result.uncoveredAssets)}`,
      );
    }
    this.logger.debug(
      `Selected wallet boxes for donation request id=${donation.id} on raffle [${donation.raffleId}]: ${result.boxes.map((box) => box.boxId).join(', ')}`,
    );

    const walletUtxos = result.boxes;

    const chainHeight = await this.ergoNodeNetwork.getHeight();

    const unsignedTx = new DonateTxBuilder()
      .setActiveRaffle(activeRaffleBox)
      .setDonatorUtxos(walletUtxos)
      .setDonatorAddress(donation.donatorAddress)
      .setDonationTicketCount(BigInt(donation.ticketCount))
      .setChainHeight(chainHeight)
      .setTxFee(txFee)
      .build();

    this.logger.info(
      `Donation transaction for raffle [${donation.raffleId}] built (txId: [${unsignedTx.id}], ticketCount: ${donation.ticketCount})`,
    );

    const signedTx = await signTransaction(
      this.ergoNodeNetwork,
      unsignedTx,
      walletKey,
    );

    this.logger.debug(
      `Donation transaction for raffle [${donation.raffleId}] signed (txJson: [${JsonBigInt.stringify(signedTx)}])`,
    );

    // TODO: Send the signed transaction to background job service using the API

    await DbService.getInstance().updateDonationStatus(
      donation.id,
      DonationStatus.InProgress,
      signedTx.id,
    );
    this.logger.info(
      `Donation transaction [${signedTx.id}] submitted to TxPot for request id=${donation.id} on raffle [${donation.raffleId}]. Status updated to InProgress`,
    );
  };
}
