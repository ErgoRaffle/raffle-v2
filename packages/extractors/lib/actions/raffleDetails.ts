import { DataSource, QueryRunner } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleDetailsBoxInterface } from '../interfaces/types';
import { PictureEntity, RaffleDetailsEntity } from '../entities/raffleDetails';

export class RaffleDetailsAction extends AbstractInitializableErgoExtractorAction<
  RaffleDetailsBoxInterface,
  RaffleDetailsEntity
> {
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleDetailsEntity, logger);
    this.dataSource = dataSource;
  }

  updateEntity = async (
    queryRunner: QueryRunner,
    updateBox: RaffleDetailsBoxInterface,
    block: BlockInfo,
    extractor: string,
  ) => {
    const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);

    // delete old pictures
    await queryRunner.manager.delete(PictureEntity, {
      raffleId: updateBox.raffleId,
    });

    const box = this.createEntity([updateBox], block, extractor)[0];
    await repository.update(
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
      // Store related pictures
      if (box.pictures != undefined) {
        this.dataSource.manager.insert(PictureEntity, box.pictures);
      }

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
}
