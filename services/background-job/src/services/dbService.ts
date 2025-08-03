import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  RaffleBoxEntity,
  InactiveRaffleEntity,
  RaffleServiceEntity,
  DynamicBoxEntity,
  WinnerEntity,
  RaffleBoxType,
  RaffleDetailsEntity,
  SuccessRaffleEntity,
  WinnerPrizeEntity,
  GiftEntity,
  GiftRedeemEntity,
  TicketEntity,
} from '@ergo-raffle/extractors';
import { IsNull, LessThan, MoreThanOrEqual } from 'typeorm';

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
   * @param type - The type of the box to filter by
   * @returns The raffle boxes
   */
  getRaffleBoxes = (
    raffleId?: string,
    type?: RaffleBoxType,
    isUnspent = true,
  ): Promise<RaffleBoxEntity[]> => {
    return this.dataSource.getRepository(RaffleBoxEntity).find({
      where: {
        ...(raffleId ? { raffleId: raffleId } : {}),
        ...(type ? { type: type } : {}),
        ...(isUnspent ? { spendBlock: IsNull() } : {}),
      },
    });
  };

  /**
   * Get all inactive raffle boxes
   * @returns The inactive raffle boxes
   */
  getInactiveRaffleBoxes = (): Promise<InactiveRaffleEntity[]> => {
    return this.dataSource
      .getRepository(InactiveRaffleEntity)
      .findBy({ spendBlock: IsNull() });
  };

  /**
   * Get the unspent service box
   * @returns The service box
   */
  getServiceBox = () => {
    return this.dataSource.getRepository(RaffleServiceEntity).findOne({
      where: {
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the dynamic boxes by address
   * @param address - The address
   * @returns The dynamic boxes
   */
  getDynamicBoxes = (address: string): Promise<DynamicBoxEntity[]> => {
    return this.dataSource
      .getRepository(DynamicBoxEntity)
      .find({ where: { address: address, spendBlock: IsNull() } });
  };

  /**
   * Get the winner box by raffle id and index
   * @param raffleId - The raffle id
   * @param index - The index of the winner
   * @returns The winner box
   */
  getWinnerBoxes = (
    raffleId: string,
    index?: number,
  ): Promise<WinnerEntity[]> => {
    return this.dataSource.getRepository(WinnerEntity).find({
      where: {
        raffleId,
        ...(index ? { index } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the raffle details box by raffle id
   * @param raffleId - The raffle id
   * @returns The raffle details box
   */
  getRaffleDetailsBox = (
    raffleId: string,
  ): Promise<RaffleDetailsEntity | null> => {
    return this.dataSource.getRepository(RaffleDetailsEntity).findOne({
      where: {
        raffleId,
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent success raffle boxes
   * @param raffleId - The raffle id
   * @returns The success raffle boxes
   */
  getSuccessRaffleBoxes = (
    raffleId?: string,
  ): Promise<SuccessRaffleEntity[]> => {
    return this.dataSource.getRepository(SuccessRaffleEntity).find({
      where: {
        ...(raffleId ? { raffleId: raffleId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent winner prize boxes
   * @param raffleId - The raffle id
   * @returns The winner prize boxes
   */
  getWinnerPrizeBoxes = (raffleId?: string): Promise<WinnerPrizeEntity[]> => {
    return this.dataSource.getRepository(WinnerPrizeEntity).find({
      where: {
        ...(raffleId ? { raffleId: raffleId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent gift boxes
   * @param raffleId - The raffle id
   * @returns The gift boxes
   */
  getGifts = (
    raffleId: string,
    winnerIndex?: number,
  ): Promise<GiftEntity[]> => {
    return this.dataSource.getRepository(GiftEntity).find({
      where: {
        raffleId,
        ...(winnerIndex ? { winnerIndex } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent gift redeem boxes
   * @param raffleId - The raffle id
   * @returns The gift redeem boxes
   */
  getGiftRedeemBoxes = (raffleId?: string): Promise<GiftRedeemEntity[]> => {
    return this.dataSource.getRepository(GiftRedeemEntity).find({
      where: {
        ...(raffleId ? { raffleId: raffleId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent ticket boxes
   * @param raffleId - The raffle id
   * @param index - The index of the ticket
   * @returns The ticket boxes
   */
  getTicket = (
    raffleId: string,
    index?: bigint,
  ): Promise<TicketEntity | null> => {
    return this.dataSource.getRepository(TicketEntity).findOne({
      where: {
        raffleId,
        ...(index
          ? {
              rangeStart: MoreThanOrEqual(index),
              rangeEnd: LessThan(index),
            }
          : {}),
        spendBlock: IsNull(),
      },
    });
  };
}
