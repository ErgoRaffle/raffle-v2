import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
  InputExtension,
} from '@rosen-bridge/abstract-extractor';

import { InactiveRaffleAction } from '../actions/inactiveRaffle';
import { InactiveRaffleBoxInterface } from '../interfaces/types';
import { InactiveRaffle } from '../entities';
import { Box, ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class InactiveRaffleExtractor extends AbstractInitializableErgoExtractor<
  InactiveRaffleBoxInterface,
  InactiveRaffle
> {
  readonly actions: InactiveRaffleAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly licenseTokenId: string;
  private readonly serviceErgoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    serviceErgoTree: string,
    licenseTokenId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize, true);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new InactiveRaffleAction(dataSource, this.logger);
    this.serviceErgoTree = serviceErgoTree;
    this.licenseTokenId = licenseTokenId;
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
      (box.assets!.length == 1 || box.assets!.length == 2) &&
      boxHasToken(box, [this.licenseTokenId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @param inputExtensions
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions?: InputExtension[],
  ): InactiveRaffleBoxInterface | undefined => {
    const R4Serialized = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];

    const R7Serialized = SConstant.from(box.additionalRegisters!.R7!)
      .data as Uint8Array[];

    if (Object.keys(inputExtensions![0]).length != 2) {
      this.logger.error(
        'Invalid create raffle transaction: the service box context-vars length is not valid.',
      );
      return;
    }

    const winnersPercentList = (
      SConstant.from(inputExtensions![0]['0']).data as bigint[]
    ).toString();
    const implementorErgoTree = Buffer.from(
      (SConstant.from(inputExtensions![0]['1']).data as Uint8Array[])[0],
    ).toString('hex');
    const creatorErgoTree = Buffer.from(
      (SConstant.from(inputExtensions![0]['1']).data as Uint8Array[])[1],
    ).toString('hex');

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: Buffer.from(R7Serialized[1]).toString('hex'),
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      serviceErgoTree: this.serviceErgoTree,
      implementorErgoTree: implementorErgoTree,
      creatorErgoTree: creatorErgoTree,
      winnersPercent: Number(R4Serialized[0]),
      serviceFeePercent: Number(R4Serialized[1]),
      implementerFeePercent: Number(R4Serialized[2]),
      ticketPrice: R4Serialized[3],
      goal: R4Serialized[4],
      deadline: Number(R4Serialized[5]),
      winnersPercentList: winnersPercentList,
      txFee: R4Serialized[6],
    };

    return data;
  };
}
