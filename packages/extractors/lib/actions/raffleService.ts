import { DataSource } from 'typeorm';
import { pick } from 'lodash-es';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { RaffleServiceBoxInterface } from '../interfaces/types';
import { RaffleServiceEntity } from '../entities';

export class RaffleServiceAction extends AbstractInitializableErgoExtractorAction<
  RaffleServiceBoxInterface,
  RaffleServiceEntity
> {
  private readonly prefix = 'RaffleService';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleServiceEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: RaffleServiceBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<RaffleServiceEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        serviceFeePercent: box.serviceFeePercent,
        implementerFeePercent: box.implementerFeePercent,
        creationFee: box.creationFee,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: RaffleServiceEntity[],
  ): RaffleServiceBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'serviceFeePercent',
        'implementerFeePercent',
        'creationFee',
        'extractor',
        'serialized',
      ]),
    );
  };
}
