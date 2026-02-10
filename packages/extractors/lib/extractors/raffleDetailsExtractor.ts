import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { RaffleDetailsAction } from '../actions/raffleDetailsAction';
import { RaffleDetailsEntity } from '../entities';
import { RaffleDetailsBoxInterface } from '../interfaces/types';

export class RaffleDetailsExtractor extends AbstractInitializableErgoExtractor<
  RaffleDetailsBoxInterface,
  RaffleDetailsEntity
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
    this.actions = new RaffleDetailsAction(dataSource, logger);
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
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters.R4).data as Uint8Array[])
          .length >= 2 &&
        box.assets.length == 1
      );
    } catch (err) {
      this.logger.error(`RaffleDetailsExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleDetailsBoxInterface | undefined => {
    const R4Serialized = SConstant.from(box.additionalRegisters!.R4!)
      .data as Uint8Array[];
    const pictures = R4Serialized.slice(2).map((picInfo, i) => {
      return {
        orderIndex: i,
        raffleId: box.assets![0].tokenId,
        content: Buffer.from(picInfo).toString(),
      };
    });

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
      name: Buffer.from(R4Serialized[0]).toString(),
      description: Buffer.from(R4Serialized[1]).toString(),
      pictures: pictures,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
