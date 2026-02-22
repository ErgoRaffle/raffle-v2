import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { TicketRedeemEntity } from '../entities/ticketRedeem';
import { TicketRedeemBoxInterface } from '../interfaces/types';

export class TicketRedeemAction extends AbstractErgoBoxAction<
  TicketRedeemBoxInterface,
  TicketRedeemEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, TicketRedeemEntity, logger);
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
        identifier: box.identifier,
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
        'identifier',
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
