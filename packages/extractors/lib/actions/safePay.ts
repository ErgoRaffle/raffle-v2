import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { SafePayBoxInterface } from '../interfaces/types';
import { SafePayEntity } from '../entities';

export class SafePayAction extends AbstractInitializableErgoExtractorAction<
  SafePayBoxInterface,
  SafePayEntity
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<SafePayEntity>;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, SafePayEntity, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(SafePayEntity);
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
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        recipient: box.recipient,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: SafePayEntity[]): SafePayBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      recipient: data.recipient,
      extractor: data.extractor,
      serialized: data.serialized,
    }));
  };
}
