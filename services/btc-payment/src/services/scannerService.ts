import { AbstractLogger, DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  BitcoinEsploraScanner,
  EsploraNetwork,
} from '@rosen-bridge/bitcoin-scanner';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { DynamicExtractor } from '@ergo-raffle/dynamic-extractor';

import { Scanner as ScannerConfig } from '../types/configs';
import { DbService } from './dbService';

export class ScannerService extends PeriodicTaskService {
  name = 'ScannerService';
  private static instance: ScannerService;
  readonly scannerConfig: ScannerConfig;
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  readonly bitcoinScanner: BitcoinEsploraScanner;
  private dynamicExtractor: DynamicExtractor;

  private constructor(scannerConfig: ScannerConfig, logger?: AbstractLogger) {
    super(logger);
    this.scannerConfig = scannerConfig;
    const network = new EsploraNetwork(
      this.scannerConfig.esplora.url,
      this.scannerConfig.esplora.timeout,
    );
    this.bitcoinScanner = new BitcoinEsploraScanner({
      dataSource: DbService.getInstance().dataSource,
      initialHeight: this.scannerConfig.initialHeight ?? 0,
      network,
      logger: DefaultLogger.getInstance().child('btc-scanner'),
    });
    this.dynamicExtractor = new DynamicExtractor(
      DbService.getInstance().dataSource,
      'Donation',
      DefaultLogger.getInstance().child('btc-dynamic-extractor'),
    );
  }

  /**
   * Register all required extractors (e.g. dynamic address watcher for donations).
   */
  protected readonly registerExtractors = async () => {
    await this.bitcoinScanner.registerExtractor(this.dynamicExtractor);
  };

  /**
   * Initialize the singleton instance of ScannerService.
   * If initialHeight is not set in config, fetches current network height and uses it.
   */
  static readonly init = async (
    scannerConfig: ScannerConfig,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    let config = scannerConfig;
    if (scannerConfig.initialHeight == null) {
      const network = new EsploraNetwork(
        scannerConfig.esplora.url,
        scannerConfig.esplora.timeout,
      );
      const currentHeight = await network.getCurrentHeight();
      config = { ...scannerConfig, initialHeight: currentHeight };
    }
    this.instance = new ScannerService(config, logger);
    await this.instance.registerExtractors();
  };

  static readonly getInstance = (): ScannerService => {
    if (!this.instance) {
      throw new Error('ScannerService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Starts the service periodic job for updating the Bitcoin scanner
   */
  protected preStart = async (): Promise<void> => {
    this.logger.debug('Starting ScannerService');
  };

  /**
   * Stops the service periodic job for updating the Bitcoin scanner
   */
  protected postStop = async (): Promise<void> => {
    this.logger.info('ScannerService stopped');
  };

  /**
   * Returns the periodic task for the Bitcoin scanner (single chain).
   */
  protected getTasks = () => {
    return [
      {
        fn: async () => {
          try {
            await this.bitcoinScanner.update();
          } catch (err) {
            this.logger.error(
              `ScannerService bitcoin scanner update failed: ${err}`,
            );
            if (err instanceof Error && err.stack) {
              this.logger.error(err.stack);
            }
          }
        },
        interval: this.scannerConfig.scannerInterval * 1000,
      },
    ];
  };

  /**
   * Add a Bitcoin address to the dynamic extractor (e.g. donation proxy address).
   */
  addDynamicAddress = (address: string) => {
    this.dynamicExtractor.addNewAddress(address);
  };

  /**
   * Remove a Bitcoin address from the dynamic extractor.
   */
  removeDynamicAddress = (address: string) => {
    this.dynamicExtractor.removeAddress(address);
  };
}
