import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { DonationProxyEntity } from '../entities';
import { DonationProxyBoxInterface } from '../interfaces/types';

export class DonationProxyAction extends AbstractErgoBoxAction<
  DonationProxyBoxInterface,
  DonationProxyEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, DonationProxyEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: DonationProxyBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<DonationProxyEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        address: box.address,
        expirationHeight: box.expirationHeight,
        raffleDeadline: box.raffleDeadline,
        ticketCount: box.ticketCount,
        txFee: box.txFee,
        raffleId: box.raffleId,
        donatorErgoTree: box.donatorErgoTree,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: DonationProxyEntity[],
  ): DonationProxyBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'txId',
        'address',
        'expirationHeight',
        'raffleDeadline',
        'ticketCount',
        'txFee',
        'raffleId',
        'donatorErgoTree',
        'extractor',
        'serialized',
      ]),
    );
  };
}
