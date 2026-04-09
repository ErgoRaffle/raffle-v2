import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { BlockEntity } from '@rosen-bridge/abstract-scanner';
import {
  IsNull,
  DataSource,
  LessThanOrEqual,
  MoreThan,
} from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { pick } from 'lodash-es';

import {
  RaffleBoxEntity,
  InactiveRaffleEntity,
  WinnerEntity,
  RaffleBoxType,
  RaffleDetailsEntity,
  SuccessRaffleEntity,
  WinnerPrizeEntity,
  GiftEntity,
  GiftRedeemEntity,
  TicketEntity,
  TicketRedeemEntity,
  SafePayEntity,
  ServiceEntity,
  DonationProxyEntity,
  CreationProxyEntity,
  AddGiftProxyEntity,
} from '@ergo-raffle/extractors';

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
    this.logger.info('DbService started');
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
   * @param isUnspent - Whether to filter by unspent boxes
   * @param minHeight - If provided, only returns raffles with height greater than this value
   * @returns The inactive raffle boxes
   */
  getInactiveRaffleBoxes = (
    isUnspent = true,
    minHeight?: number,
  ): Promise<InactiveRaffleEntity[]> => {
    return this.dataSource.getRepository(InactiveRaffleEntity).findBy({
      ...(isUnspent ? { spendBlock: IsNull() } : {}),
      ...(minHeight ? { height: MoreThan(minHeight) } : {}),
    });
  };

  /**
   * Get the unspent service box
   * @returns The service box
   */
  getServiceBox = () => {
    return this.dataSource.getRepository(ServiceEntity).findOne({
      where: {
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the winner box by raffle id and index
   * @param raffleId - The raffle id
   * @param index - The index of the winner
   * @returns The winner box
   */
  getWinnerBoxes = (
    raffleId?: string,
    index?: number,
  ): Promise<WinnerEntity[]> => {
    return this.dataSource.getRepository(WinnerEntity).find({
      where: {
        ...(raffleId ? { raffleId: raffleId } : {}),
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
   * Get the unspent ticket redeem boxes
   * @param raffleId - The raffle id
   * @returns The ticket redeem boxes
   */
  getTicketRedeemBoxes = (raffleId?: string): Promise<TicketRedeemEntity[]> => {
    return this.dataSource.getRepository(TicketRedeemEntity).find({
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
  getTickets = (raffleId: string, index?: bigint): Promise<TicketEntity[]> => {
    return this.dataSource.getRepository(TicketEntity).find({
      where: {
        raffleId,
        ...(index
          ? {
              rangeStart: LessThanOrEqual(index),
              rangeEnd: MoreThan(index),
            }
          : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent safe pay boxes
   * @param identifier - The box identifier
   * @returns The safe pay boxes
   */
  getSafePayBoxes = (identifier?: string): Promise<SafePayEntity[]> => {
    return this.dataSource.getRepository(SafePayEntity).find({
      where: {
        ...(identifier ? { identifier } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent donation proxy boxes
   * @param boxId - The box id
   * @returns The donation proxy boxes
   */
  getDonationProxyBoxes = (boxId?: string): Promise<DonationProxyEntity[]> => {
    return this.dataSource.getRepository(DonationProxyEntity).find({
      where: {
        ...(boxId ? { identifier: boxId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent creation proxy boxes
   * @param boxId - The box id
   * @returns The creation proxy boxes
   */
  getCreationProxyBoxes = (boxId?: string): Promise<CreationProxyEntity[]> => {
    return this.dataSource.getRepository(CreationProxyEntity).find({
      where: {
        ...(boxId ? { identifier: boxId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * Get the unspent add-gift proxy boxes
   * @param boxId - The box id
   * @returns The add-gift proxy boxes
   */
  getAddGiftProxyBoxes = (boxId?: string): Promise<AddGiftProxyEntity[]> => {
    return this.dataSource.getRepository(AddGiftProxyEntity).find({
      where: {
        ...(boxId ? { identifier: boxId } : {}),
        spendBlock: IsNull(),
      },
    });
  };

  /*
   * Get the last block for a given scanner
   * @param scanner - The scanner name
   * @returns The last block
   */
  getLastBlock = async (
    scanner: string,
  ): Promise<Pick<BlockEntity, 'height' | 'timestamp'>> => {
    const block = await this.dataSource.getRepository(BlockEntity).findOne({
      where: { scanner },
      order: {
        height: 'DESC',
      },
    });
    if (!block) {
      throw new Error(`No block found for scanner ${scanner}`);
    }
    return pick(block, ['height', 'timestamp']);
  };
}
