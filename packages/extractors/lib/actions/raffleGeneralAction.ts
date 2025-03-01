import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { RaffleGeneralInterface } from '../interfaces/types';
import { RaffleGeneralEntity } from '../entities';
import { pick } from 'lodash-es';

export class RaffleGeneralAction extends AbstractInitializableErgoExtractorAction<
  RaffleGeneralInterface,
  RaffleGeneralEntity
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<RaffleGeneralEntity>;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleGeneralEntity, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(RaffleGeneralEntity);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: RaffleGeneralInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<RaffleGeneralEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: RaffleGeneralEntity[],
  ): RaffleGeneralInterface[] => {
    return entities.map((data) =>
      pick(data, ['boxId', 'txId', 'raffleId', 'extractor', 'serialized']),
    );
  };
}
