import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import {
  AvlTree$,
  BlockchainParameters,
  BlockchainStateContext,
  GroupElement$,
  Header,
} from 'sigmastate-js/main';

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
   * Returns the node's last full block height.
   *
   * @returns Current chain height as reported by the node.
   */
  getHeight = async (): Promise<number> => {
    const nodeInfo = await this.client.getNodeInfo();
    this.logger.debug(
      `requested 'getNodeInfo' for height. fullHeight: ${nodeInfo.fullHeight}`,
    );
    return Number(nodeInfo.fullHeight);
  };

  /**
   * Returns consensus parameters from the node (used when building provers and signing).
   *
   * @returns Blockchain parameters object for the active network.
   */
  getBlockchainParameters = async (): Promise<BlockchainParameters> => {
    const nodeInfo = await this.client.getNodeInfo();
    return {
      ...nodeInfo.parameters,
      softForkStartingHeight: undefined,
      softForkVotesCollected: undefined,
    } as BlockchainParameters;
  };

  /**
   * Builds signing context from the last ten block headers (sigma pre-header and last headers).
   *
   * @returns State context passed to the transaction prover.
   */
  getStateContext = async (): Promise<BlockchainStateContext> => {
    const lastBlocks = await this.client.getLastHeaders(10);
    lastBlocks.reverse();

    const headers: Header[] = lastBlocks.map((h) => ({
      ...h,
      ADProofsRoot: h.adProofsRoot,
      // @ts-expect-error AvlTree$.fromDigest is present at runtime
      stateRoot: AvlTree$.fromDigest(h.stateRoot),
      timestamp: BigInt(h.timestamp),
      nBits: BigInt(h.nBits),
      extensionRoot: h.extensionHash,
      minerPk: GroupElement$.fromPointHex(h.powSolutions.pk),
      powOnetimePk: GroupElement$.fromPointHex(h.powSolutions.w),
      powNonce: h.powSolutions.n,
      powDistance: BigInt(h.powSolutions.d),
    }));

    return {
      sigmaLastHeaders: headers.slice(1),
      previousStateDigest: headers[1].stateRoot.digest,
      sigmaPreHeader: headers[0],
    };
  };

  /**
   * Fetches unspent boxes of an address while considering current mempool state
   * Boxes spent in mempool are excluded
   * @param address
   * @param limit
   * @param offset
   * @returns Fleet `ErgoBox` instances for this page.
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
   * Iterates over unspent boxes of an address in pages of API_LIMIT (100)
   * @param address
   * @returns Each unspent box from successive node pages until exhausted.
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
