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
  DynamicExtractor,
} from '@ergo-raffle/extractors';
import { Network } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { ErgoScanner, ErgoNodeNetwork } from '@rosen-bridge/scanner';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { configs } from '../config';
import { Scanner as ScannerBaseOption } from '../types';
import { DbService } from './dbService';

export class ScannerService extends AbstractService {
  name = 'ScannerService';
  private static instance: ScannerService;
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
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.scannerConfig = scannerConfig;
    this.ergoScanner = new ErgoScanner({
      network: new ErgoNodeNetwork(this.scannerConfig.node.url),
      initialHeight: this.scannerConfig.node.initialHeight,
      dataSource: DbService.getInstance().dataSource,
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
      DbService.getInstance().dataSource,
      'RaffleService',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.service,
      raffleInfo.tokens.serviceNft,
      CallbackLoggerFactory.getInstance().getLogger('raffle-service-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(raffleServiceExtractor);

    const inactiveRaffleExtractor = new InactiveRaffleExtractor(
      DbService.getInstance().dataSource,
      'InactiveRaffle',
      this.scannerConfig.node.url,
      raffleInfo.addresses.inactiveRaffle,
      configs.addresses.serviceFeeAddress,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-inactiveRaffle-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(inactiveRaffleExtractor);

    const ticketRepoExtractor = new TicketRepoExtractor(
      DbService.getInstance().dataSource,
      'TicketRepo',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRepo,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-ticketRepo-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(ticketRepoExtractor);

    const activeRaffleExtractor = new ActiveRaffleExtractor(
      DbService.getInstance().dataSource,
      'ActiveRaffle',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.activeRaffle,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-activeRaffle-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(activeRaffleExtractor);

    const giftTokenRepoExtractor = new GiftTokenRepoExtractor(
      DbService.getInstance().dataSource,
      'GiftTokenRepo',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftTokenRepo,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-giftTokenRepo-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(giftTokenRepoExtractor);

    const winnerExtractor = new WinnerExtractor(
      DbService.getInstance().dataSource,
      'Winner',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winner,
      CallbackLoggerFactory.getInstance().getLogger('raffle-winner-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(winnerExtractor);

    const raffleDetailsExtractor = new RaffleDetailsExtractor(
      DbService.getInstance().dataSource,
      'RaffleDetails',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.raffleDetails,
      CallbackLoggerFactory.getInstance().getLogger('raffle-details-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(raffleDetailsExtractor);

    const giftExtractor = new GiftExtractor(
      DbService.getInstance().dataSource,
      'Gift',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.gift,
      CallbackLoggerFactory.getInstance().getLogger('raffle-gift-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(giftExtractor);

    const ticketExtractor = new TicketExtractor(
      DbService.getInstance().dataSource,
      'Ticket',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticket,
      CallbackLoggerFactory.getInstance().getLogger('raffle-ticket-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(ticketExtractor);

    const winnerPrize = new WinnerPrizeExtractor(
      DbService.getInstance().dataSource,
      'WinnerPrize',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.winnerPrize,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-winnerPrize-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(winnerPrize);

    const giftRedeem = new GiftRedeemExtractor(
      DbService.getInstance().dataSource,
      'GiftRedeem',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.giftRedeem,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-giftRedeem-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(giftRedeem);

    const successRaffle = new SuccessRaffleExtractor(
      DbService.getInstance().dataSource,
      'SuccessRaffle',
      this.scannerConfig.node.url,
      raffleInfo.addresses.successRaffle,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-successRaffle-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(successRaffle);

    const ticketRedeem = new TicketRedeemExtractor(
      DbService.getInstance().dataSource,
      'TicketRedeem',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.ticketRedeem,
      raffleInfo.tokens.raffleLicense,
      CallbackLoggerFactory.getInstance().getLogger(
        'raffle-ticketRedeem-extractor',
      ),
      false,
    );
    await this.ergoScanner.registerExtractor(ticketRedeem);

    const safePayExtractor = new SafePayExtractor(
      DbService.getInstance().dataSource,
      'SafePay',
      this.scannerConfig.node.url,
      ErgoNetworkType.Node,
      raffleInfo.addresses.safePay,
      raffleInfo.addresses.successRaffle,
      CallbackLoggerFactory.getInstance().getLogger('raffle-safePay-extractor'),
      false,
    );
    await this.ergoScanner.registerExtractor(safePayExtractor);

    this.dynamicExtractor = new DynamicExtractor(
      DbService.getInstance().dataSource,
      'Dynamic',
      CallbackLoggerFactory.getInstance().getLogger('dynamic-extractor'),
      configs.ergo.network === 'mainnet' ? Network.Mainnet : Network.Testnet,
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
