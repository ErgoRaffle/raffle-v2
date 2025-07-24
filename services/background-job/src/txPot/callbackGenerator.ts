import { CallbackFunction, TransactionEntity } from '@rosen-bridge/tx-pot';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import { ErgoAddress } from '@fleet-sdk/core';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { BoxLookupService } from '../services/boxLoookupService';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * Generates a callback function for a transaction
 * @param boxLookupService - The box lookup service
 * @param proxyAddress - The proxy address
 * @param callbackId - The callback id
 * @param requestId - The request id
 * @param logger - The logger
 */
export const txpotCallBackGenerator = (
  proxyAddress: string,
  callbackId: string,
  requestId: number,
): CallbackFunction => {
  return async (txEntity: TransactionEntity) => {
    const tx = deserializeTransaction(
      Buffer.from(txEntity.serializedTx, 'hex'),
    );
    if (
      tx.outputs.find(
        (output) =>
          output.ergoTree === ErgoAddress.fromBase58(proxyAddress).ergoTree,
      )
    ) {
      logger.info(
        `Transaction ${txEntity.txId} is completed for request ${requestId}`,
      );
      // Remove the request from the box lookup
      BoxLookupService.getInstance().removeRequest(
        requestId,
        callbackId,
        proxyAddress,
      );
      return;
    }
  };
};
