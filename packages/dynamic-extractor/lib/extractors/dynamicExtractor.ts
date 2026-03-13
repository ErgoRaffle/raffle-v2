import { AbstractExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { validateAddress } from '@rosen-bridge/address-codec';
import {
  BitcoinEsploraTransaction,
  EsploraTxOutput,
} from '@rosen-bridge/bitcoin-scanner';
import { DataSource, SelectQueryBuilder } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { DynamicBoxAction } from '../actions/dynamicBoxAction';
import { DynamicBoxEntity } from '../entities';
import { DynamicBoxInterface } from '../interfaces/types';

export class DynamicExtractor extends AbstractExtractor<
  BitcoinEsploraTransaction,
  DynamicBoxEntity
> {
  readonly actions: DynamicBoxAction;
  private addressWatchList: Set<string> = new Set();

  constructor(
    dataSource: DataSource,
    private readonly id: string,
    private readonly logger: AbstractLogger = new DummyLogger(),
  ) {
    super();
    this.actions = new DynamicBoxAction(dataSource, logger);
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * Check if a Bitcoin output is for a watched address.
   * @param output - Bitcoin tx output with scriptpubkey_address
   * @return true if the output address is in the watch list
   */
  hasData = (output: EsploraTxOutput): boolean => {
    return (
      Boolean(output.scriptpubkey_address) &&
      this.addressWatchList.has(output.scriptpubkey_address)
    );
  };

  /**
   * Extract Bitcoin output to DynamicBoxInterface.
   * @param tx - Bitcoin transaction
   * @param voutIndex - output index
   * @param output - tx output
   * @return extracted data in proper format
   */
  extractBoxData = (
    tx: BitcoinEsploraTransaction,
    voutIndex: number,
    output: EsploraTxOutput,
  ): DynamicBoxInterface => {
    const identifier = `${tx.txid}:${voutIndex}`;
    return {
      identifier,
      txId: tx.txid,
      address: output.scriptpubkey_address ?? '',
      serialized: '',
    };
  };

  /**
   * Process a list of Bitcoin transactions in a block and store outputs for watched addresses.
   * @param txs - list of transactions in the block
   * @param block - block info
   * @return true if the process is completed successfully
   */
  processTransactions = async (
    txs: BitcoinEsploraTransaction[],
    block: BlockInfo,
  ): Promise<boolean> => {
    const boxesToInsert: DynamicBoxInterface[] = [];
    for (const tx of txs) {
      for (let i = 0; i < tx.vout.length; i++) {
        const output = tx.vout[i];
        if (this.hasData(output)) {
          boxesToInsert.push(this.extractBoxData(tx, i, output));
        }
      }
    }
    if (boxesToInsert.length === 0) {
      return true;
    }
    return this.actions.storeEntities(boxesToInsert, block, this.id);
  };

  /**
   * Fork one block and remove all stored information for this block.
   * @param hash - block hash
   */
  forkBlock = async (hash: string): Promise<void> => {
    await this.actions.deleteBlockData(hash, this.id);
  };

  /**
   * Add a Bitcoin address to the watch list.
   * @param address - Bitcoin address (legacy, P2SH, or bech32)
   */
  addNewAddress = (address: string) => {
    try {
      if (!validateAddress('bitcoin', address)) {
        throw new Error(
          `Invalid Bitcoin address ${address}, address will be ignored`,
        );
      }
      if (this.addressWatchList.has(address)) {
        this.logger.warn(`Address ${address} already in the watch list`);
        return;
      }
      this.addressWatchList.add(address);
      this.logger.info(`Added address ${address} to the watch list`);
    } catch (error) {
      throw new Error(
        `Error adding address ${address} to the watch list: ${error}`,
      );
    }
  };

  /**
   * Remove a Bitcoin address from the watch list.
   * @param address - Bitcoin address to remove
   */
  removeAddress = (address: string) => {
    try {
      if (!validateAddress('bitcoin', address)) {
        throw new Error(
          `Invalid Bitcoin address ${address}, address will be ignored`,
        );
      }
      this.addressWatchList.delete(address);
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
  initializeData = async () => {
    this.logger.info(
      `Initializing boxes for extractor ${this.id} is not enabled`,
    );
    return;
  };

  /**
   * Builds a query that returns used blocks by selecting the `block` column from the `ExtractorEntity` repository,
   * filtered by the provided `extractorId`
   *
   * @returns A query builder selecting used blocks
   */
  createUsedBlocksQuery = (): SelectQueryBuilder<DynamicBoxEntity> =>
    this.actions.createUsedBlocksQuery(this.getId());
}
