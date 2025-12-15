import { vi } from 'vitest';

import { DeserializedTx, DeserializeTx } from '../../lib/dataProvider';
import { sampleDeserializedTx } from './dataProvider.mock';

/**
 * Creates a mock TxPot transaction deserializer for tests.
 *
 * Note: `box-lookup` only requires a minimal transaction shape:
 * - `id`
 * - `inputs[].boxId`
 * - `outputs[]` (OutputBox-like)
 */
export const createMockDeserializeTx = () => {
  return vi
    .fn<DeserializeTx>()
    .mockReturnValue(sampleDeserializedTx as unknown as DeserializedTx);
};

/**
 * A simple no-op deserializer used for tests that don't care about txpot content.
 */
export const noopDeserializeTx: DeserializeTx = () => ({
  id: 'tx',
  inputs: [],
  outputs: [],
});
