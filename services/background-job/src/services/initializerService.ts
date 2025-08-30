import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
  ServiceManager,
} from '@rosen-bridge/service-manager';
import { Network } from '@fleet-sdk/core';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { configs } from '../config';
import { DbService } from './dbService';
import dataSource from '../dataSource';
import { ScannerService } from './scannerService';
import { TxPotService } from './txPotService';
import { HealthCheckService } from './healthCheckService';
import { BoxLookupService } from './boxLoookupService';
import { ApiService } from './apiService';
import { CreationService } from './transactions/creationService';
import { ActivationService } from './transactions/activationService';
import { GiftTokenReceiptService } from './transactions/giftTokenReceiptService';
import { FailureService } from './transactions/failureService';
import { GiftReturnService } from './transactions/giftReturnService';
import { TicketRedeemService } from './transactions/ticketRedeemService';
import { WinnerRemovalService } from './transactions/winnerRemovalService';
import { LicenseRedeemService } from './transactions/licenseRedeemService';
import { DonationService } from './transactions/donationService';
import { AddGiftService } from './transactions/addGiftService';
import { FeePaymentService } from './transactions/feePaymentService';
import { PrizeCreationService } from './transactions/prizeCreationService';
import { GiftAndPrizeService } from './transactions/giftAndPrizeService';
import { SafeWithdrawalService } from './transactions/safeWithdrawalService';

export class InitializerService extends AbstractService {
  name = 'InitializerService';
  private static instance?: InitializerService;
  private isInitialized = false;
  private serviceManager: ServiceManager;

  private constructor(serviceManager: ServiceManager, logger?: AbstractLogger) {
    super(logger);
    this.serviceManager = serviceManager;
  }

  /**
   * Initializes the singleton instance of InitializerService
   */
  static init = async (
    serviceManager: ServiceManager,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new InitializerService(serviceManager, logger);
    await this.instance.initializeAllServices();
    this.instance.registerAllServices();
  };

  /**
   * Returns the singleton instance of InitializerService
   */
  static getInstance = (): InitializerService => {
    if (!this.instance) {
      throw new Error('InitializerService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Returns the dependencies of the InitializerService
   */
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: TxPotService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: HealthCheckService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: BoxLookupService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ApiService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: CreationService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ActivationService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: GiftTokenReceiptService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: DonationService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: AddGiftService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: FeePaymentService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: PrizeCreationService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: GiftAndPrizeService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: FailureService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: GiftReturnService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: WinnerRemovalService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: TicketRedeemService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: LicenseRedeemService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: SafeWithdrawalService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  /**
   * Starts the service by initializing all other services
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.isInitialized = true;
      this.setStatus(ServiceStatus.running);
      this.logger.info('InitializerService started successfully');
      return true;
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ${this.name}: ${e}`,
      );
      return false;
    }
  };

  /**
   * Stops the service
   */
  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    this.logger.info('InitializerService stopped');
    return true;
  };

  /**
   * Initializes all services in the system
   */
  private initializeAllServices = async (): Promise<void> => {
    // Create logger instances for each service
    const dbLogger = CallbackLoggerFactory.getInstance().getLogger('DbService');
    const scannerLogger =
      CallbackLoggerFactory.getInstance().getLogger('ScannerService');
    const txPotLogger =
      CallbackLoggerFactory.getInstance().getLogger('TxPotService');
    const healthCheckLogger =
      CallbackLoggerFactory.getInstance().getLogger('HealthCheckService');
    const boxLookupLogger =
      CallbackLoggerFactory.getInstance().getLogger('BoxLookupService');
    const apiLogger =
      CallbackLoggerFactory.getInstance().getLogger('ApiService');
    const creationLogger =
      CallbackLoggerFactory.getInstance().getLogger('CreationService');
    const activationLogger =
      CallbackLoggerFactory.getInstance().getLogger('ActivationService');
    const giftTokenReceiptLogger =
      CallbackLoggerFactory.getInstance().getLogger('GiftTokenReceiptService');
    const donationLogger =
      CallbackLoggerFactory.getInstance().getLogger('DonationService');
    const addGiftLogger =
      CallbackLoggerFactory.getInstance().getLogger('AddGiftService');
    const feePaymentLogger =
      CallbackLoggerFactory.getInstance().getLogger('FeePaymentService');
    const prizeCreationLogger = CallbackLoggerFactory.getInstance().getLogger(
      'PrizeCreationService',
    );
    const giftAndPrizeLogger = CallbackLoggerFactory.getInstance().getLogger(
      'GiftAndPrizeService',
    );
    const failureLogger =
      CallbackLoggerFactory.getInstance().getLogger('FailureService');
    const giftReturnLogger =
      CallbackLoggerFactory.getInstance().getLogger('GiftReturnService');
    const winnerRemovalLogger = CallbackLoggerFactory.getInstance().getLogger(
      'WinnerRemovalService',
    );
    const ticketRedeemLogger = CallbackLoggerFactory.getInstance().getLogger(
      'TicketRedeemService',
    );
    const licenseRedeemLogger = CallbackLoggerFactory.getInstance().getLogger(
      'LicenseRedeemService',
    );
    const safeWithdrawalLogger = CallbackLoggerFactory.getInstance().getLogger(
      'SafeWithdrawalService',
    );

    // Initialize database service
    this.logger.debug('Initializing database service');
    DbService.init(dataSource, dbLogger);
    this.logger.debug('Database service initialized');

    // Initialize scanner service
    this.logger.debug('Initializing scanner service');
    await ScannerService.init(configs.scanner, scannerLogger);
    this.logger.debug('Scanner service initialized');

    // Initialize txpot service
    this.logger.debug('Initializing txpot service');
    TxPotService.init(
      configs.txpot.updateInterval,
      dataSource,
      configs.scanner.node.url,
      configs.txpot.txRequiredConfirmations,
      txPotLogger,
    );
    this.logger.debug('Txpot service initialized');

    // Initialize health check service
    this.logger.debug('Initializing health check service');
    HealthCheckService.init(
      configs.healthCheck.updateInterval,
      healthCheckLogger,
    );
    this.logger.debug('Health check service initialized');

    // Initialize box lookup service
    this.logger.debug('Initializing box lookup service');
    BoxLookupService.init(
      configs.boxLookup.updateInterval,
      configs.scanner.node.url,
      configs.ergo.network === 'testnet' ? Network.Testnet : Network.Mainnet,
      boxLookupLogger,
    );
    this.logger.debug('Box lookup service initialized');

    // Initialize API service
    this.logger.debug('Initializing API service');
    ApiService.init(configs.api, apiLogger);
    this.logger.debug('API service initialized');

    // Initialize all transaction services
    this.logger.debug('Initializing transaction services');

    // Core transaction services
    CreationService.init(configs.scanner.node.url, creationLogger);
    ActivationService.init(configs.scanner.node.url, activationLogger);
    GiftTokenReceiptService.init(
      configs.scanner.node.url,
      giftTokenReceiptLogger,
    );
    DonationService.init(configs.scanner.node.url, donationLogger);
    AddGiftService.init(configs.scanner.node.url, addGiftLogger);
    LicenseRedeemService.init(configs.scanner.node.url, licenseRedeemLogger);
    SafeWithdrawalService.init(configs.scanner.node.url, safeWithdrawalLogger);

    // Success Raffle Services
    FeePaymentService.init(configs.scanner.node.url, feePaymentLogger);
    PrizeCreationService.init(configs.scanner.node.url, prizeCreationLogger);
    GiftAndPrizeService.init(configs.scanner.node.url, giftAndPrizeLogger);

    // Failure Services
    FailureService.init(configs.scanner.node.url, failureLogger);
    GiftReturnService.init(configs.scanner.node.url, giftReturnLogger);
    WinnerRemovalService.init(configs.scanner.node.url, winnerRemovalLogger);
    TicketRedeemService.init(configs.scanner.node.url, ticketRedeemLogger);

    this.logger.debug('All transaction services initialized');
    this.logger.info('All services initialized successfully');
  };

  /**
   * Registers all services with the ServiceManager
   */
  private registerAllServices = async (): Promise<void> => {
    this.logger.debug('Registering all services with ServiceManager...');
    // Register all services
    this.serviceManager.register(DbService.getInstance());
    this.serviceManager.register(ScannerService.getInstance());
    this.serviceManager.register(TxPotService.getInstance());
    this.serviceManager.register(HealthCheckService.getInstance());
    this.serviceManager.register(BoxLookupService.getInstance());
    this.serviceManager.register(ApiService.getInstance());
    this.serviceManager.register(CreationService.getInstance());
    this.serviceManager.register(ActivationService.getInstance());
    this.serviceManager.register(GiftTokenReceiptService.getInstance());
    this.serviceManager.register(DonationService.getInstance());
    this.serviceManager.register(AddGiftService.getInstance());
    this.serviceManager.register(FeePaymentService.getInstance());
    this.serviceManager.register(PrizeCreationService.getInstance());
    this.serviceManager.register(GiftAndPrizeService.getInstance());
    this.serviceManager.register(FailureService.getInstance());
    this.serviceManager.register(GiftReturnService.getInstance());
    this.serviceManager.register(WinnerRemovalService.getInstance());
    this.serviceManager.register(TicketRedeemService.getInstance());
    this.serviceManager.register(LicenseRedeemService.getInstance());
    this.serviceManager.register(SafeWithdrawalService.getInstance());
    this.logger.debug('All services registered with ServiceManager');
  };

  /**
   * Checks if all services have been initialized
   */
  public isServicesInitialized = (): boolean => {
    return this.isInitialized;
  };
}
