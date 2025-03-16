import { DataSource, In, QueryRunner } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleDetailsBoxInterface } from '../interfaces/types';
import { PictureEntity, RaffleDetailsEntity } from '../entities';

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
   * delete all data extracted from a block
   * @param queryRunner
   * @param extractor
   * @param block
   * @returns
   */
  protected deleteBlockEntities = async (
    queryRunner: QueryRunner,
    extractor: string,
    block: string,
  ): Promise<RaffleDetailsBoxInterface[]> => {
    const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);
    const picRepository = queryRunner.manager.getRepository(PictureEntity);
    const deletedDetails = await repository.find({
      where: { extractor: extractor, block: block },
    });
    const pictures: PictureEntity[][] = [];
    deletedDetails.forEach(async (details) => {
      const detailsPictures = await picRepository.find({
        where: { details: details },
      });
      pictures.push(detailsPictures);
    });
    await picRepository.delete({
      details: In(deletedDetails.map((rf) => rf.id)),
    });
    await repository.delete({
      extractor: extractor,
      block: block,
    });
    return this.convertEntityToData(deletedDetails, pictures);
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: RaffleDetailsEntity[],
    pictures: PictureEntity[][] = [],
  ): RaffleDetailsBoxInterface[] => {
    return entities.map((data, index) => {
      const details = {
        boxId: data.boxId,
        txId: data.txId,
        raffleId: data.raffleId,
        extractor: data.extractor,
        serialized: data.serialized,
        name: data.name,
        description: data.description,
        pictures: pictures[index],
      };
      return details;
    });
  };
}
