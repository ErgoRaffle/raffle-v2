import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import RateLimitedAxios, { Axios } from '@rosen-clients/rate-limited-axios';

import type { TxOutputRune } from './types';
import type {
  UnisatResponse,
  UnisatRuneTransfer,
  UnisatTxRunes,
} from './types';

/**
 * Runes protocol network implementation using Unisat indexer API.
 * Fetches rune transfer data per transaction for matching against the dynamic extractor watch list.
 */
export class UnisatRunesProtocolNetwork {
  private readonly unisatClient: Axios;
  protected readonly PAGE_SIZE = 500;

  /**
   * @param unisatUrl - Unisat API base URL
   * @param unisatApiKey - Unisat API key (optional)
   * @param logger - Logger instance (optional)
   */
  constructor(
    protected readonly unisatUrl: string,
    protected readonly unisatApiKey?: string,
    protected readonly logger: AbstractLogger = new DummyLogger(),
  ) {
    const unisatHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (unisatApiKey) {
      unisatHeaders['Authorization'] = `Bearer ${unisatApiKey}`;
    }

    this.unisatClient = RateLimitedAxios.create({
      baseURL: unisatUrl,
      headers: unisatHeaders,
    });
  }

  /**
   * Returns the Runes transfers of a transaction (receive-type only).
   * @param txId - Bitcoin transaction id
   * @param blockHeight - Block height (used to verify Unisat sync)
   * @returns List of rune outputs (address, runeId, amount, voutIndex) for receive-type transfers
   */
  getTxOutputRunes = async (
    txId: string,
    blockHeight: number,
  ): Promise<TxOutputRune[]> => {
    const runes: TxOutputRune[] = [];

    let txRunes: UnisatTxRunes;
    try {
      let offset = 0;
      let response = await this.unisatClient.get<UnisatResponse<UnisatTxRunes>>(
        `/v1/indexer/runes/event?txid=${txId}&start=${offset}&limit=${this.PAGE_SIZE}`,
      );
      this.logger.debug(
        `requested 'indexer/runes/event' filtering txId [${txId}] on offset|limit [${offset}|${this.PAGE_SIZE}]. Response: ${JsonBigInt.stringify(
          response.data,
        )}`,
      );
      const total = response.data.data.total;
      txRunes = { total, height: blockHeight, detail: [] };
      while (true) {
        const runes = response.data.data;
        if (blockHeight > runes.height) {
          throw new Error(
            `UnisatRunesProtocolNetwork is not synced. processing block height is [${blockHeight}] and synced height of network is [${runes.height}]`,
          );
        }
        if (runes.detail.length === 0) break;
        txRunes.detail.push(...response.data.data.detail);
        offset += this.PAGE_SIZE;
        if (offset > total) break;
        response = await this.unisatClient.get<UnisatResponse<UnisatTxRunes>>(
          `/v1/indexer/runes/event?txid=${txId}&start=${offset}&limit=${this.PAGE_SIZE}`,
        );
        this.logger.debug(
          `requested 'indexer/runes/event' filtering txId [${txId}] on offset|limit [${offset}|${this.PAGE_SIZE}]. Response: ${JsonBigInt.stringify(
            response.data,
          )}`,
        );
      }
      if (txRunes.detail.length !== txRunes.total) {
        throw new Error(
          `Unexpected pagination: expected [${txRunes.total}] runes but got [${txRunes.detail.length}]`,
        );
      }
    } catch (e: unknown) {
      const baseError = `Failed to get runes event for tx [${txId}] from Unisat: `;
      if (e && typeof e === 'object' && 'response' in e) {
        const err = e as { response?: { data?: unknown } };
        throw new Error(
          baseError + `${JsonBigInt.stringify(err.response?.data ?? {})}`,
        );
      }
      throw new Error(baseError + (e instanceof Error ? e.message : String(e)));
    }

    for (const transfer of txRunes.detail as UnisatRuneTransfer[]) {
      if (transfer.txid !== txId) {
        throw new Error(
          `ImpossibleBehavior: Fetched runes event for tx [${txId}] but got a transfer with txId [${transfer.txid}]`,
        );
      }
      if (transfer.type === 'send') continue;
      runes.push({
        address: transfer.address,
        runeId: transfer.runeId,
        runeAmount: transfer.amount,
        voutIndex: transfer.vout,
      });
    }

    return runes;
  };
}
