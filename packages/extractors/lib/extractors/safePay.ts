import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  BlockInfo,
  SpendInfo,
  CallbackType,
  InputExtension,
} from '@rosen-bridge/abstract-extractor';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

import { SafePayEntity } from '../entities';
import { SafePayAction } from '../actions/safePay';
import { SafePayBoxInterface } from '../interfaces/types';
import { Transaction } from '@rosen-bridge/scanner';
import JsonBigInt from '@rosen-bridge/json-bigint';

export class SafePayExtractor extends AbstractInitializableErgoExtractor<
  SafePayBoxInterface,
  SafePayEntity
> {
  readonly actions: SafePayAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly serviceErgoTree: string;
  private readonly successRaffleErgoTree: string;
  private readonly winnerPrizeErgoTree: string;
  private readonly winnerErgoTree: string;
  private readonly ticketRedeemErgoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    serviceAddress: string,
    successRaffleAddress: string,
    winnerPrizeAddress: string,
    winnerAddress: string,
    ticketRedeemAddress: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new SafePayAction(dataSource, this.logger);

    this.serviceErgoTree =
      ErgoAddress.fromBase58(serviceAddress).ergoTree.toString();
    this.successRaffleErgoTree =
      ErgoAddress.fromBase58(successRaffleAddress).ergoTree.toString();
    this.winnerPrizeErgoTree =
      ErgoAddress.fromBase58(winnerPrizeAddress).ergoTree.toString();
    this.winnerErgoTree =
      ErgoAddress.fromBase58(winnerAddress).ergoTree.toString();
    this.ticketRedeemErgoTree =
      ErgoAddress.fromBase58(ticketRedeemAddress).ergoTree.toString();
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

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
      const boxes: Array<SafePayBoxInterface> = [];
      const spentInfos: Array<SpendInfo> = [];
      for (const tx of txs) {
        for (const output of tx.outputs) {
          if (!this.hasData(output)) {
            continue;
          }
          this.logger.debug(`Trying to extract data from box ${output.boxId}`);
          let txType: string = 'unknown';
          let raffleId: string = 'unknown';
          if (tx.outputs[0].ergoTree == this.serviceErgoTree) {
            txType = 'LicenseRedeem';
          } else if (tx.outputs[0].ergoTree == this.successRaffleErgoTree) {
            txType = 'Success';
            try {
              raffleId = tx.outputs[0].assets![1].tokenId;
            } catch (err) {
              this.logger.error(`SafePayExtractor Error: ${err}`);
            }
          } else if (tx.outputs[0].ergoTree == this.winnerPrizeErgoTree) {
            txType = 'GiftUnwrap';
            try {
              raffleId = tx.outputs[0].assets![0].tokenId;
            } catch (err) {
              this.logger.error(`SafePayExtractor Error: ${err}`);
            }
          } else if (tx.outputs[0].ergoTree == this.winnerErgoTree) {
            txType = 'GiftReturn';
            try {
              raffleId = tx.outputs[0].assets![0].tokenId;
            } catch (err) {
              this.logger.error(`SafePayExtractor Error: ${err}`);
            }
          } else if (tx.outputs[0].ergoTree == this.ticketRedeemErgoTree) {
            txType = 'TicketRedeem';
            try {
              raffleId = tx.outputs[0].assets![0].tokenId;
            } catch (err) {
              this.logger.error(`SafePayExtractor Error: ${err}`);
            }
          } else if (tx.outputs[0].boxId == output.boxId) {
            txType = 'FinalPrize';
          }
          const extractedData = this.extractBoxData(
            output,
            undefined,
            txType,
            raffleId,
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
  extractBoxData = (
    box: OutputBox,
    inputExtensions?: InputExtension[],
    txType?: string,
    raffleId?: string,
  ): SafePayBoxInterface | undefined => {
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: raffleId || 'unknown',
      txType: txType || 'unknown',
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
