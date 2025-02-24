import { DataSource, Repository } from 'typeorm';
import { pick } from 'lodash-es';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleServiceBoxInterface } from '../interfaces/types';
import { RaffleService } from '../entities';

export class RaffleServiceAction extends AbstractInitializableErgoExtractorAction<
  RaffleServiceBoxInterface,
  RaffleService
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<RaffleService>;
  private readonly prefix = 'RaffleService';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleService, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(RaffleService);
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
  ): Omit<RaffleService, 'id'>[] => {
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
    entities: RaffleService[],
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
