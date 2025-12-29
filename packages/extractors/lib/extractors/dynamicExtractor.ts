import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { DynamicBoxAction } from '../actions/dynamicBoxAction';
import { DynamicBoxEntity } from '../entities';
import { DynamicBoxInterface } from '../interfaces/types';

export class DynamicExtractor extends AbstractErgoExtractor<
  DynamicBoxInterface,
  DynamicBoxEntity
> {
  readonly actions: DynamicBoxAction;
  private ergoTreeWatchList: Set<string> = new Set();

  constructor(
    dataSource: DataSource,
    private readonly id: string,
    logger?: AbstractLogger,
    private networkType: Network = Network.Mainnet,
  ) {
    super(logger);
    this.actions = new DynamicBoxAction(dataSource, this.logger);
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * check proper data format in the box
   * @param box
   * @return true if the box ergoTree in the watch list
   */
  hasData = (box: OutputBox): boolean => {
    return this.ergoTreeWatchList.has(box.ergoTree);
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): DynamicBoxInterface | undefined => {
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      address: ErgoAddress.fromErgoTree(
        box.ergoTree,
        this.networkType,
      ).toString(this.networkType),
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };

  /**
   * add new address to the watch list
   * @param address
   */
  addNewAddress = (address: string) => {
    try {
      const ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
      if (
        ErgoAddress.fromErgoTree(ergoTree, this.networkType).toString() !==
        address
      ) {
        throw new Error(
          `Invalid address ${address} for network ${this.networkType}, address will be ignored`,
        );
      }
      if (this.ergoTreeWatchList.has(ergoTree)) {
        this.logger.warn(`Address ${address} already in the watch list`);
        return;
      }
      this.ergoTreeWatchList.add(ergoTree);
      this.logger.info(`Added address ${address} to the watch list`);
    } catch (error) {
      throw new Error(
        `Error adding address ${address} to the watch list: ${error}`,
      );
    }
  };

  /**
   * remove address from the watch list
   * @param address
   */
  removeAddress = (address: string) => {
    try {
      const ergoTreeToRemove =
        ErgoAddress.fromBase58(address).ergoTree.toString();
      if (
        ErgoAddress.fromErgoTree(
          ergoTreeToRemove,
          this.networkType,
        ).toString() !== address
      ) {
        throw new Error(
          `Invalid address ${address} for network ${this.networkType}, address will be ignored`,
        );
      }
      this.ergoTreeWatchList.delete(ergoTreeToRemove);
      this.logger.info(`Removed address ${address} from the watch list`);
    } catch (error) {
      throw new Error(
        `Error removing address ${address} from the watch list: ${error}`,
      );
    }
  };

  /**
   * dynamic box extractor does not need to initialize boxes
   */
  initializeBoxes = async () => {
    this.logger.info(
      `Initializing boxes for extractor ${this.id} is not enabled`,
    );
    return;
  };
}
