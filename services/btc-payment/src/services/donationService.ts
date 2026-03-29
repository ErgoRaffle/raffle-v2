import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import {
  DonationParamsEntity,
  DonationStatus,
} from '@ergo-raffle/request-params';

import { Donation as DonationConfig } from '../types/configs';
import { DbService } from './dbService';
import { ScannerService } from './scannerService';

export class DonationService extends PeriodicTaskService {
  name = 'DonationService';
  private static instance: DonationService;
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
    logger?: AbstractLogger,
  ) {
    super(logger);
  }

  static readonly init = async (
    config: DonationConfig,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new DonationService(config, logger);
  };

  static readonly getInstance = (): DonationService => {
    if (!this.instance) {
      throw new Error('DonationService instance is not initialized yet');
    }
    return this.instance;
  };

  protected preStart = async (): Promise<void> => {};
  protected postStop = async (): Promise<void> => {};

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
    const donationAction = DbService.getInstance().getDonationAction();
    const ongoing = await donationAction.getOngoing();
    if (ongoing.length === 0) {
      this.logger.debug('No ongoing donation requests, skipping timeout check');
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    for (const donation of ongoing) {
      try {
        const ageSeconds = nowSeconds - donation.timestamp;
        if (ageSeconds >= this.config.requestTimeout) {
          await donationAction.updateStatus(
            donation.id,
            DonationStatus.TimedOut,
          );
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
    const donationAction = db.getDonationAction();
    const ongoing = await donationAction.getOngoing();
    if (ongoing.length === 0) {
      this.logger.debug(
        'No ongoing donation requests, skipping donation check',
      );
      return;
    }

    const latestHeight = await db
      .getBlockAction()
      .getLatestHeight(ScannerService.getInstance().getBitcoinScannerName());
    if (latestHeight === null) {
      this.logger.debug('No blocks stored yet, skipping donation check');
      return;
    }

    const minConfirmedHeight = latestHeight - this.config.requiredConfirmations;

    for (const donation of ongoing) {
      try {
        const tokenId = donation.tokenId;
        const tokenAmount = donation.tokenAmount;
        const confirmedSum = await db
          .getDynamicBoxAction()
          .getConfirmedSum(
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
        await donationAction.updateStatus(
          donation.id,
          DonationStatus.Completed,
        );
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
   * Create a donation transaction for the specified raffle.
   */
  private createDonationTransaction = async (
    donation: DonationParamsEntity, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> => {
    // TODO create donation transaction using the proxy factory
  };
}
