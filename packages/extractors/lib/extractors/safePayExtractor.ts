import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import {
  AbstractInitializableErgoExtractor,
  TxExtra,
} from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  Transaction,
  OutputBox,
  ErgoNetworkType,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';

import { SafePayAction } from '../actions/safePayAction';
import { SafePayEntity } from '../entities';
import { SafePayBoxInterface } from '../interfaces/types';

export class SafePayExtractor extends AbstractInitializableErgoExtractor<
  SafePayBoxInterface,
  SafePayEntity
> {
  readonly actions: SafePayAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly successRaffleErgoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    successAddress: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new SafePayAction(dataSource, this.logger);

    this.successRaffleErgoTree =
      ErgoAddress.fromBase58(successAddress).ergoTree.toString();
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * extract transaction raffle-id and tx-type extra information
   * @param tx
   * @returns raffle-id and tx-type
   */
  getTransactionExtraData = (tx: Transaction) => {
    return {
      firstOutputErgoTree: tx.outputs[0].ergoTree,
    };
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
    inputExtensions: InputExtension[],
    txExtra?: TxExtra,
  ): SafePayBoxInterface | undefined => {
    let recipient = '';
    try {
      if (txExtra!.firstOutputErgoTree == this.successRaffleErgoTree) {
        const recipients =
          /**
           * In fee-payment transaction, recipient addresses (service and
           * implementer addresses) are available at active raffle extension.
           * Active raffle is the first input of this transaction,
           */
          (SConstant.from(inputExtensions[0]['0']).data as Uint8Array[]).map(
            (ergoTree) => Buffer.from(ergoTree).toString('hex'),
          );
        recipient = box.index == 1 ? recipients[0] : recipients[1];
      } else if (box.index == 0) {
        recipient = Buffer.from(
          /**
           * In final-prize transaction the safe pay is the only output and the
           * recipient address exists in first input (winner prize) extension
           */
          SConstant.from(inputExtensions[0]['0']).data as Uint8Array,
        ).toString('hex');
      } else {
        recipient = Buffer.from(
          /**
           * In license-redeem, gift-unwrap, gift-return and ticket-redeem
           * transactions the second input contains the recipient address
           */
          SConstant.from(inputExtensions[1]['0']).data as Uint8Array,
        ).toString('hex');
      }
    } catch (e) {
      this.logger.warn(
        `Failed to extract recipient address from safe pay [${box.boxId}], error: [${e}]`,
      );
    }
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      recipient,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
