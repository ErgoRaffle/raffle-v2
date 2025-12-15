import { ErgoBox, Network, TokenAmount } from '@fleet-sdk/core';
import { TransactionEntity } from '@rosen-bridge/tx-pot';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import {
  ErgoNetwork,
  OutputBox,
  Request as BoxLookupRequest,
} from '@ergo-raffle/box-lookup';
import type {
  Amount,
  Box,
  BoxCandidate,
  NonMandatoryRegisters,
  SignedTransaction,
} from '@fleet-sdk/common';

/**
 * The background-job onSuffice callback signature (fleet `ErgoBox` based).
 *
 * @param boxes - Selected boxes satisfying the request
 * @param unspentBoxes - Current view of all available unspent boxes
 * @param requestId - The request id assigned by box-lookup
 */
export type OnSufficeCallback = (
  boxes: ErgoBox[],
  unspentBoxes: ErgoBox[],
  requestId: number,
) => Promise<void>;

/**
 * A function that returns confirmed (mined) unspent boxes (fleet `ErgoBox` based).
 */
export type GetConfirmedBoxes = () => Promise<ErgoBox[]>;

/**
 * Background-job request type used by transaction services.
 */
export interface Request {
  address: string;
  value: bigint | undefined;
  tokens: TokenAmount<bigint>[];
  onSuffice: OnSufficeCallback;
  getConfirmedBoxes: GetConfirmedBoxes;
}

/**
 * Maps fleet-sdk network enum to box-lookup network enum.
 *
 * @param networkType - Fleet network type
 * @returns Box-lookup network type
 */
export const mapFleetNetwork = (networkType: Network): ErgoNetwork => {
  return networkType === Network.Mainnet
    ? ErgoNetwork.Mainnet
    : ErgoNetwork.Testnet;
};

/**
 * Converts a fleet `ErgoBox` into a plain `OutputBox` DTO used by box-lookup.
 *
 * @param box - Fleet ErgoBox instance
 * @returns OutputBox DTO
 */
export const ergoBoxToOutputBox = (box: ErgoBox): OutputBox => {
  return {
    boxId: box.boxId,
    value: box.value,
    ergoTree: box.ergoTree,
    creationHeight: box.creationHeight,
    assets: (box.assets ?? []).map((a) => ({
      tokenId: a.tokenId,
      amount: a.amount,
    })),
    additionalRegisters: box.additionalRegisters,
    transactionId: box.transactionId,
    index: box.index,
  };
};

/**
 * Converts an `OutputBox` DTO into a fleet `ErgoBox`.
 *
 * @param box - OutputBox DTO
 * @returns Fleet ErgoBox instance
 */
export const outputBoxToErgoBox = (box: OutputBox): ErgoBox => {
  const candidate: BoxCandidate<Amount, NonMandatoryRegisters> = {
    boxId: box.boxId,
    ergoTree: box.ergoTree,
    creationHeight: box.creationHeight,
    value: box.value,
    assets: box.assets,
    additionalRegisters: box.additionalRegisters,
  };
  return new ErgoBox(candidate, box.transactionId, box.index);
};

/**
 * Adapts a background-job request (fleet `ErgoBox`) into a `box-lookup` request (DTO `OutputBox`).
 *
 * @param request - Background-job request (fleet based)
 * @returns Box-lookup request (DTO based)
 */
export const toBoxLookupRequest = (request: Request): BoxLookupRequest => {
  return {
    address: request.address,
    value: request.value,
    tokens: request.tokens.map((t) => ({
      tokenId: t.tokenId,
      amount: typeof t.amount === 'bigint' ? t.amount : BigInt(t.amount),
    })),
    onSuffice: async (
      boxes: OutputBox[],
      unspentBoxes: OutputBox[],
      requestId: number,
    ) => {
      return request.onSuffice(
        boxes.map(outputBoxToErgoBox),
        unspentBoxes.map(outputBoxToErgoBox),
        requestId,
      );
    },
    getConfirmedBoxes: async () => {
      const confirmed = await request.getConfirmedBoxes();
      return confirmed.map(ergoBoxToOutputBox);
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
): { id: string; inputs: Array<{ boxId: string }>; outputs: OutputBox[] } => {
  const deserialized = deserializeTransaction<SignedTransaction>(
    Buffer.from(tx.serializedTx, 'base64'),
  );
  const txId = deserialized.id;

  return {
    id: txId,
    inputs: deserialized.inputs.map((input) => ({
      boxId: input.boxId,
    })),
    outputs: deserialized.outputs.map((out: Box<Amount>, idx: number) => ({
      boxId: out.boxId,
      value: BigInt(out.value),
      ergoTree: out.ergoTree,
      creationHeight: out.creationHeight,
      assets: out.assets.map((a) => ({
        tokenId: a.tokenId,
        amount: BigInt(a.amount),
      })),
      additionalRegisters: out.additionalRegisters,
      transactionId: out.transactionId ?? txId,
      index: out.index ?? idx,
    })),
  };
};
