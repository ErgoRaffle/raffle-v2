import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { CreationProxyEntity } from '../entities';
import { CreationProxyBoxInterface } from '../interfaces/types';

export class CreationProxyAction extends AbstractErgoBoxAction<
  CreationProxyBoxInterface,
  CreationProxyEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, CreationProxyEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: CreationProxyBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<CreationProxyEntity, 'id'>[] => {
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
        winnersPercent: box.winnersPercent,
        ticketPrice: box.ticketPrice,
        goal: box.goal,
        txFee: box.txFee,
        implementerErgoTree: box.implementerErgoTree,
        creatorErgoTree: box.creatorErgoTree,
        winnersPercentList: box.winnersPercentList,
        collectingTokenId: box.collectingTokenId,
        name: box.name,
        description: box.description,
        pictures: box.pictures,
        winnerCount: box.winnerCount,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: CreationProxyEntity[],
  ): CreationProxyBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'txId',
        'address',
        'expirationHeight',
        'raffleDeadline',
        'winnersPercent',
        'ticketPrice',
        'goal',
        'txFee',
        'implementerErgoTree',
        'creatorErgoTree',
        'winnersPercentList',
        'collectingTokenId',
        'name',
        'description',
        'pictures',
        'winnerCount',
        'extractor',
        'serialized',
      ]),
    );
  };
}
