import { AbstractLogger, DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  BitcoinRpcNetwork,
  BitcoinRpcScanner,
} from '@rosen-bridge/bitcoin-scanner';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import * as bitcoin from 'bitcoinjs-lib';

import { DynamicExtractor } from '@ergo-raffle/dynamic-extractor';

import { Bitcoin as BitcoinConfig } from '../types/configs';
import { DbService } from './dbService';

export class ScannerService extends PeriodicTaskService {
  name = 'ScannerService';
  private static instance: ScannerService;
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  readonly bitcoinScanner: BitcoinRpcScanner;
  private dynamicExtractor: DynamicExtractor;

  private constructor(
    private readonly config: BitcoinConfig,
    logger?: AbstractLogger,
  ) {
    super(logger);
    const { url, timeout, username, password } = this.config.rpc;
    const network = new BitcoinRpcNetwork(
      url,
      timeout * 1000, // convert to milliseconds
      username && password ? { username, password } : undefined,
    );
    this.bitcoinScanner = new BitcoinRpcScanner({
      dataSource: DbService.getInstance().dataSource,
      initialHeight: this.config.initialHeight ?? 0,
      network,
      logger: DefaultLogger.getInstance().child('btc-scanner'),
    });
    const unisat = this.config.runes.unisat;
    const btcNetwork =
      this.config.network === 'testnet'
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
    this.dynamicExtractor = new DynamicExtractor(
      DbService.getInstance().dataSource,
      'Donation',
      btcNetwork,
      unisat.url,
      unisat.apiKey,
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
    config: BitcoinConfig,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ScannerService(config, logger);
    await this.instance.registerExtractors();
  };

  /**
   * Returns the singleton instance of ScannerService
   */
  static readonly getInstance = (): ScannerService => {
    if (!this.instance) {
      throw new Error('ScannerService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Re-registers all pending donation addresses in the dynamic extractor before starting the service.
   */
  protected preStart = async (): Promise<void> => {
    const activeDonations = await DbService.getInstance()
      .getDonationAction()
      .getOngoing();
    for (const donation of activeDonations) {
      this.addDynamicAddress(donation.bitcoinAddress, donation.tokenId);
    }

    this.logger.info(
      `Re-registered ${activeDonations.length} active donation address-token pairs in dynamic extractor`,
    );
  };

  protected postStop = async (): Promise<void> => {};

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
        interval: this.config.scannerInterval * 1000,
      },
    ];
  };

  /**
   * Add a (address, tokenId) pair to the dynamic extractor (e.g. donation proxy address and rune to watch).
   */
  addDynamicAddress = (address: string, tokenId: string) => {
    this.dynamicExtractor.addNewAddress(address, tokenId);
  };

  /**
   * Remove a Bitcoin address from the dynamic extractor.
   */
  removeDynamicAddress = (address: string) => {
    this.dynamicExtractor.removeAddress(address);
  };

  /**
   * Get the name of the Bitcoin scanner.
   */
  getBitcoinScannerName = (): string => {
    return this.bitcoinScanner.name();
  };
}
