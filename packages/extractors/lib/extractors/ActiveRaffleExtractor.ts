import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { OutputBox, ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { RaffleBoxAction } from '../actions/RaffleBoxAction';
import { BoxInterface } from '../interfaces/types';
import { RaffleBoxEntity } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

export class ActiveRaffleExtractor extends AbstractInitializableErgoExtractor<
  BoxInterface,
  RaffleBoxEntity
> {
  readonly actions: RaffleBoxAction;
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
    this.actions = new RaffleBoxAction(dataSource, this.logger);
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
    try {
      return (
        box.ergoTree == this.ergoTree &&
        box.assets!.length >= 2 &&
        box.assets!.length <= 3 &&
        box.assets![0].tokenId == this.raffleLicense
      );
    } catch (err) {
      this.logger.error(`ActiveRaffleExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): BoxInterface | undefined => {
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![1].tokenId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      ergoTree: box.ergoTree,
    };

    return data;
  };
}
