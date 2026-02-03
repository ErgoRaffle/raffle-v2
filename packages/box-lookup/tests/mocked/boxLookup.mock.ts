import { vi } from 'vitest';
import { DeserializeTx, DeserializedTx } from '../../lib';
import { sampleDeserializedTx, sampleErgoBoxes } from '../testData';
import { BoxSelector } from '../../lib/boxSelector';

/**
 * A mock TxPot object used for tests.
 */
export const sampleTxPot = {
  getTxsByStatus: vi.fn().mockResolvedValue([]),
  txRepository: {},
  chains: [],
  validators: [],
  txTypeCallbacks: {},
};

/**
 * A simple no-op deserializer used for tests that don't care about txpot content.
 */
export const noopDeserializeTx: DeserializeTx = () => ({
  id: 'tx',
  inputs: [],
  outputs: [],
});

/**
 * Creates a mock deserializeTx function that returns the sampleDeserializedTx.
 */
export const createMockDeserializeTx = () => {
  return vi
    .fn<DeserializeTx>()
    .mockReturnValue(sampleDeserializedTx as unknown as DeserializedTx);
};

/**
 * Sets up the default BoxSelector mock used by the BoxLookup tests.
 */
export const mockBoxSelector = () => {
  vi.mocked(BoxSelector).mockImplementation(
    () =>
      ({
        isEligibleForSelection: vi.fn().mockReturnValue(true),
        addBox: vi.fn(),
        isCovering: vi.fn().mockReturnValue(true),
        flushCoveringBoxes: vi
          .fn()
          .mockReturnValue([sampleErgoBoxes.validBoxWithTokens]),
      }) as unknown as BoxSelector,
  );
};
