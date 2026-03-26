import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, InputExtension } from '@rosen-bridge/scanner-interfaces';

import { CreationProxyAction } from '../actions/creationProxy';
import { CreationProxyEntity } from '../entities';
import {
  CreationProxyBoxInterface,
  ExtractorInitOptions,
} from '../interfaces/types';

export class CreationProxyExtractor extends AbstractErgoBoxExtractor<
  CreationProxyBoxInterface,
  CreationProxyEntity
> {
  readonly actions: CreationProxyAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly address: string;

  constructor(
    dataSource: DataSource,
    id: string,
    initializeOptions: ExtractorInitOptions,
    logger?: AbstractLogger,
  ) {
    super({ active: true, ...initializeOptions }, logger);
    this.id = id;
    this.address = initializeOptions.address;
    this.ergoTree = ErgoAddress.fromBase58(this.address).ergoTree.toString();
    this.actions = new CreationProxyAction(dataSource, logger);
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
        (SConstant.from(box.additionalRegisters.R4).data as bigint[]).length ==
          6 &&
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as Uint8Array[])
          .length == 4 &&
        box.additionalRegisters.R6 != undefined &&
        (SConstant.from(box.additionalRegisters.R6).data as Uint8Array[])
          .length >= 2 &&
        box.additionalRegisters.R7 != undefined &&
        (SConstant.from(box.additionalRegisters.R7).data as number[]).length ==
          2
      );
    } catch (err) {
      this.logger.error(`CreationProxyExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions: InputExtension[],
  ): CreationProxyBoxInterface | undefined => {
    const r4Register = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const r5Register = SConstant.from(box.additionalRegisters!.R5!)
      .data as Uint8Array[];
    const r6Register = SConstant.from(box.additionalRegisters!.R6!)
      .data as Uint8Array[];
    const r7Register = SConstant.from(box.additionalRegisters!.R7!)
      .data as number[];

    const pictures = r6Register
      .slice(2)
      .map((pic) => Buffer.from(pic).toString());
    let implementorErgoTree = '';
    let creatorErgoTree = '';
    let winnersPercentList = '';
    try {
      winnersPercentList = (
        SConstant.from(inputExtensions[0]['0']).data as bigint[]
      ).toString();
      const ergoTrees = SConstant.from(inputExtensions[0]['1'])
        .data as Uint8Array[];
      implementorErgoTree = Buffer.from(ergoTrees[0]).toString('hex');
      creatorErgoTree = Buffer.from(ergoTrees[1]).toString('hex');
    } catch (err) {
      this.logger.warn(
        `CreationProxyExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
      );
      return undefined;
    }

    return {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      address: this.address,
      expirationHeight: Number(r4Register[0]),
      raffleDeadline: Number(r4Register[1]),
      winnersPercent: Number(r4Register[2]),
      ticketPrice: r4Register[3],
      goal: r4Register[4],
      txFee: r4Register[5],
      implementorErgoTree: implementorErgoTree,
      creatorErgoTree: creatorErgoTree,
      winnersPercentList: winnersPercentList,
      collectingTokenId: Buffer.from(r5Register[3]).toString('hex'),
      name: Buffer.from(r6Register[0]).toString(),
      description: Buffer.from(r6Register[1]).toString(),
      pictures: JSON.stringify(pictures),
      winnerCount: r7Register[0],
      isErgGoal: r7Register[1] === 1,
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };
  };
}
