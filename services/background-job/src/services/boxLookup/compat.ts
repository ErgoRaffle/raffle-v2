import {
  OutputBox,
  Request as BoxLookupRequest,
} from '@ergo-raffle/box-lookup';
import { DeserializedTx } from '@ergo-raffle/box-lookup';
import { Amount, Box, SignedTransaction } from '@fleet-sdk/common';
import { ErgoAddress, ErgoBox } from '@fleet-sdk/core';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import { TransactionEntity } from '@rosen-bridge/tx-pot';

import { Request } from '../../types';

/**
 * Adapts a background-job request (fleet `ErgoBox`) into a `box-lookup` request (DTO `OutputBox`).
 *
 * @param request - Background-job request (fleet based)
 * @returns Box-lookup request (DTO based)
 */
export const toBoxLookupRequest = (request: Request): BoxLookupRequest => {
  const ergoTree = ErgoAddress.fromBase58(request.address).ergoTree;
  return {
    ergoTree,
    value: request.value,
    tokens: request.tokens.map((t) => ({
      tokenId: t.tokenId,
      amount: t.amount,
    })),
    onSuffice: async (
      boxes: OutputBox[],
      unspentBoxes: OutputBox[],
      requestId: number,
    ) => {
      return request.onSuffice(
        boxes.map((box) => new ErgoBox(box)),
        unspentBoxes.map((box) => new ErgoBox(box)),
        requestId,
      );
    },
    getConfirmedBoxes: async () => {
      const confirmed = await request.getConfirmedBoxes();
      return confirmed as unknown as OutputBox[];
    },
  };
};

/**
 * Creates the deserializer function required by the new `box-lookup` constructor.
 *
 * Background-job stores fleet-serialized transactions in TxPot, so we deserialize using fleet,
 * then project the result into the minimal shape expected by `box-lookup`.
 *
 * @param tx - TxPot transaction entity containing base64 serialized tx bytes
 * @returns A minimal transaction object used by box-lookup (id, inputs boxIds, outputs OutputBoxes)
 */
export const deserializeTxForBoxLookup = (
  tx: TransactionEntity,
): DeserializedTx => {
  const deserialized = deserializeTransaction<SignedTransaction>(
    Buffer.from(tx.serializedTx, 'base64'),
  );
  const txId = deserialized.id;

  return {
    id: txId,
    inputs: deserialized.inputs.map((input) => ({
      boxId: input.boxId,
    })),
    outputs: deserialized.outputs.map((out: Box<Amount>) => new ErgoBox(out)),
  };
};
