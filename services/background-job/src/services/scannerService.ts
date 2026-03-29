import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { ErgoScanner, ErgoNodeNetwork } from '@rosen-bridge/ergo-scanner';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { raffleInfo } from '@ergo-raffle/contracts';
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
  AddGiftProxyExtractor,
  DonationProxyExtractor,
  CreationProxyExtractor,
} from '@ergo-raffle/extractors';

import { configs } from '../config';
import { Scanner as ScannerBaseOption } from '../types';
import { DbService } from './dbService';

export class ScannerService extends AbstractService {
  name = 'ScannerService';
  private static instance: ScannerService;
  readonly scannerConfig: ScannerBaseOption;
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
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.scannerConfig = scannerConfig;
    this.ergoScanner = new ErgoScanner({
      network: new ErgoNodeNetwork(this.scannerConfig.node.url),
      initialHeight: this.scannerConfig.node.initialHeight,
      dataSource: DbService.getInstance().dataSource,
      logger: DefaultLogger.getInstance().child('ergoScanner'),
    });
  }

  /**
   * register all required extractors.
   *
   * @returns
   */
  protected readonly registerExtractors = async () => {
    const raffleServiceExtractor = new ServiceExtractor(
      DbService.getInstance().dataSource,
      'RaffleService',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.service,
        active: false,
      },
      raffleInfo.tokens.serviceNft,
      DefaultLogger.getInstance().child('serviceExtractor'),
    );
    await this.ergoScanner.registerExtractor(raffleServiceExtractor);

    const inactiveRaffleExtractor = new InactiveRaffleExtractor(
      DbService.getInstance().dataSource,
      'InactiveRaffle',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.inactiveRaffle,
        active: false,
      },
      configs.addresses.serviceFeeAddress,
      raffleInfo.tokens.raffleLicense,
      DefaultLogger.getInstance().child('inactiveRaffleExtractor'),
    );
    await this.ergoScanner.registerExtractor(inactiveRaffleExtractor);

    const ticketRepoExtractor = new TicketRepoExtractor(
      DbService.getInstance().dataSource,
      'TicketRepo',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.ticketRepo,
        active: false,
      },
      DefaultLogger.getInstance().child('ticketRepoExtractor'),
    );
    await this.ergoScanner.registerExtractor(ticketRepoExtractor);

    const activeRaffleExtractor = new ActiveRaffleExtractor(
      DbService.getInstance().dataSource,
      'ActiveRaffle',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.activeRaffle,
        active: false,
      },
      raffleInfo.tokens.raffleLicense,
      DefaultLogger.getInstance().child('activeRaffleExtractor'),
    );
    await this.ergoScanner.registerExtractor(activeRaffleExtractor);

    const giftTokenRepoExtractor = new GiftTokenRepoExtractor(
      DbService.getInstance().dataSource,
      'GiftTokenRepo',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.giftTokenRepo,
        active: false,
      },
      DefaultLogger.getInstance().child('giftTokenRepoExtractor'),
    );
    await this.ergoScanner.registerExtractor(giftTokenRepoExtractor);

    const winnerExtractor = new WinnerExtractor(
      DbService.getInstance().dataSource,
      'Winner',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.winner,
        active: false,
      },
      DefaultLogger.getInstance().child('winnerExtractor'),
    );
    await this.ergoScanner.registerExtractor(winnerExtractor);

    const raffleDetailsExtractor = new RaffleDetailsExtractor(
      DbService.getInstance().dataSource,
      'RaffleDetails',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.raffleDetails,
        active: false,
      },
      DefaultLogger.getInstance().child('raffleDetailsExtractor'),
    );
    await this.ergoScanner.registerExtractor(raffleDetailsExtractor);

    const giftExtractor = new GiftExtractor(
      DbService.getInstance().dataSource,
      'Gift',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.gift,
        active: false,
      },
      DefaultLogger.getInstance().child('giftExtractor'),
    );
    await this.ergoScanner.registerExtractor(giftExtractor);

    const ticketExtractor = new TicketExtractor(
      DbService.getInstance().dataSource,
      'Ticket',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.ticket,
        active: false,
      },
      DefaultLogger.getInstance().child('ticketExtractor'),
    );
    await this.ergoScanner.registerExtractor(ticketExtractor);

    const winnerPrize = new WinnerPrizeExtractor(
      DbService.getInstance().dataSource,
      'WinnerPrize',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.winnerPrize,
        active: false,
      },
      DefaultLogger.getInstance().child('winnerPrizeExtractor'),
    );
    await this.ergoScanner.registerExtractor(winnerPrize);

    const giftRedeem = new GiftRedeemExtractor(
      DbService.getInstance().dataSource,
      'GiftRedeem',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.giftRedeem,
        active: false,
      },
      raffleInfo.tokens.raffleLicense,
      DefaultLogger.getInstance().child('giftRedeemExtractor'),
    );
    await this.ergoScanner.registerExtractor(giftRedeem);

    const successRaffle = new SuccessRaffleExtractor(
      DbService.getInstance().dataSource,
      'SuccessRaffle',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.successRaffle,
        active: false,
      },
      raffleInfo.tokens.raffleLicense,
      DefaultLogger.getInstance().child('successRaffleExtractor'),
    );
    await this.ergoScanner.registerExtractor(successRaffle);

    const ticketRedeem = new TicketRedeemExtractor(
      DbService.getInstance().dataSource,
      'TicketRedeem',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.ticketRedeem,
        active: false,
      },
      raffleInfo.tokens.raffleLicense,
      DefaultLogger.getInstance().child('ticketRedeemExtractor'),
    );
    await this.ergoScanner.registerExtractor(ticketRedeem);

    const safePayExtractor = new SafePayExtractor(
      DbService.getInstance().dataSource,
      'SafePay',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.safePay,
        active: false,
      },
      raffleInfo.addresses.successRaffle,
      DefaultLogger.getInstance().child('safePayExtractor'),
    );
    await this.ergoScanner.registerExtractor(safePayExtractor);

    const addGiftProxyExtractor = new AddGiftProxyExtractor(
      DbService.getInstance().dataSource,
      'AddGiftProxy',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.addGiftProxy,
        active: false,
      },
      DefaultLogger.getInstance().child('addGiftProxyExtractor'),
    );
    await this.ergoScanner.registerExtractor(addGiftProxyExtractor);

    const donationProxyExtractor = new DonationProxyExtractor(
      DbService.getInstance().dataSource,
      'DonationProxy',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.donationProxy,
        active: false,
      },
      DefaultLogger.getInstance().child('donationProxyExtractor'),
    );
    await this.ergoScanner.registerExtractor(donationProxyExtractor);

    const creationProxyExtractor = new CreationProxyExtractor(
      DbService.getInstance().dataSource,
      'CreationProxy',
      {
        type: ErgoNetworkType.Node,
        url: this.scannerConfig.node.url,
        address: raffleInfo.addresses.creationProxy,
        active: false,
      },
      DefaultLogger.getInstance().child('creationProxyExtractor'),
    );
    await this.ergoScanner.registerExtractor(creationProxyExtractor);
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
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ScannerService(scannerConfig, logger);

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
    this.setStatus(ServiceStatus.running);
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
}
