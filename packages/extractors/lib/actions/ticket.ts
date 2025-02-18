import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { TicketBoxInterface } from '../interfaces/types';
import { Ticket } from '../entities/ticket';

export class TicketAction extends AbstractInitializableErgoExtractorAction<
  TicketBoxInterface,
  Ticket
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<Ticket>;
  private readonly index: number;
  private readonly rewardPercent: number;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, Ticket, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(Ticket);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: TicketBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<Ticket, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        donatorErgoTree: box.donatorErgoTree,
        rangeStart: box.rangeStart,
        rangeEnd: box.rangeEnd,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: Ticket[]): TicketBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      donatorErgoTree: data.donatorErgoTree,
      rangeStart: data.rangeStart,
      rangeEnd: data.rangeEnd,
    }));
  };
}
