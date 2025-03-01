import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { TicketRedeemBoxInterface } from '../interfaces/types';
import { TicketRedeemEntity } from '../entities/ticketRedeem';
import { pick } from 'lodash-es';

export class TicketRedeemAction extends AbstractInitializableErgoExtractorAction<
  TicketRedeemBoxInterface,
  TicketRedeemEntity
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<TicketRedeemEntity>;
  private readonly index: number;
  private readonly rewardPercent: number;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, TicketRedeemEntity, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(TicketRedeemEntity);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: TicketRedeemBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<TicketRedeemEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        totalSoldTicket: box.totalSoldTicket,
        redeemedTickets: box.redeemedTickets,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: TicketRedeemEntity[],
  ): TicketRedeemBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'totalSoldTicket',
        'redeemedTickets',
      ]),
    );
  };
}
