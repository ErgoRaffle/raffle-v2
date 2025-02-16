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
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

export class TicketRepoExtractor extends AbstractInitializableErgoExtractor<
  TicketRepoBoxInterface,
  TicketRepo
> {
  readonly actions: TicketRepoAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly raffleId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: Network,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.networkType = networkType;
    this.ergoTree = address
      ? ErgoAddress.fromBase58(address).ergoTree.toString()
      : undefined;
    this.raffleId = raffleId;
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
    const ergoBox = box as Box;
    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
