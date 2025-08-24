import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import {
  ServiceExtractor,
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
  DynamicExtractor,
} from '@ergo-raffle/extractors';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ErgoScanner, ErgoNodeNetwork } from '@rosen-bridge/scanner';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DbService } from './dbService';
import { Scanner as ScannerBaseOption } from '../types';

export class ScannerService extends AbstractService {
  name = 'ScannerService';
  private static instance: ScannerService;
  readonly dbService: DbService;
  readonly scannerConfig: ScannerBaseOption;
  private dynamicExtractor: DynamicExtractor;
  private shouldStop = false;
  private latestTimeOut: undefined | ReturnType<typeof setTimeout>;
  private continueStop = () => {
    return;
  };
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  readonly ergoScanner: ErgoScanner;

  private constructor(
    scannerConfig: ScannerBaseOption,
    dbService: DbService,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.scannerConfig = scannerConfig;
    this.dbService = dbService;
    this.ergoScanner = new ErgoScanner({
      network: new ErgoNodeNetwork(this.scannerConfig.node.url),
      initialHeight: this.scannerConfig.node.initialHeight,
      dataSource: this.dbService.dataSource,
      logger: CallbackLoggerFactory.getInstance().getLogger('raffle-scanner'),
    });
  }

  /**
   * register all required extractors.
   *
   * @returns
   */
  protected readonly registerExtractors = async () => {
    const raffleServiceExtractor = new ServiceExtractor(
      this.dbService.dataSource,
      'RaffleService',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.service,
      raffleInfo.tokens.serviceNft,
      CallbackLoggerFactory.getInstance().getLogger('raffle-service-extractor'),
    );
    await this.ergoScanner.registerExtractor(raffleServiceExtractor);

    const inactiveRaffleExtractor = new InactiveRaffleExtractor(
      this.dbService.dataSource,
      'InactiveRaffle',
      this.scannerConfig.node.url,
      raffleInfo.addresses.inactiveRaffle,
      raffleInfo.addresses.service,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-inactiveRaffle-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(inactiveRaffleExtractor);

    const ticketRepoExtractor = new TicketRepoExtractor(
      this.dbService.dataSource,
      'TicketRepo',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRepo,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-ticketRepo-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(ticketRepoExtractor);

    const activeRaffleExtractor = new ActiveRaffleExtractor(
      this.dbService.dataSource,
      'ActiveRaffle',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.activeRaffle,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-activeRaffle-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(activeRaffleExtractor);

    const giftTokenRepoExtractor = new GiftTokenRepoExtractor(
      this.dbService.dataSource,
      'GiftTokenRepo',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftTokenRepo,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-giftTokenRepo-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(giftTokenRepoExtractor);

    const winnerExtractor = new WinnerExtractor(
      this.dbService.dataSource,
      'Winner',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winner,
      CallbackLoggerFactory.getInstance().getLogger('raffle-winner-extractor'),
    );
    await this.ergoScanner.registerExtractor(winnerExtractor);

    const raffleDetailsExtractor = new RaffleDetailsExtractor(
      this.dbService.dataSource,
      'RaffleDetails',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.raffleDetails,
      CallbackLoggerFactory.getInstance().getLogger('raffle-details-extractor'),
    );
    await this.ergoScanner.registerExtractor(raffleDetailsExtractor);

    const giftExtractor = new GiftExtractor(
      this.dbService.dataSource,
      'Gift',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.gift,
      CallbackLoggerFactory.getInstance().getLogger('raffle-gift-extractor'),
    );
    await this.ergoScanner.registerExtractor(giftExtractor);

    const ticketExtractor = new TicketExtractor(
      this.dbService.dataSource,
      'Ticket',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticket,
      CallbackLoggerFactory.getInstance().getLogger('raffle-ticket-extractor'),
    );
    await this.ergoScanner.registerExtractor(ticketExtractor);

    const winnerPrize = new WinnerPrizeExtractor(
      this.dbService.dataSource,
      'WinnerPrize',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winnerPrize,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-winnerPrize-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(winnerPrize);

    const giftRedeem = new GiftRedeemExtractor(
      this.dbService.dataSource,
      'GiftRedeem',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftRedeem,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-giftRedeem-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(giftRedeem);

    const successRaffle = new SuccessRaffleExtractor(
      this.dbService.dataSource,
      'SuccessRaffle',
      this.scannerConfig.node.url,
      raffleInfo.addresses.successRaffle,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-successRaffle-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(successRaffle);

    const ticketRedeem = new TicketRedeemExtractor(
      this.dbService.dataSource,
      'TicketRedeem',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRedeem,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-ticketRedeem-extractor',
      ),
    );
    await this.ergoScanner.registerExtractor(ticketRedeem);

    const safePayExtractor = new SafePayExtractor(
      this.dbService.dataSource,
      'SafePay',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.safePay,
      raffleInfo.addresses.successRaffle,
      CallbackLoggerFactory.getInstance().getLogger('raffle-safePay-extractor'),
    );
    await this.ergoScanner.registerExtractor(safePayExtractor);

    this.dynamicExtractor = new DynamicExtractor(
      this.dbService.dataSource,
      'Dynamic',
      CallbackLoggerFactory.getInstance().getLogger('dynamic-extractor'),
    );
    await this.ergoScanner.registerExtractor(this.dynamicExtractor);
  };

  /**
   * initializes the singleton instance of ScannerService
   *
   * @static
   * @param {ScannerBaseOption} scannerConfig
   * @param {DbService} [dbService]
   * @memberof ScannerService
   */
  static readonly init = async (
    scannerConfig: ScannerBaseOption,
    dbService: DbService,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    const logger = CallbackLoggerFactory.getInstance().getLogger(
      import.meta.url,
    );
    this.instance = new ScannerService(scannerConfig, dbService, logger);

    await this.instance.registerExtractors();
  };

  /**
   * return the singleton instance of ScannerService
   *
   * @static
   * @return {ScannerService}
   * @memberof ScannerService
   */
  static readonly getInstance = (): ScannerService => {
    if (!this.instance) {
      throw new Error('ScannerService instances is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - scanner update job is started
   *  - initiating fetch of boxes linked to Raffle V2 contracts
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof ScannerService
   */
  protected start = async (): Promise<boolean> => {
    this.shouldStop = false;
    this.setStatus(ServiceStatus.started);
    return await this.fetchData();
  };

  /**
   * Scan and fetch raffle boxes data
   * @returns {boolean}
   */
  protected fetchData = async () => {
    this.latestTimeOut = undefined;
    this.logger.info('Starting scanner fetchData job');
    try {
      await this.ergoScanner.update();
    } catch (err) {
      this.logger.error(`ScannerService fetchData failed: ${err}`);
      if (err instanceof Error && err.stack) this.logger.error(err.stack);
      return false;
    }

    const scheduled = setTimeout(
      () => this.fetchData(),
      this.scannerConfig.scannerInterval * 1000,
    );

    if (this.shouldStop) {
      this.shouldStop = false;
      clearTimeout(scheduled);
      this.continueStop();
    } else {
      this.latestTimeOut = scheduled;
    }

    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - scheduled timeout are stopped
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully
   * @memberof ScannerService
   */
  protected stop = async (): Promise<boolean> => {
    clearTimeout(this.latestTimeOut);
    await new Promise<void>((resolve) => {
      this.continueStop = resolve;
      this.shouldStop = true;
    });

    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Add a new address to the dynamic extractor
   * @param address - The address to add
   */
  addDynamicAddress = (address: string) => {
    this.dynamicExtractor.addNewAddress(address);
  };

  /**
   * Remove an address from the dynamic extractor
   * @param address - The address to remove
   */
  removeDynamicAddress = (address: string) => {
    this.dynamicExtractor.removeAddress(address);
  };
}
