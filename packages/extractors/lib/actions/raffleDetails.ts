import { DataSource, QueryRunner } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleDetailsBoxInterface } from '../interfaces/types';
import { PictureEntity, RaffleDetailsEntity } from '../entities/raffleDetails';
import { pick } from 'lodash-es';

export class RaffleDetailsAction extends AbstractInitializableErgoExtractorAction<
  RaffleDetailsBoxInterface,
  RaffleDetailsEntity
> {
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleDetailsEntity, logger);
    this.dataSource = dataSource;
  }

  /**
   * insert entities extracted from a block to database
   * @param queryRunner
   * @param boxesToInsert
   * @param block
   * @param extractor
   */
  insertEntities = async (
    queryRunner: QueryRunner,
    boxesToInsert: RaffleDetailsBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ) => {
    const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);

    const picRepository = queryRunner.manager.getRepository(PictureEntity);
    for (const box of boxesToInsert) {
      // Store related pictures
      if (box.pictures != undefined) {
        await picRepository.insert(box.pictures);
      }
    }

    await repository.insert(this.createEntity(boxesToInsert, block, extractor));
  };

  /**
   * update entities related to a box
   * @param queryRunner
   * @param updateBox
   * @param block
   * @param extractor
   */
  updateEntity = async (
    queryRunner: QueryRunner,
    updateBox: RaffleDetailsBoxInterface,
    block: BlockInfo,
    extractor: string,
  ) => {
    const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);
    const picRepository = queryRunner.manager.getRepository(PictureEntity);

    // Delete old pictures
    await picRepository.delete({ raffleId: updateBox.raffleId });
    // Store related pictures
    if (updateBox.pictures != undefined) {
      await picRepository.insert(updateBox.pictures);
    }

    const box = this.createEntity([updateBox], block, extractor)[0];
    repository.update(
      {
        boxId: box.boxId,
        extractor: extractor,
      },
      box,
    );
  };

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: RaffleDetailsBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<RaffleDetailsEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        name: box.name,
        description: box.description,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: RaffleDetailsEntity[],
  ): RaffleDetailsBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'name',
        'description',
      ]),
    );
  };
}
