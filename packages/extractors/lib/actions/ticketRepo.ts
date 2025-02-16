import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { TicketRepoBoxInterface } from '../interfaces/types';
import { TicketRepo } from '../entities/ticketRepo';

export class TicketRepoAction extends AbstractInitializableErgoExtractorAction<
  TicketRepoBoxInterface,
  TicketRepo
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<TicketRepo>;
  private readonly prefix = 'TicketRepo';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, TicketRepo, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(TicketRepo);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: TicketRepoBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<TicketRepo, 'id'>[] => {
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
  convertEntityToData = (entities: TicketRepo[]): TicketRepoBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
    }));
  };
}
