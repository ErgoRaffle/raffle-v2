import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { TicketRepoAction } from '../actions/ticketRepo';
import { TicketRepoBoxInterface } from '../interfaces/types';
import { TicketRepo } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

export class TicketRepoExtractor extends AbstractInitializableErgoExtractor<
  TicketRepoBoxInterface,
  TicketRepo
> {
  readonly actions: TicketRepoAction;
  private readonly id: string;
  private readonly ergoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new TicketRepoAction(dataSource, this.logger);
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * check proper data format in the box
   * @param box
   * @return true if the box has the required data and false otherwise
   */
  hasData = (box: OutputBox): boolean => {
    return box.ergoTree == this.ergoTree;
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): TicketRepoBoxInterface | undefined => {
    const raffleId = box.assets![0].tokenId;
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: raffleId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
