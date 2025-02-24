import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  boxHasToken,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { RaffleServiceAction } from '../actions/raffleService';
import { RaffleServiceBoxInterface } from '../interfaces/types';
import { RaffleService } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class RaffleServiceExtractor extends AbstractInitializableErgoExtractor<
  RaffleServiceBoxInterface,
  RaffleService
> {
  readonly actions: RaffleServiceAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly serviceNFTId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    serviceNFTId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize, true);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.serviceNFTId = serviceNFTId;
    this.actions = new RaffleServiceAction(dataSource, this.logger);
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
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.serviceNFTId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleServiceBoxInterface | undefined => {
    const ergoBox = box as Box;
    const R4Serialized = SConstant.from(ergoBox.additionalRegisters.R4!)
      .data as bigint[];
    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      serviceFeePercent: Number(R4Serialized[0]),
      implementerFeePercent: Number(R4Serialized[1]),
      creationFee: R4Serialized[2],
    };

    return data;
  };
}
