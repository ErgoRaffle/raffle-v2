import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { RaffleBoxAction } from '../actions/raffleBoxAction';
import { RaffleBoxEntity } from '../entities';
import { RaffleBoxType } from '../entities/raffleBoxEntity';
import { RaffleBoxInterface } from '../interfaces/types';

export class GiftTokenRepoExtractor extends AbstractInitializableErgoExtractor<
  RaffleBoxInterface,
  RaffleBoxEntity
> {
  readonly actions: RaffleBoxAction;
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
    this.actions = new RaffleBoxAction(dataSource, this.logger);
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
        Buffer.from(
          SConstant.from(box.additionalRegisters!.R8!).data as Uint8Array,
        ).toString('hex').length == 64
      );
    } catch (err) {
      this.logger.error(`GiftTokenRepoExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleBoxInterface | undefined => {
    const raffleId = SConstant.from(box.additionalRegisters!.R8!)
      .data as Uint8Array;
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: Buffer.from(raffleId).toString('hex'),
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      type: RaffleBoxType.GiftTokenRepo,
    };

    return data;
  };
}
