import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { SafePayEntity } from '../entities';
import { SafePayBoxInterface } from '../interfaces/types';

export class SafePayAction extends AbstractErgoBoxAction<
  SafePayBoxInterface,
  SafePayEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, SafePayEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: SafePayBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<SafePayEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        recipient: box.recipient,
        inputBoxId: box.inputBoxId,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: SafePayEntity[]): SafePayBoxInterface[] => {
    return entities.map((data) => ({
      identifier: data.identifier,
      txId: data.txId,
      recipient: data.recipient,
      extractor: data.extractor,
      serialized: data.serialized,
      inputBoxId: data.inputBoxId,
    }));
  };
}
