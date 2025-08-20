import { DataSource } from '@rosen-bridge/extended-typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { SuccessRaffleBoxInterface } from '../interfaces/types';
import { SuccessRaffleEntity } from '../entities/';
import { pick } from 'lodash-es';

export class SuccessRaffleAction extends AbstractInitializableErgoExtractorAction<
  SuccessRaffleBoxInterface,
  SuccessRaffleEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, SuccessRaffleEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: SuccessRaffleBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<SuccessRaffleEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        selectedWinnersList: box.selectedWinnersList,
        step: box.step,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: SuccessRaffleEntity[],
  ): SuccessRaffleBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'selectedWinnersList',
        'step',
      ]),
    );
  };
}
