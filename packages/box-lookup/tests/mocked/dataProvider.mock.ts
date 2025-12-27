import { vi } from 'vitest';
import { TransactionStatus } from '@rosen-bridge/tx-pot';
import { DeserializeTx, DeserializedTx } from '../../lib';
import {
  sampleTransactionEntity,
  sampleUnconfirmedTransactions,
  sampleDeserializedTx,
} from '../testData';

export const sampleTxPot = {
  getTxsByStatus: vi.fn().mockImplementation((status: TransactionStatus) => {
    if (status === TransactionStatus.SIGNED) {
      return Promise.resolve([sampleTransactionEntity]);
    }
    return Promise.resolve([]);
  }),
};

// Mock Node API instance
export const sampleNodeAPI = {
  getUnconfirmedTransactions: vi.fn().mockImplementation(({ offset }) => {
    // Simulate pagination
    if (offset === 0) {
      return Promise.resolve(sampleUnconfirmedTransactions);
    } else {
      return Promise.resolve([]); // No more pages
    }
  }),
};

/**
 * Creates a mock TxPot transaction deserializer for tests.
 */
export const createMockDeserializeTx = () => {
  return vi
    .fn<DeserializeTx>()
    .mockReturnValue(sampleDeserializedTx as unknown as DeserializedTx);
};
