import { SignedTransaction } from '@fleet-sdk/common';
import { Box, ErgoBox, ErgoUnsignedTransaction } from '@fleet-sdk/core';
import { bigintBE, hex } from '@fleet-sdk/crypto';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';
import { TransactionStatus, TxPot } from '@rosen-bridge/tx-pot';
import { deserializeBox, serializeTransaction } from '@fleet-sdk/serializer';
import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';

import ErgoNodeNetwork from '../network/ergoNodeNetwork';
import { TxType } from '../txPot/types';
import { ERGO_CHAIN_NAME } from '../constants';
import { getConfig } from '../config/config';

/**
 * Signs an unsigned Ergo transaction with the provided keys.
 *
 * @param network - The network to use for the transaction.
 * @param unsigned - The unsigned Ergo transaction to sign.
 * @param keys - An array of ErgoHDKey objects containing the private keys for signing.
 * @returns A signed transaction if successful
 * @throws Throws an error if any key does not have a private key.
 */
export const signTransaction = async (
  network: ErgoNodeNetwork,
  unsigned: ErgoUnsignedTransaction,
  keys: ErgoHDKey[],
): Promise<SignedTransaction> => {
  // Validate that each key has a private key
  for (const key of keys) {
    if (!key.hasPrivateKey()) {
      throw new Error(
        `ErgoHDKey '${hex.encode(key.publicKey)}' must have a private key.`,
      );
    }
  }

  const eip12Tx = unsigned.toEIP12Object();

  const params = {
    context: await network.getStateContext(),
    parameters: await network.getBlockchainParameters(),
    network: getConfig().ergo.network,
    baseCost: 0,
  };

  try {
    const builder = ProverBuilder$.create(params.parameters, params.network);

    for (const key of keys) {
      builder.withDLogSecret(bigintBE.encode(key.privateKey as Uint8Array));
    }

    const prover = builder.build();

    const reducedTx = prover.reduce(
      params.context,
      eip12Tx,
      eip12Tx.inputs,
      eip12Tx.dataInputs,
      unsigned.burning.tokens,
      params.baseCost,
    );

    return prover.signReduced(reducedTx, undefined);
  } catch (e) {
    throw new Error(`Failed to sign transaction: ${e}`);
  }
};

/**
 * Signs a transaction and adds it to the txpot
 * @param network - The network to use for the transaction.
 * @param txPot - The txpot to add the transaction to
 * @param tx - The transaction to add
 * @param txType - The type of transaction
 */
export const signAndAddTx = async (
  network: ErgoNodeNetwork,
  txPot: TxPot,
  tx: ErgoUnsignedTransaction,
  txType: TxType,
) => {
  let signedTx: SignedTransaction;
  try {
    signedTx = await signTransaction(network, tx, []);
  } catch (e) {
    throw new Error(`Failed to sign transaction: ${e}`);
  }
  txPot.addTx(
    tx.id,
    ERGO_CHAIN_NAME,
    txType,
    0, // no required sign
    Buffer.from(serializeTransaction(signedTx).toBytes()).toString('hex'),
    TransactionStatus.APPROVED,
  );
};

/**
 * Converts a list of BoxEntity objects to a list of ErgoBox objects
 * @param dbBoxes - The list of BoxEntity objects to convert
 * @returns The list of ErgoBox objects
 */
export const covertDbBoxesToErgoBoxes = (
  dbBoxes: AbstractErgoExtractorEntity[],
): ErgoBox[] => {
  return dbBoxes.map((dbBox) => {
    /**
     * We know that the box is mined because it is stored in the database
     * and we can use Box type instead of BoxCandidate
     */
    const box = deserializeBox(dbBox.serialized) as Box<bigint>;
    return new ErgoBox(box);
  });
};
