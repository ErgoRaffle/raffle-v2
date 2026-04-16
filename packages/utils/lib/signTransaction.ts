import { SignedTransaction } from '@fleet-sdk/common';
import { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import { Network } from '@fleet-sdk/core';
import { bigintBE, hex } from '@fleet-sdk/crypto';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';

import { ErgoNodeNetwork } from './index';

/**
 * Signs an unsigned Ergo transaction with the provided keys.
 *
 * @param network - The network to use for the transaction.
 * @param unsigned - The unsigned Ergo transaction to sign.
 * @param keys - An array of ErgoHDKey objects containing the private keys for signing.
 * @param networkType
 * @returns A signed transaction if successful
 * @throws Throws an error if any key does not have a private key.
 */
export const signTransaction = async (
  network: ErgoNodeNetwork,
  unsigned: ErgoUnsignedTransaction,
  keys: ErgoHDKey[],
  networkType: Network,
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
    network: networkType,
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
