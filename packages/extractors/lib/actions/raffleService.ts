import { DataSource, In, Repository } from 'typeorm';
import { chunk, difference } from 'lodash-es';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  SpendInfo,
  DB_CHUNK_SIZE,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { RaffleServiceBoxInterface } from '../interfaces/types';
import { RaffleService } from '../entities/raffleService';

export class RaffleServiceAction extends AbstractInitializableErgoExtractorAction<RaffleServiceBoxInterface> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  private readonly repository: Repository<RaffleService>;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super();
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(RaffleService);
  }

  /**
   * insert all extracted box data in an atomic transaction
   * @param boxes
   * @param block
   * @param extractor
   * @return success
   */
  insertBoxes = async (
    boxes: Array<RaffleServiceBoxInterface>,
    block: BlockInfo,
    extractor: string,
  ) => {
    const entities = boxes.map((box) => ({
      boxId: box.boxId,
      block: block.hash,
      height: block.height,
      txId: box.txId,
      boxSerialized: box.boxSerialized,
      extractor: extractor,
      serviceFeePercent: box.serviceFeePercent,
      implementerFeePercent: box.implementerFeePercent,
      creationFee: BigInt(box.creationFee),
    }));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const repository = await queryRunner.manager.getRepository(RaffleService);
    try {
      const existingBoxIds = (
        await repository.find({
          where: {
            boxId: In(entities.map((box) => box.boxId)),
            extractor: extractor,
          },
          select: {
            boxId: true,
          },
        })
      ).map((entity) => entity.boxId);

      const entitiesToUpdate = entities.filter((entity) =>
        existingBoxIds.includes(entity.boxId),
      );

      const entitiesToInsert = difference(entities, entitiesToUpdate);

      if (entitiesToInsert.length > 0) {
        this.logger.info(
          `Inserting boxes with following IDs into the database: [${entitiesToInsert
            .map((col) => col.boxId)
            .join(', ')}]`,
        );
        this.logger.debug(
          `Inserting RaffleService boxes [${JsonBigInt.stringify(
            entitiesToInsert,
          )}]`,
        );
        await repository.insert(entitiesToInsert);
      }

      if (entitiesToUpdate.length > 0)
        this.logger.info(
          `Updating boxes with following IDs in the database: [${entitiesToUpdate
            .map((col) => col.boxId)
            .join(', ')}]`,
        );
      entitiesToUpdate.forEach(async (entity) => {
        this.logger.debug(
          `Updating RaffleService box in database [${JsonBigInt.stringify(
            entity,
          )}]`,
        );
        await repository.update(
          {
            boxId: entity.boxId,
            extractor: extractor,
          },
          entity,
        );
      });

      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(`An error occurred during store boxes action: ${e}`);
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
    return true;
  };

  /**
   * update spending information of stored boxes
   * chunk spendInfos to prevent large database queries
   * @param spendInfos
   * @param block
   * @param extractor
   */
  spendBoxes = async (
    spendInfos: Array<SpendInfo>,
    block: BlockInfo,
    extractor: string,
  ): Promise<void> => {
    const spendInfoChunks = chunk(spendInfos, DB_CHUNK_SIZE);
    for (const spendInfoChunk of spendInfoChunks) {
      const boxIds = spendInfoChunk.map((info) => info.boxId);
      const updateResult = await this.repository.update(
        {
          boxId: In(boxIds),
          extractor: extractor,
        },
        { spendBlock: block.hash, spendHeight: block.height },
      );

      if (updateResult.affected && updateResult.affected > 0) {
        const spentRows = await this.repository.findBy({
          boxId: In(boxIds),
          spendBlock: block.hash,
        });
        for (const row of spentRows) {
          this.logger.debug(
            `Spent box with boxId [${row.boxId}] at height ${block.height}`,
          );
        }
      }
    }
  };

  /**
   * remove all existing data for the extractor
   * @param extractor
   */
  removeAllData = async (extractor?: string) => {
    await this.repository.delete({
      extractor: extractor,
    });
  };

  /**
   * delete extracted data from a specific block
   * if a box is spend in this block mark it as unspent
   * if a box is created in this block remove it from database
   * @param block
   * @param extractor
   */
  deleteBlockBoxes = async (block: string, extractor?: string) => {
    this.logger.info(
      `Deleting boxes in block ${block} and extractor RaffleService`,
    );
    await this.repository.delete({
      extractor: extractor,
      block: block,
    });
    await this.repository.update(
      {
        spendBlock: block,
        extractor: extractor,
      },
      { spendBlock: null, spendHeight: undefined },
    );
  };
}
