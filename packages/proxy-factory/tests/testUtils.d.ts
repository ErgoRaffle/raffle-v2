import { SignedTransaction } from '@fleet-sdk/common';
import type {
  Box,
  ErgoUnsignedTransaction,
  OutputBuilder,
} from '@fleet-sdk/core';
import { KeyedMockChainParty, MockChain } from '@fleet-sdk/mock-chain';

export declare class CustomMockChain extends MockChain {
  private tip;
  constructor();
  /**
   * Set mocked chain tip height to the specified height
   * @param height
   */
  setTip(height: number): void;
  /**
   * Custom trnasaction execution to ensure scripts validation
   * @param unsigned
   * @param signers
   * @returns signed transaction
   */
  executeTx: (
    unsigned: ErgoUnsignedTransaction,
    signers: KeyedMockChainParty[],
  ) => SignedTransaction;
}
/**
 * Mock a utxo from an output builder
 * @param box - output builder
 * @returns mocked utxo
 */
export declare const createMockUtxo: (box: OutputBuilder) => Box<bigint>;
//# sourceMappingURL=testUtils.d.ts.map
