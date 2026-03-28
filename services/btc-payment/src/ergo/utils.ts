import { SignedTransaction } from '@fleet-sdk/common';
import { ErgoUnsignedTransaction, Network } from '@fleet-sdk/core';
import { bigintBE } from '@fleet-sdk/crypto';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';

import { ErgoNodeNetwork } from '../ergo';

/**
 * Signs an unsigned Ergo transaction with the given HD key using
 * sigmastate-js's ProverBuilder.
 * @param network - The Ergo node network instance used to fetch signing context
 * @param unsigned - The unsigned transaction to sign
 * @param key - The HD key whose Dlog secret is used to sign wallet inputs
 * @returns The signed transaction
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
