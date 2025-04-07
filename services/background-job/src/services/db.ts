import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BlockEntity, PROCEED } from '@rosen-bridge/scanner';
import * as entities from '@ergo-raffle/extractors/lib/entities';
import { RaffleEntitiesType } from '../types';

export class DBService extends AbstractService {
  name = 'DBService';
  private static instances: { [key: string]: DBService };
  readonly dataSource: DataSource;
  readonly repository: Repository<RaffleEntitiesType>;

  private constructor(
    dataSource: DataSource,
    repository: Repository<RaffleEntitiesType>,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.dataSource = dataSource;
    this.repository = repository;
  }

  /**
   * initializes the singleton instance of DBService
   *
   * @static
   * @param {DataSource} dataSource
   * @param {AbstractLogger} [logger]
   * @memberof DBService
   */
  static init = (dataSource: DataSource, logger?: AbstractLogger) => {
    if (this.instances != undefined) {
      return;
    }
    this.instances = {
      RaffleServiceEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.RaffleServiceEntity),
        logger,
      ),
      BoxEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.BoxEntity),
        logger,
      ),
      raffleService: new DBService(
        dataSource,
        dataSource.getRepository(entities.GiftEntity),
        logger,
      ),
      GiftRedeemEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.GiftRedeemEntity),
        logger,
      ),
      RaffleDetailsEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.RaffleDetailsEntity),
        logger,
      ),
      RaffleEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.RaffleEntity),
        logger,
      ),
      SuccessRaffleEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.SuccessRaffleEntity),
        logger,
      ),
      TicketEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.TicketEntity),
        logger,
      ),
      TicketRedeemEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.TicketRedeemEntity),
        logger,
      ),
      WinnerEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.WinnerEntity),
        logger,
      ),
      WinnerPrizeEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.WinnerPrizeEntity),
        logger,
      ),
      SafePayEntity: new DBService(
        dataSource,
        dataSource.getRepository(entities.SafePayEntity),
        logger,
      ),
    };
  };

  /**
   * return the singleton instance of DBService
   *
   * @static
   * @return {DBService}
   * @memberof DBService
   */
  static getInstances = (): { [key: string]: DBService } => {
    if (!this.instances) {
      throw new Error('DBService instances is not initialized yet');
    }
    return this.instances;
  };

  protected dependencies: Dependency[] = [];

  protected start = async (): Promise<boolean> => {
    try {
      this.logger.debug('Initializing data source');
      await this.dataSource.initialize();
      this.logger.debug('data source initialized');

      this.logger.debug('running data source migrations');
      await this.dataSource.runMigrations();
      this.logger.debug('data source migrations completed');

      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the DBService: ${e}`,
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
   * returns the height of the last scanned block for a particular scanner
   *
   * @param {string} name the scanner name
   * @return {Promise<number>}
   * @memberof DBService
   */
  getScannerHeight = async (name: string): Promise<number> => {
    return (
      (
        await this.dataSource.getRepository(BlockEntity).find({
          where: { status: PROCEED, scanner: name },
          order: { height: 'DESC' },
          take: 1,
        })
      ).at(0)?.height ?? 0
    );
  };

  /**
   * fetch all unspent boxes
   * @return {Promise<BoxEntity>}
   */
  getUnspentBoxes = async (): Promise<Array<RaffleEntitiesType>> => {
    return this.repository.find({
      where: { spendBlock: IsNull() },
    });
  };
}
