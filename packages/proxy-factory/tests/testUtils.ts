import { Network, SignedTransaction } from '@fleet-sdk/common';
import type { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import { bigintBE, hex } from '@fleet-sdk/crypto';
import {
  KeyedMockChainParty,
  MockChain,
  BlockState,
  mockBlockchainStateContext,
  BLOCKCHAIN_PARAMETERS,
} from '@fleet-sdk/mock-chain';
import { ProverBuilder$ } from 'sigmastate-js/main';

export class CustomMockChain extends MockChain {
  private tip: BlockState;

  constructor() {
    const state = {
      height: 0,
      timestamp: new Date().getTime(),
      parameters: BLOCKCHAIN_PARAMETERS,
    };
    super();
    this.tip = state;
  }

  /**
   * Set mocked chain tip height to the specified height
   * @param height
   */
  setTip(height: number) {
    const state = {
      height: height,
      timestamp: new Date().getTime(),
      parameters: BLOCKCHAIN_PARAMETERS,
    };
    this.tip = state;
    this.jumpTo(height);
  }

  /**
   * Custom trnasaction execution to ensure scripts validation
   * @param unsigned
   * @param signers
   * @returns signed transaction
   */
  executeTx = (
    unsigned: ErgoUnsignedTransaction,
    signers: KeyedMockChainParty[],
  ): SignedTransaction => {
    const keys = signers.map((p) => p.key);
    for (const key of keys) {
      if (!key.hasPrivateKey()) {
        throw new Error(
          `ErgoHDKey '${hex.encode(key.publicKey)}' must have a private key.`,
        );
      }
    }

    const context = mockBlockchainStateContext({
      headers: {
        quantity: 10,
        fromHeight: this.tip.height,
        fromTimestamp: this.tip.timestamp,
      },
    });
    const eip12Tx = unsigned.toEIP12Object();
    const params = {
      context: context,
      parameters: BLOCKCHAIN_PARAMETERS,
      network: Network.Mainnet,
      baseCost: 0,
    };

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
  };
}
