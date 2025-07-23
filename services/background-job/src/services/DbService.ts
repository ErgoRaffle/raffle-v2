import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { RaffleBoxEntity, InactiveRaffleEntity } from '@ergo-raffle/extractors';

export class DbService extends AbstractService {
  name = 'DbService';
  private static instance: DbService;
  readonly dataSource: DataSource;

  private constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(logger);
    this.dataSource = dataSource;
  }

  /**
   * initializes the singleton instance of DbService
   *
   * @static
   * @param {DataSource} dataSource
   * @param {AbstractLogger} [logger]
   * @memberof DbService
   */
  static init = (dataSource: DataSource, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new DbService(dataSource, logger);
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
    return true;
  };

  protected stop = async (): Promise<boolean> => {
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
   * Get the raffle boxes by raffle id (includes ticketRepo, activeRaffle, giftTokenRepo boxes)
   * @param raffleId - The raffle id
   * @param ergoTree - The ergo tree of the box to filter by
   * @returns The raffle boxes
   */
  getRaffleBoxes = (
    raffleId: string,
    ergoTree?: string,
  ): Promise<RaffleBoxEntity[]> => {
    return this.dataSource.getRepository(RaffleBoxEntity).find({
      where: {
        raffleId: raffleId,
        ...(ergoTree ? { ergoTree: ergoTree } : {}),
      },
    });
  };

  /**
   * Get all inactive raffle boxes
   * @returns The inactive raffle boxes
   */
  getInactiveRaffleBoxes = (): Promise<InactiveRaffleEntity[]> => {
    return this.dataSource.getRepository(InactiveRaffleEntity).find();
  };
}
