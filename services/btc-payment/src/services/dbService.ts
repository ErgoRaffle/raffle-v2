import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { BlockEntity } from '@rosen-bridge/abstract-scanner';
import { DataSource, LessThanOrEqual } from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { createDataSource } from '@ergo-raffle/data-source';
import { DynamicBoxEntity } from '@ergo-raffle/dynamic-extractor';
import { InactiveRaffleEntity } from '@ergo-raffle/extractors';
import {
  DonationParamsEntity,
  DonationStatus,
} from '@ergo-raffle/request-params';

import * as ConfigTypes from '../types/configs';

export class DbService extends AbstractService {
  name = 'DbService';
  private static instance: DbService;
  readonly dataSource: DataSource;

  private constructor(
    dbConfigs: ConfigTypes.Database,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.dataSource = createDataSource(dbConfigs);
  }

  /**
   * initializes the singleton instance of DbService
   *
   * @static
   * @param {ConfigTypes.Database} dbConfigs
   * @param {AbstractLogger} [logger]
   * @memberof DbService
   */
  static init = (dbConfigs: ConfigTypes.Database, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new DbService(dbConfigs, logger);
  };

  /**
   * return the singleton instance of DBService
   *
   * @static
   * @return {DbService}
   * @memberof DbService
   */
  static getInstance = (): DbService => {
    if (!this.instance) {
      throw new Error('DbService instances is not initialized yet');
    }
    return this.instance;
  };

  protected dependencies: Dependency[] = [];

  protected start = async (): Promise<boolean> => {
    try {
      this.setStatus(ServiceStatus.started);
      this.logger.debug('Initializing data source');
      await this.dataSource.initialize();
      this.logger.debug('data source initialized');

      this.logger.debug('running data source migrations');
      await this.dataSource.runMigrations();
      this.logger.debug('data source migrations completed');

      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the DbService: ${e}`,
      );
      return false;
    }
    this.logger.info('DbService started');
    return true;
  };

  protected stop = async (): Promise<boolean> => {
    await this.dataSource.destroy();
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Get the raffle entity by raffle id
   * @param raffleId - The raffle id
   * @returns The raffle entity
   */
  getRaffleData = (raffleId: string): Promise<InactiveRaffleEntity | null> => {
    return this.dataSource.getRepository(InactiveRaffleEntity).findOne({
      where: {
        raffleId: raffleId,
      },
    });
  };

  /**
   * Get the last donation params id
   * @returns The last donation params id
   */
  getLastDonationParamsId = async (): Promise<number> => {
    const data = await this.dataSource
      .getRepository(DonationParamsEntity)
      .findOne({
        order: { id: 'DESC' },
      });
    return data?.id || 0;
  };

  /**
   * Save the donation params
   * @param donationParams - The donation params
   */
  saveDonationParams = async (
    donationParams: Omit<
      DonationParamsEntity,
      | 'id'
      | 'timestamp'
      | 'tokenId'
      | 'tokenAmount'
      | 'requiredValue'
      | 'status'
    >,
  ): Promise<DonationParamsEntity> => {
    const raffleData = await this.getRaffleData(donationParams.raffleId);
    if (!raffleData) {
      throw new Error('Raffle not found');
    }
    // TODO: Consider a fee for the transaction fees
    const donationAmount =
      BigInt(donationParams.ticketCount) * raffleData.ticketPrice;

    // Insert the donation params to get the generated ID
    const savedParams = await this.dataSource
      .getRepository(DonationParamsEntity)
      .insert({
        ...donationParams,
        // TODO: Use the btc-side token id using the token map data
        tokenId: raffleData.collectingTokenId || 'erg',
        tokenAmount: donationAmount,
        timestamp: Date.now(),
        status: DonationStatus.Pending,
      });

    // Get the generated ID
    const generatedId = savedParams.identifiers[0].id;

    // Fetch the complete entity
    const savedEntity = await this.dataSource
      .getRepository(DonationParamsEntity)
      .findOne({
        where: { id: generatedId },
      });

    if (!savedEntity) {
      throw new Error('Failed to retrieve saved donation params');
    }

    return savedEntity;
  };

  /**
   * Get all ongoing (pending) donation requests.
   */
  getOngoingDonationRequests = async (): Promise<DonationParamsEntity[]> => {
    return this.dataSource.getRepository(DonationParamsEntity).find({
      where: { status: DonationStatus.Pending },
      order: { id: 'ASC' },
    });
  };

  /**
   * Get the sum of confirmed dynamic box amounts for an address and token.
   * Only includes boxes at or below maxHeightInclusive (i.e. confirmed enough).
   * @param address - Bitcoin address
   * @param tokenId - Token id (e.g. rune id or 'btc')
   * @param extractor - Extractor id (e.g. 'Donation')
   * @param maxHeightInclusive - Maximum block height to include (typically latestHeight - requiredConfirmations)
   */
  getConfirmedDynamicBoxSum = async (
    address: string,
    tokenId: string,
    maxHeightInclusive: number,
  ): Promise<bigint> => {
    const boxes = await this.dataSource.getRepository(DynamicBoxEntity).find({
      where: {
        address,
        tokenId,
        height: LessThanOrEqual(maxHeightInclusive),
      },
    });
    this.logger.info(
      `Found ${boxes.length} confirmed dynamic boxes for address=${address}, tokenId=${tokenId}, maxHeightInclusive=${maxHeightInclusive}`,
    );
    this.logger.debug(
      `Confirmed dynamic boxes: ${boxes.map((box) => `boxId=${box.identifier}, amount=${box.amount}`).join(', ')}`,
    );
    return boxes.reduce((sum, box) => sum + BigInt(box.amount), BigInt(0));
  };

  /**
   * Get the latest stored block for a scanner.
   * @param scanner - Scanner name (e.g. BITCOIN_SCANNER_NAME)
   * @returns The latest block, or null if no blocks stored yet
   */
  getLatestBlock = async (scanner: string): Promise<BlockEntity | null> => {
    const block = await this.dataSource.getRepository(BlockEntity).findOne({
      where: { scanner },
      order: { height: 'DESC' },
    });
    return block ?? null;
  };

  /**
   * Update donation request status.
   */
  updateDonationStatus = async (
    id: number,
    status: DonationStatus,
  ): Promise<void> => {
    await this.dataSource
      .getRepository(DonationParamsEntity)
      .update({ id }, { status });
  };
}
