import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

import { RaffleDetails, Picture } from '@ergo-raffle/extractors/lib/entities';
import { RaffleDetailsAction } from '../actions/raffleDetails';
import { RaffleDetailsBoxInterface } from '../interfaces/types';

export class RaffleDetailsExtractor extends AbstractInitializableErgoExtractor<
  RaffleDetailsBoxInterface,
  RaffleDetails
> {
  readonly actions: RaffleDetailsAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly dataSource: DataSource;

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
    this.dataSource = dataSource;
    this.actions = new RaffleDetailsAction(dataSource, this.logger);
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
  extractBoxData = (box: OutputBox): RaffleDetailsBoxInterface | undefined => {
    const R4Serialized = SConstant.from(box.additionalRegisters!.R4!)
      .data as Uint8Array[];
    for (let i = 0; i < R4Serialized.slice(2).length; i++) {
      this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Picture)
        .values([
          {
            orderIndex: i,
            raffleId: box.assets![0].tokenId,
            content: String.fromCharCode(...R4Serialized.slice(2)[i]),
          },
        ])
        .execute();
    }

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
      name: String.fromCharCode(...R4Serialized[0]),
      description: String.fromCharCode(...R4Serialized[1]),
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
