import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import {
  AbstractInitializableErgoExtractor,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { ServiceAction } from '../actions/serviceAction';
import { ServiceEntity } from '../entities';
import { ServiceBoxInterface } from '../interfaces/types';

export class ServiceExtractor extends AbstractInitializableErgoExtractor<
  ServiceBoxInterface,
  ServiceEntity
> {
  readonly actions: ServiceAction;
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
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.serviceNFTId = serviceNFTId;
    this.actions = new ServiceAction(dataSource, logger);
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
        boxHasToken(box, [this.serviceNFTId]) &&
        box.additionalRegisters != undefined &&
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters!.R4!).data as bigint[])
          .length == 4
      );
    } catch (err) {
      this.logger.error(`RaffleServiceExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): ServiceBoxInterface | undefined => {
    const R4Serialized = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      serviceFeePercent: Number(R4Serialized[0]),
      implementerFeePercent: Number(R4Serialized[1]),
      creationFee: R4Serialized[2],
    };

    return data;
  };
}
