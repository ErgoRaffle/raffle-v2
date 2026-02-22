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
} from '@ergo-raffle/extractors';

import { configs } from '../config';
import { AddGiftParamsEntity } from '../database/entities/addGiftParamsEntity';
import { CreationParamsEntity } from '../database/entities/creationParamsEntity';
import { CreationPictureEntity } from '../database/entities/creationPictureEntity';
import { DonationParamsEntity } from '../database/entities/donationParamsEntity';

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

  /**
   * Save the creation params
   * @param creationParams - The creation params
   */
  saveCreationParams = async (
    creationParams: Omit<
      CreationParamsEntity,
      | 'id'
      | 'timestamp'
      | 'isDeleted'
      | 'serviceAddress'
      | 'serviceFeePercent'
      | 'implementerFeePercent'
      | 'pictures'
    >,
    pictures: { content: string; orderIndex: number }[],
  ): Promise<CreationParamsEntity> => {
    const serviceSettings = await DbService.getInstance().getServiceBox();
    if (!serviceSettings) {
      throw new Error('Service settings not found');
    }

    // First, insert the creation params to get the generated ID
    const savedParams = await this.dataSource
      .getRepository(CreationParamsEntity)
      .insert({
        ...creationParams,
        timestamp: Date.now(),
        isDeleted: false,
        serviceAddress: configs.addresses.serviceFeeAddress,
        serviceFeePercent: serviceSettings.serviceFeePercent,
        implementerFeePercent: serviceSettings.implementerFeePercent,
      });

    // Get the generated ID
    const generatedId = savedParams.identifiers[0].id;

    // Then insert the pictures with the correct foreign key reference
    await this.dataSource.getRepository(CreationPictureEntity).insert(
      pictures.map((picture) => ({
        content: picture.content,
        orderIndex: picture.orderIndex,
        params: { id: generatedId }, // Reference the newly created entity
      })),
    );

    // Finally, fetch the complete entity with pictures
    const savedEntity = await this.dataSource
      .getRepository(CreationParamsEntity)
      .findOne({
        where: { id: generatedId },
        relations: ['pictures'],
      });

    if (!savedEntity) {
      throw new Error('Failed to retrieve saved creation params');
    }

    return savedEntity;
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
      | 'collectingTokenId'
      | 'collectingTokenAmount'
      | 'requiredValue'
    >,
  ): Promise<DonationParamsEntity> => {
    const raffleData = await this.getRaffleData(donationParams.raffleId);
    if (!raffleData) {
      throw new Error('Raffle not found');
    }
    const donationAmount =
      BigInt(donationParams.ticketCount) * raffleData.ticketPrice;
    let requiredValue = 0n;
    let collectingTokenAmount = 0n;
    if (raffleData.collectingTokenId) {
      requiredValue = configs.ergo.fee * 4n;
      collectingTokenAmount = donationAmount;
    } else {
      requiredValue = donationAmount + configs.ergo.fee * 4n;
    }
    // Insert the donation params to get the generated ID
    const savedParams = await this.dataSource
      .getRepository(DonationParamsEntity)
      .insert({
        ...donationParams,
        requiredValue,
        collectingTokenId: raffleData.collectingTokenId,
        collectingTokenAmount,
        timestamp: Date.now(),
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
   * Save the add gift params
   * @param addGiftParams - The add gift params
   */
  saveAddGiftParams = async (
    addGiftParams: Omit<AddGiftParamsEntity, 'id' | 'timestamp'>,
  ): Promise<AddGiftParamsEntity> => {
    // Insert the add gift params to get the generated ID
    const savedParams = await this.dataSource
      .getRepository(AddGiftParamsEntity)
      .insert({
        ...addGiftParams,
        timestamp: Date.now(),
      });

    // Get the generated ID
    const generatedId = savedParams.identifiers[0].id;

    // Fetch the complete entity
    const savedEntity = await this.dataSource
      .getRepository(AddGiftParamsEntity)
      .findOne({
        where: { id: generatedId },
      });

    if (!savedEntity) {
      throw new Error('Failed to retrieve saved add gift params');
    }

    return savedEntity;
  };
}
