import { DataSource, In, Repository } from 'typeorm';
import { chunk } from 'lodash-es';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  SpendInfo,
  DB_CHUNK_SIZE,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleServiceBoxInterface } from '../interfaces/types';
import { RaffleService } from '../entities/raffleService';
import { JsonBI } from '../utils';

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
    const boxIds = boxes.map((item) => item.boxId);
    const dbBoxes = await this.dataSource.getRepository(RaffleService).findBy({
      boxId: In(boxIds),
      extractorName: extractor,
    });
    if (dbBoxes.length > 0)
      this.logger.debug(`Found stored boxes with same boxId`, dbBoxes);
    let success = true;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const repository = await queryRunner.manager.getRepository(RaffleService);
    try {
      for (const box of boxes) {
        const entity = {
          boxId: box.boxId,
          block: block.hash,
          height: block.height,
          txId: box.txId,
          boxSerialized: box.boxSerialized,
          extractorName: extractor,
          serviceFeePercent: box.serviceFeePercent,
          implementerFeePercent: box.implementerFeePercent,
          creationFee: box.creationFee,
        };
        const dbBox = dbBoxes.filter((item) => item.boxId === box.boxId);
        if (dbBox.length > 0) {
          this.logger.info(
            `Updating box ${box.boxId} and extractor ${extractor}`,
          );
          await repository.update({ boxId: dbBox[0].boxId }, entity);
          this.logger.debug(
            `Updated entity is [${JsonBI.stringify(
              box,
            )}], and stored similar box is [${JsonBI.stringify(dbBox)}]`,
          );
        } else {
          this.logger.info(`Storing box ${box.boxId}`);
          await repository.insert(entity);
          this.logger.debug(`Stored ${JsonBI.stringify(entity)}`);
        }
      }
      await queryRunner.commitTransaction();
    } catch (e) {
      this.logger.error(`An error occurred during store boxes action: ${e}`);
      await queryRunner.rollbackTransaction();
      success = false;
    } finally {
      await queryRunner.release();
    }
    return success;
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
        { boxId: In(boxIds), extractorName: extractor },
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
   * @param extractorId
   */
  removeAllData = async (extractorId: string) => {
    await this.repository.delete({ extractorName: extractorId });
  };

  /**
   * delete extracted data from a specific block
   * if a box is spend in this block mark it as unspent
   * if a box is created in this block remove it from database
   * @param block
   * @param extractorId
   */
  deleteBlockBoxes = async (block: string, extractor: string) => {
    this.logger.info(
      `Deleting boxes in block ${block} and extractor ${extractor}`,
    );
    await this.repository.delete({
      extractorName: extractor,
      block: block,
    });
    await this.repository.update(
      { spendBlock: block, extractorName: extractor },
      { spendBlock: null, spendHeight: 0 },
    );
  };
}
