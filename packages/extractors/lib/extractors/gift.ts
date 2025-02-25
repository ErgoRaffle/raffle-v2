import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  BlockInfo,
  Transaction,
  SpendInfo,
  CallbackType,
  InputExtension,
} from '@rosen-bridge/abstract-extractor';

import { GiftAction } from '../actions/gift';
import { GiftBoxInterface } from '../interfaces/types';
import { Gift } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SByte, SColl, SConstant, serializeBox } from '@fleet-sdk/serializer';
import JsonBigInt from '@rosen-bridge/json-bigint';

export class GiftExtractor extends AbstractInitializableErgoExtractor<
  GiftBoxInterface,
  Gift
> {
  readonly actions: GiftAction;
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
    this.actions = new GiftAction(dataSource, this.logger);
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
   * process a list of transactions in a block and store required information
   * @param txs list of transactions in the block
   * @param block
   * @return true if the process is completed successfully and false otherwise
   */
  override processTransactions = async (
    txs: Transaction[],
    block: BlockInfo,
  ) => {
    try {
      const boxes: Array<GiftBoxInterface> = [];
      const spentInfos: Array<SpendInfo> = [];
      for (const tx of txs) {
        for (const output of tx.outputs) {
          if (!this.hasData(output)) {
            continue;
          }
          this.logger.debug(`Trying to extract data from box ${output.boxId}`);
          const extractedData = this.extractBoxData(
            output,
            undefined,
            tx.outputs![0].assets![0].tokenId,
          );
          if (extractedData) {
            this.logger.debug(
              `Extracted data ${JsonBigInt.stringify(extractedData)} from box ${
                output.boxId
              }`,
            );
            boxes.push(extractedData);
          }
        }
        let boxIndex = 1;
        for (const input of tx.inputs) {
          spentInfos.push({ txId: tx.id, boxId: input.boxId, index: boxIndex });
          boxIndex += 1;
        }
      }

      if (boxes.length > 0) {
        if (!(await this.actions.storeBoxes(boxes, block, this.getId()))) {
          this.logger.warn(
            `Data insertion failed for ${this.getId()} at the block ${
              block.height
            }`,
          );
          return false;
        }
        this.triggerCallbacks(CallbackType.Insert, boxes);
      }
      const spentData = await this.actions.spendBoxes(
        spentInfos,
        block,
        this.getId(),
      );
      if (spentData.length > 0) {
        this.triggerCallbacks(CallbackType.Spend, spentData);
      }
    } catch (e) {
      this.logger.error(
        `Processing transactions failed for ${this.getId()} at the block ${
          block.height
        } with error: ${e}`,
      );
      return false;
    }
    return true;
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @param raffleId
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions?: InputExtension[],
    raffleId?: string,
  ): GiftBoxInterface | undefined => {
    const donatorErgoTree = SColl(
      SByte,
      Array.from(
        SConstant.from(box.additionalRegisters!.R4!).data as Uint8Array,
      ),
    ).toHex();
    const index = SConstant.from(box.additionalRegisters!.R5!).data as number;

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: raffleId || '',
      donatorErgoTree: donatorErgoTree,
      winnerIndex: index,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
