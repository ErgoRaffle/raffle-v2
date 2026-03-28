import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';

import { API_LIMIT } from '../constants';

export class ErgoNodeNetwork {
  private client: ReturnType<typeof ergoNodeClientFactory>;

  constructor(
    nodeUrl: string,
    private readonly logger: AbstractLogger = new DummyLogger(),
  ) {
    this.client = ergoNodeClientFactory(nodeUrl);
  }

  /**
   * get unspent boxes of an address while considering current mempool state
   * mempool outputs are returned first and any box spent in mempool is excluded
   * @param address
   * @param limit
   * @param offset
   */
  getUnspentBoxesByAddress = async (
    address: string,
    limit: number,
    offset: number,
  ): Promise<ErgoBox[]> => {
    const boxes = await this.client.getBoxesByAddressUnspent(address, {
      limit,
      offset,
      includeUnconfirmed: true,
      excludeMempoolSpent: true,
      sortDirection: 'desc',
    });

    this.logger.debug(
      `requested 'getBoxesByAddressUnspent' for address [${address}]. returned ${boxes.length} boxes`,
    );

    return boxes.map(
      (box) =>
        new ErgoBox({
          ...box,
          assets: box.assets ?? [],
          boxId: box.boxId ?? '',
          index: box.index ?? 0,
          transactionId: box.transactionId ?? '',
        }),
    );
  };

  /**
   * iterate over unspent boxes of an address in pages of API_LIMIT (100)
   * @param address
   */
  async *unspentBoxesByAddressIterator(
    address: string,
  ): AsyncGenerator<ErgoBox> {
    let offset = 0;

    while (true) {
      const boxes = await this.getUnspentBoxesByAddress(
        address,
        API_LIMIT,
        offset,
      );

      if (boxes.length === 0) {
        return;
      }

      yield* boxes;

      if (boxes.length < API_LIMIT) {
        return;
      }

      offset += API_LIMIT;
    }
  }
}
