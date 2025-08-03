import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { AxiosError } from 'axios';
import { ErgoBox } from '@fleet-sdk/core';

import handleApiError from './utils';
import { FailedError } from './error';
import { TX_FETCHING_PAGE_SIZE } from '../constants';
import {
  BlockchainStateContext,
  Header,
  AvlTree$,
  GroupElement$,
  BlockchainParameters,
} from 'sigmastate-js/main';

class ErgoNodeNetwork {
  private client: ReturnType<typeof ergoNodeClientFactory>;

  constructor(
    nodeUrl: string,
    private logger: AbstractLogger = new DummyLogger(),
  ) {
    this.client = ergoNodeClientFactory(nodeUrl);
  }

  /**
   * get current block height
   */
  public getHeight = async () => {
    try {
      const nodeInfo = await this.client.getNodeInfo();
      this.logger.debug(
        `requested 'getNodeInfo'. res: ${JsonBigInt.stringify(nodeInfo)}`,
      );
      return Number(nodeInfo.fullHeight);
    } catch (error) {
      return handleApiError(error, 'Failed to get height from Ergo Node:');
    }
  };

  /**
   * get current blockchain parameters
   */
  public getBlockchainParameters = async (): Promise<BlockchainParameters> => {
    try {
      const nodeInfo = await this.client.getNodeInfo();
      this.logger.debug(
        `requested 'getNodeInfo'. res: ${JsonBigInt.stringify(nodeInfo)}`,
      );
      return {
        ...nodeInfo.parameters,
        softForkStartingHeight: undefined,
        softForkVotesCollected: undefined,
      } as BlockchainParameters;
    } catch (error) {
      return handleApiError(error, 'Failed to get node info from Ergo Node:');
    }
  };

  /**
   * get confirmations of a tx or -1 if tx is not in the blockchain
   * @param txId
   */
  public getTxConfirmation = async (txId: string) => {
    try {
      const tx = await this.client.getTxById(txId);
      this.logger.debug(
        `requested 'getTxById' for txId [${txId}]. res: ${JsonBigInt.stringify(
          tx,
        )}`,
      );
      return Number(tx.numConfirmations);
    } catch (error) {
      const baseError = 'Failed to get tx confirmations from Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error: AxiosError<{ reason: string }>) => {
          if (error.response!.status === 404) return -1;
          throw new FailedError(
            `${baseError} [${error.response!.status}] ${error.response!.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get a mempool tx in each iteration until there are no more txs in it
   */
  private async *getOneMempoolTx() {
    let currentPage = 0;

    while (true) {
      const txsPage = await this.client.getUnconfirmedTransactions({
        offset: currentPage * TX_FETCHING_PAGE_SIZE,
        limit: TX_FETCHING_PAGE_SIZE,
      });

      if (txsPage.length) {
        yield* txsPage;
        currentPage += 1;
      } else {
        return;
      }
    }
  }

  /**
   * check if a specific transaction is in the mempool
   * @param txId
   */
  public isTxInMempool = async (txId: string) => {
    try {
      const txsIterator = this.getOneMempoolTx();

      for await (const tx of txsIterator) {
        if (tx.id === txId) {
          this.logger.debug(`Found transaction [${txId}] in mempool`);
          return true;
        }
      }

      // Transaction not found in mempool
      return false;
    } catch (error) {
      return handleApiError(
        error,
        'Failed to check if transaction is in mempool from Ergo Node:',
      );
    }
  };

  /**
   * submit a transaction to the network
   * @param tx the transaction
   */
  public submitTransaction = async (tx: string) => {
    try {
      await this.client.sendTransactionAsBytes(tx);
    } catch (error) {
      return handleApiError(
        error,
        'Failed to submit transaciton to Ergo Node:',
      );
    }
  };

  /**
   * check if a box is unspent and valid (that is, exists in the blockchain)
   * @param boxId
   */
  public isBoxUnspentAndValid = async (boxId: string) => {
    try {
      const box = await this.client.getBoxById(boxId);
      this.logger.debug(
        `requested 'getBoxById' for boxId [${boxId}]. res: ${JsonBigInt.stringify(
          box,
        )}`,
      );

      return !box.spentTransactionId;
    } catch (error) {
      const baseError =
        'Failed to check if box is unspent and valid using Ergo Node:';
      return handleApiError(error, baseError, {
        handleRespondedState: (error: AxiosError<{ reason: string }>) => {
          if (error.response!.status === 404) return false;
          throw new FailedError(
            `${baseError} [${error.response!.status}] ${error.response!.data.reason}`,
          );
        },
      });
    }
  };

  /**
   * get current state context of blockchain using last ten blocks
   */
  public getStateContext = async (): Promise<BlockchainStateContext> => {
    try {
      const lastBlocks = await this.client.getLastHeaders(10);
      this.logger.debug(
        `requested 'getLastHeaders' for last 10 blocks. res: ${JsonBigInt.stringify(
          lastBlocks,
        )}`,
      );

      // Convert each block header JSON to a sigmastate-js Header
      const headers: Header[] = lastBlocks.map((h) => ({
        ...h,
        ADProofsRoot: h.adProofsRoot,
        // @ts-expect-error AvlTree$.fromDigest is present at runtime but not recognized by TS
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
    } catch (error) {
      return handleApiError(
        error,
        'Failed to get state context from Ergo Node:',
      );
    }
  };

  /**
   * get boxes by token id
   * @param tokenId
   */
  public getUnspentBoxesByTokenId = async (
    tokenId: string,
  ): Promise<ErgoBox[]> => {
    const boxes = await this.client.getBoxesByTokenIdUnspent(tokenId);
    this.logger.debug(
      `requested 'getBoxesByTokenId' for tokenId [${tokenId}]. res: ${JsonBigInt.stringify(
        boxes,
      )}`,
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
}

export default ErgoNodeNetwork;
