import { SignedTransaction } from '@fleet-sdk/common';
import { ErgoUnsignedTransaction, Network } from '@fleet-sdk/core';
import { bigintBE } from '@fleet-sdk/crypto';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';

import { ErgoNodeNetwork } from '../ergo';

/**
 * Signs an unsigned Ergo transaction with the given HD key using sigmastate-js `ProverBuilder`.
 *
 * @param network - Ergo node client used to load blockchain parameters and signing context.
 * @param unsigned - Unsigned transaction to reduce and sign.
 * @param key - HD key whose Dlog secret signs wallet inputs.
 * @returns The signed Ergo transaction.
 */
export const signTransaction = async (
  network: ErgoNodeNetwork,
  unsigned: ErgoUnsignedTransaction,
  key: ErgoHDKey,
): Promise<SignedTransaction> => {
  const eip12Tx = unsigned.toEIP12Object();
  const [stateContext, blockchainParams] = await Promise.all([
    network.getStateContext(),
    network.getBlockchainParameters(),
  ]);

  const builder = ProverBuilder$.create(blockchainParams, Network.Mainnet);
  builder.withDLogSecret(bigintBE.encode(key.privateKey as Uint8Array));
  const prover = builder.build();

  const reducedTx = prover.reduce(
    stateContext,
    eip12Tx,
    eip12Tx.inputs,
    eip12Tx.dataInputs,
    unsigned.burning.tokens,
    0,
  );

  return prover.signReduced(reducedTx, undefined) as SignedTransaction;
};
