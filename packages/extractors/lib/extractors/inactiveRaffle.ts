import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { InactiveRaffleAction } from '../actions/inactiveRaffle';
import { InactiveRaffleBoxInterface } from '../interfaces/types';
import { InactiveRaffle } from '../entities';
import { Box, ErgoAddress, Network } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class InactiveRaffleExtractor extends AbstractInitializableErgoExtractor<
  InactiveRaffleBoxInterface,
  InactiveRaffle
> {
  readonly actions: InactiveRaffleAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly licenseTokenId: string;
  private readonly serviceErgoTree: string;
  private readonly implementorErgoTree: string;
  private readonly creatorErgoTree: string;
  private readonly winnersPercentList: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: Network,
    url: string,
    type: ErgoNetworkType,
    address: string,
    licenseTokenId: string,
    serviceErgoTree: string,
    implementorErgoTree: string,
    creatorErgoTree: string,
    winnersPercentList: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.licenseTokenId = licenseTokenId;
    this.networkType = networkType;
    this.ergoTree = address
      ? ErgoAddress.fromBase58(address).ergoTree.toString()
      : undefined;
    this.actions = new InactiveRaffleAction(dataSource, this.logger);
    this.serviceErgoTree = serviceErgoTree;
    this.implementorErgoTree = implementorErgoTree;
    this.creatorErgoTree = creatorErgoTree;
    this.winnersPercentList = winnersPercentList;
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
      box.assets?.at(0)?.tokenId == this.licenseTokenId &&
      (box.assets!.length == 1 || box.assets!.length == 2)
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): InactiveRaffleBoxInterface | undefined => {
    const ergoBox = box as Box;
    const R4Serialized = SConstant.from(ergoBox.additionalRegisters.R4!)
      .data as bigint[];

    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: box.transactionId,
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
      serviceErgoTree: this.serviceErgoTree,
      implementorErgoTree: this.implementorErgoTree,
      creatorErgoTree: this.creatorErgoTree,
      winnersPercent: Number(R4Serialized[0]),
      serviceFeePercent: Number(R4Serialized[1]),
      implementerFeePercent: Number(R4Serialized[2]),
      ticketPrice: R4Serialized[3],
      goal: R4Serialized[4],
      deadline: Number(R4Serialized[5]),
      winnersPercentList: this.winnersPercentList,
      txFee: R4Serialized[6],
    };

    return data;
  };
}
