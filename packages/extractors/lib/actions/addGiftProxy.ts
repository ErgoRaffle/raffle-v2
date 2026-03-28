import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { AddGiftProxyEntity } from '../entities';
import { AddGiftProxyBoxInterface } from '../interfaces/types';

export class AddGiftProxyAction extends AbstractErgoBoxAction<
  AddGiftProxyBoxInterface,
  AddGiftProxyEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, AddGiftProxyEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: AddGiftProxyBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<AddGiftProxyEntity, 'id'>[] => {
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
        winnerIndex: box.winnerIndex,
        txFee: box.txFee,
        raffleId: box.raffleId,
        giftGiverErgoTree: box.giftGiverErgoTree,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: AddGiftProxyEntity[],
  ): AddGiftProxyBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'txId',
        'address',
        'expirationHeight',
        'raffleDeadline',
        'winnerIndex',
        'txFee',
        'raffleId',
        'giftGiverErgoTree',
        'extractor',
        'serialized',
      ]),
    );
  };
}
