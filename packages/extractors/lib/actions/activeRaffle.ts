import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { ActiveRaffleBoxInterface } from '../interfaces/types';
import { ActiveRaffle } from '../entities/activeRaffle';

export class ActiveRaffleAction extends AbstractInitializableErgoExtractorAction<
  ActiveRaffleBoxInterface,
  ActiveRaffle
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<ActiveRaffle>;
  private readonly prefix = 'ActiveRaffle';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, ActiveRaffle, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(ActiveRaffle);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: ActiveRaffleBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<ActiveRaffle, 'id'>[] => {
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
   */
  convertEntityToData = (
    entities: ActiveRaffle[],
  ): ActiveRaffleBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
    }));
  };
}
