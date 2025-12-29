import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { ServiceEntity } from '../entities';
import { ServiceBoxInterface } from '../interfaces/types';

export class ServiceAction extends AbstractInitializableErgoExtractorAction<
  ServiceBoxInterface,
  ServiceEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, ServiceEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: ServiceBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<ServiceEntity, 'id'>[] => {
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
  convertEntityToData = (entities: ServiceEntity[]): ServiceBoxInterface[] => {
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
