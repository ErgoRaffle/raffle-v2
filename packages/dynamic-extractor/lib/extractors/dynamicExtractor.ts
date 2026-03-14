import { AbstractExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { validateAddress } from '@rosen-bridge/address-codec';
import {
  BitcoinRpcTransaction,
  BitcoinRpcTxOutput,
} from '@rosen-bridge/bitcoin-scanner';
import { DataSource, SelectQueryBuilder } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import * as bitcoin from 'bitcoinjs-lib';

import { DynamicBoxAction } from '../actions/dynamicBoxAction';
import { DynamicBoxEntity } from '../entities';
import { DynamicBoxInterface } from '../interfaces/types';
import { UnisatRunesProtocolNetwork } from '../network/unisatRunesProtocolNetwork';
import { getAddressFromScriptPubKey } from '../utils';

/** Token id for native Bitcoin UTXO value */
export const BTC_TOKEN_ID = 'btc';

export class DynamicExtractor extends AbstractExtractor<
  BitcoinRpcTransaction,
  DynamicBoxEntity
> {
  readonly actions: DynamicBoxAction;
  /** Watch list: address -> tokenId (rune id) to watch for on that address */
  private addressWatchList: Map<string, string> = new Map();
  private readonly runesNetwork: UnisatRunesProtocolNetwork;

  /**
   * @param dataSource - TypeORM data source for persistence
   * @param id - Extractor id
   * @param unisatUrl - Unisat API base URL for runes data
   * @param unisatApiKey - Unisat API key (optional)
   * @param logger - Logger instance
   */
  constructor(
    dataSource: DataSource,
    private readonly id: string,
    private readonly network: bitcoin.Network,
    unisatUrl: string,
    unisatApiKey?: string,
    private readonly logger: AbstractLogger = new DummyLogger(),
  ) {
    super();
    this.actions = new DynamicBoxAction(dataSource, logger);
    this.runesNetwork = new UnisatRunesProtocolNetwork(
      unisatUrl,
      unisatApiKey,
      logger,
    );
  }

  /**
   * get Id for current extractor
   * @returns Extractor id
   */
  getId = () => `${this.id}`;

  /**
   * True if at least one tx output decodes to an address in the watch list.
   * Used to skip transactions that cannot match any watched address.
   * @param tx - Bitcoin RPC transaction
   * @returns true if any vout scriptPubKey decodes to a watched address
   */
  private hasWatchedOutput = (tx: BitcoinRpcTransaction): boolean => {
    const vout: BitcoinRpcTxOutput[] = tx.vout ?? [];
    for (const output of vout) {
      const address = getAddressFromScriptPubKey(
        output.scriptPubKey.hex,
        this.network,
      );
      if (address != null && this.addressWatchList.has(address)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Process a list of Bitcoin transactions in a block and store outputs for watched addresses.
   * Skips transactions that cannot match any watched address.
   * When tokenId is 'btc' uses UTXO total value (sats); otherwise uses runes network for token amount.
   * @param txs - List of Bitcoin transactions in the block
   * @param block - Block info (hash, height)
   * @returns true if processing completed successfully
   */
  processTransactions = async (
    txs: BitcoinRpcTransaction[],
    block: BlockInfo,
  ): Promise<boolean> => {
    const boxesToInsert: DynamicBoxInterface[] = [];

    for (const tx of txs) {
      if (!this.hasWatchedOutput(tx)) {
        this.logger.trace(`tx ${tx.txid} does not match any watched address`);
        continue;
      }
      // BTC: watched addresses with tokenId 'btc' — use UTXO value directly from vout
      const vout: BitcoinRpcTxOutput[] = tx.vout ?? [];
      for (const output of vout) {
        const address = getAddressFromScriptPubKey(
          output.scriptPubKey.hex,
          this.network,
        );
        if (!address) {
          this.logger.debug(
            `address can not be derived from scriptPubKey for tx ${tx.txid}, output scriptPubKey hex: ${output.scriptPubKey.hex}`,
          );
          continue;
        }
        const watchedTokenId = this.addressWatchList.get(address);
        if (watchedTokenId === BTC_TOKEN_ID) {
          const value = output.value ?? 0;
          const voutIndex = output.n;
          boxesToInsert.push({
            identifier: `${tx.txid}:${voutIndex}`,
            txId: tx.txid,
            address,
            serialized: '',
            tokenId: BTC_TOKEN_ID,
            amount: value.toString(),
          });
        }
      }

      // Runes: tokenId !== 'btc' — fetch runes and match by address + runeId
      try {
        const runes = await this.runesNetwork.getTxOutputRunes(
          tx.txid,
          block.height,
        );
        for (const rune of runes) {
          const watchedTokenId = this.addressWatchList.get(rune.address);
          if (watchedTokenId == null || watchedTokenId === BTC_TOKEN_ID)
            continue;
          if (watchedTokenId !== rune.runeId) {
            this.logger.debug(
              `rune ${rune.runeId} does not match watched tokenId ${watchedTokenId}`,
            );
            continue;
          }
          boxesToInsert.push({
            identifier: `${tx.txid}:${rune.voutIndex}`,
            txId: tx.txid,
            address: rune.address,
            serialized: '',
            tokenId: rune.runeId,
            amount: rune.runeAmount,
          });
        }
      } catch (err) {
        this.logger.debug(`getTxOutputRunes failed for tx ${tx.txid}: ${err}`);
      }
    }

    if (boxesToInsert.length === 0) {
      return true;
    }
    return this.actions.storeEntities(boxesToInsert, block, this.id);
  };

  /**
   * Fork one block and remove all stored information for this block.
   * @param hash - Block hash to fork (remove)
   */
  forkBlock = async (hash: string): Promise<void> => {
    await this.actions.deleteBlockData(hash, this.id);
  };

  /**
   * Add a (address, tokenId) pair to the watch list.
   * @param address - Bitcoin address (legacy, P2SH, or bech32)
   * @param tokenId - 'btc' to watch native UTXO value, or rune id for runes token
   */
  addNewAddress = (address: string, tokenId: string) => {
    try {
      if (!validateAddress('bitcoin', address)) {
        throw new Error(
          `Invalid Bitcoin address ${address}, address will be ignored`,
        );
      }
      if (this.addressWatchList.has(address)) {
        this.logger.warn(
          `Address ${address} already in the watch list (tokenId: ${this.addressWatchList.get(address)}), overwriting with ${tokenId}`,
        );
      }
      this.addressWatchList.set(address, tokenId);
      this.logger.info(
        `Added address ${address} with tokenId ${tokenId} to the watch list`,
      );
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
