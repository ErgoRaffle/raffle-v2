import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { RaffleDetailsAction } from '../actions/raffleDetailsAction';
import { RaffleDetailsEntity } from '../entities';
import {
  ExtractorInitOptions,
  RaffleDetailsBoxInterface,
} from '../interfaces/types';

export class RaffleDetailsExtractor extends AbstractErgoBoxExtractor<
  RaffleDetailsBoxInterface,
  RaffleDetailsEntity
> {
  readonly actions: RaffleDetailsAction;
  private readonly id: string;
  private readonly ergoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    initializeOptions: ExtractorInitOptions,
    logger?: AbstractLogger,
  ) {
    super({ active: true, ...initializeOptions }, logger);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(
      initializeOptions.address,
    ).ergoTree.toString();
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
  hasBoxData = (box: OutputBox): boolean => {
    try {
      return (
        box.ergoTree == this.ergoTree &&
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters.R4).data as Uint8Array[])
          .length >= 3 &&
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
    const pictures = R4Serialized.slice(3).map((picInfo) =>
      Buffer.from(picInfo).toString(),
    );

    const data = {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
      name: Buffer.from(R4Serialized[0]).toString(),
      description: Buffer.from(R4Serialized[1]).toString(),
      tags: Buffer.from(R4Serialized[2]).toString(),
      pictures: JSON.stringify(pictures),
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };

    return data;
  };
}
