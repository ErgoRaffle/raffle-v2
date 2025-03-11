import { DataSource, QueryRunner } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleDetailsBoxInterface } from '../interfaces/types';
import { PictureEntity, RaffleDetailsEntity } from '../entities';
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
    const insertedBoxes = await repository.insert(
      this.createEntity(boxesToInsert, block, extractor),
    );

    // insert related pictures
    const ids = insertedBoxes.identifiers.map((d) => d['id']);
    const picRepository = queryRunner.manager.getRepository(PictureEntity);
    const pictures = [];
    for (let i = 0; i < boxesToInsert.length; i++) {
      const box = boxesToInsert[i];
      if (box.pictures != undefined) {
        for (const pic of box.pictures) {
          const raffleDetailsObject = new RaffleDetailsEntity();
          raffleDetailsObject.id = ids[i];
          pictures.push({ ...pic, details: raffleDetailsObject });
        }
      }
    }
    if (pictures.length > 0)
      // Store related pictures
      await picRepository.insert(pictures);
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

    const box = this.createEntity([updateBox], block, extractor)[0];
    await repository.update(
      {
        boxId: box.boxId,
        extractor: extractor,
      },
      box,
    );

    // Delete old pictures
    await picRepository.delete({ raffleId: updateBox.raffleId });
    // Store related pictures
    if (updateBox.pictures != undefined) {
      const pictures = updateBox.pictures.map((pic) => ({
        ...pic,
        details: updateBox,
      }));
      await picRepository.insert(pictures);
    }
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
