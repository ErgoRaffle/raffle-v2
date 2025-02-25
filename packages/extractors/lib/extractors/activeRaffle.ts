import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { RaffleGeneralAction } from '../actions/raffleGeneralAction';
import { RaffleGeneralInterface } from '../interfaces/types';
import { RaffleGeneralEntity } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

export class ActiveRaffleExtractor extends AbstractInitializableErgoExtractor<
  RaffleGeneralInterface,
  RaffleGeneralEntity
> {
  readonly actions: RaffleGeneralAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly raffleLicense: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleLicense: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new RaffleGeneralAction(dataSource, this.logger);
    this.raffleLicense = raffleLicense;
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
    return (
      box.ergoTree == this.ergoTree &&
      box.assets!.length >= 2 &&
      box.assets!.length <= 3 &&
      box.assets![0].tokenId == this.raffleLicense
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleGeneralInterface | undefined => {
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![1].tokenId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
