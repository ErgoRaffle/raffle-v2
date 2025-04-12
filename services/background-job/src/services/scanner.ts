import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import {
  RaffleServiceExtractor,
  InactiveRaffleExtractor,
  TicketRepoExtractor,
  ActiveRaffleExtractor,
  GiftTokenRepoExtractor,
  WinnerExtractor,
  RaffleDetailsExtractor,
  GiftExtractor,
  TicketExtractor,
  WinnerPrizeExtractor,
  GiftRedeemExtractor,
  SuccessRaffleExtractor,
  TicketRedeemExtractor,
  SafePayExtractor,
} from '@ergo-raffle/extractors';
import { raffleInfo } from '@ergo-raffle/contracts';

import * as scanner from '@rosen-bridge/scanner';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { DBService } from './db';
import { ScannerBaseOption } from '../types';

export class ScannerService extends AbstractService {
  name = 'ScannerService';
  private static instance: ScannerService;
  readonly dbService: DBService;
  private scannerConfig: ScannerBaseOption;
  private nextJobId = 0;
  private shouldStop = false;
  private jobsToStop = new Map<number, NodeJS.Timeout>();
  private continueStop = () => {
    return;
  };
  protected dependencies: Dependency[] = [
    {
      serviceName: DBService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private ergoScanner: scanner.ErgoScanner;

  private constructor(
    scannerConfig: ScannerBaseOption,
    dbService: DBService,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.scannerConfig = scannerConfig;
    this.dbService = dbService;

    this.ergoScanner = new scanner.ErgoScanner(
      {
        url: scannerConfig.node.url,
        type: ErgoNetworkType.Node,
        timeout: scannerConfig.node.timeout,
        initialHeight: scannerConfig.node.initialHeight,
        dataSource: dbService.dataSource,
      },
      logger,
    );

    const raffleServiceExtractor = new RaffleServiceExtractor(
      this.dbService.dataSource,
      'RaffleService',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.service,
      raffleInfo.tokens.serviceNft,
      logger,
    );
    this.ergoScanner.registerExtractor(raffleServiceExtractor);

    const inactiveRaffleExtractor = new InactiveRaffleExtractor(
      this.dbService.dataSource,
      'InactiveRaffle',
      scannerConfig.node.url,
      raffleInfo.addresses.inactiveRaffle,
      raffleInfo.addresses.service,
      raffleInfo.tokens.raffleLicense,
      logger,
    );
    this.ergoScanner.registerExtractor(inactiveRaffleExtractor);

    const ticketRepoExtractor = new TicketRepoExtractor(
      this.dbService.dataSource,
      'TicketRepo',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRepo,
      logger,
    );
    this.ergoScanner.registerExtractor(ticketRepoExtractor);

    const activeRaffleExtractor = new ActiveRaffleExtractor(
      this.dbService.dataSource,
      'ActiveRaffle',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.activeRaffle,
      raffleInfo.tokens.raffleLicense,
      logger,
    );
    this.ergoScanner.registerExtractor(activeRaffleExtractor);

    const giftTokenRepoExtractor = new GiftTokenRepoExtractor(
      this.dbService.dataSource,
      'GiftTokenRepo',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftTokenRepo,
      logger,
    );
    this.ergoScanner.registerExtractor(giftTokenRepoExtractor);

    const winnerExtractor = new WinnerExtractor(
      this.dbService.dataSource,
      'Winner',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winner,
      logger,
    );
    this.ergoScanner.registerExtractor(winnerExtractor);

    const raffleDetailsExtractor = new RaffleDetailsExtractor(
      this.dbService.dataSource,
      'RaffleDetails',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.raffleDetails,
      logger,
    );
    this.ergoScanner.registerExtractor(raffleDetailsExtractor);

    const giftExtractor = new GiftExtractor(
      this.dbService.dataSource,
      'Gift',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.gift,
      logger,
    );
    this.ergoScanner.registerExtractor(giftExtractor);

    const ticketExtractor = new TicketExtractor(
      this.dbService.dataSource,
      'Ticket',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticket,
      logger,
    );
    this.ergoScanner.registerExtractor(ticketExtractor);

    const winnerPrize = new WinnerPrizeExtractor(
      this.dbService.dataSource,
      'WinnerPrize',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winnerPrize,
      logger,
    );
    this.ergoScanner.registerExtractor(winnerPrize);

    const giftRedeem = new GiftRedeemExtractor(
      this.dbService.dataSource,
      'GiftRedeem',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftRedeem,
      raffleInfo.tokens.raffleLicense,
      logger,
    );
    this.ergoScanner.registerExtractor(giftRedeem);

    const successRaffle = new SuccessRaffleExtractor(
      this.dbService.dataSource,
      'SuccessRaffle',
      scannerConfig.node.url,
      raffleInfo.addresses.successRaffle,
      raffleInfo.tokens.raffleLicense,
      logger,
    );
    this.ergoScanner.registerExtractor(successRaffle);

    const ticketRedeem = new TicketRedeemExtractor(
      this.dbService.dataSource,
      'TicketRedeem',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRedeem,
      raffleInfo.tokens.raffleLicense,
      logger,
    );
    this.ergoScanner.registerExtractor(ticketRedeem);

    const safePayExtractor = new SafePayExtractor(
      this.dbService.dataSource,
      'SafePay',
      scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.safePay,
      raffleInfo.addresses.successRaffle,
    );
    this.ergoScanner.registerExtractor(safePayExtractor);
  }

  /**
   * initializes the singleton instance of ScannerService
   *
   * @static
   * @param {DataSource} dataSource
   * @param {AbstractLogger} [logger]
   * @memberof ScannerService
   */
  static init = (
    scannerConfig: ScannerBaseOption,
    dbService: DBService,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ScannerService(scannerConfig, dbService, logger);
  };

  /**
   * return the singleton instance of ScannerService
   *
   * @static
   * @return {ScannerService}
   * @memberof ScannerService
   */
  static getInstance = (): ScannerService => {
    if (!this.instance) {
      throw new Error('ScannerService instances is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - scanner update job is started
   *  - based on observed blockchain, the observation scanner job is started
   *  - Ergo scanner's sync status is checked and based on that service's status
   *    is set
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof ScannerService
   */
  protected start = async (): Promise<boolean> => {
    this.shouldStop = false;
    this.setStatus(ServiceStatus.started);
    return await this.fetchData(this.nextJobId++);
  };

  /**
   * Scan and fetch raffle boxes data
   */
  protected fetchData = async (jobId: number) => {
    this.jobsToStop.delete(jobId);
    this.logger.info('Starting scanner fetchData job');
    try {
      await this.ergoScanner.update();
    } catch (err) {
      this.logger.error(`ScannerService fetchData failed: ${err}`);
      if (err instanceof Error && err.stack) this.logger.error(err.stack);
      return false;
    }

    const scheduled = setTimeout(
      () => this.fetchData(jobId),
      this.scannerConfig.rescanDelaySeconds * 1000,
    );

    if (this.shouldStop) {
      this.shouldStop = false;
      clearTimeout(scheduled);
      this.continueStop();
    } else {
      this.jobsToStop.set(jobId, scheduled);
    }

    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - scheduled jobs are stopped
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully, otherwise
   * false
   * @memberof ScannerService
   */
  protected stop = async (): Promise<boolean> => {
    let stoppedJobs = 0;
    while (stoppedJobs < this.nextJobId) {
      for (const scheduledJob of this.jobsToStop.values()) {
        clearTimeout(scheduledJob);
        stoppedJobs++;
      }

      if (stoppedJobs >= this.nextJobId) {
        break;
      }

      await new Promise<void>((resolve) => {
        this.continueStop = resolve;
        this.shouldStop = true;
      });
      stoppedJobs++;
    }

    this.nextJobId = 0;
    this.setStatus(ServiceStatus.dormant);
    return true;
  };
}
