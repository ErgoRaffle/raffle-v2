import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { TxPot, TransactionEntity } from '@rosen-bridge/tx-pot';
import { ErgoBox } from '@fleet-sdk/core';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { serializeTransaction } from '@fleet-sdk/serializer';

import { DataProvider } from '../lib/dataProvider';
import {
  sampleTxPot,
  sampleNodeAPI,
  sampleNodeURL,
  sampleDeserializedTx,
  sampleUnconfirmedTransactions,
} from './mocked/dataProvider.mock';

// Mock the ergo node client factory
vi.mock('@rosen-clients/ergo-node');

describe('DataProvider', () => {
  let dataProvider: DataProvider;
  let mockLogger: DummyLogger;

  beforeEach(() => {
    mockLogger = new DummyLogger();
    vi.mocked(ergoNodeClientFactory).mockReturnValue(
      sampleNodeAPI as unknown as ReturnType<typeof ergoNodeClientFactory>,
    );
    dataProvider = new DataProvider(
      sampleTxPot as unknown as TxPot,
      sampleNodeURL,
      mockLogger,
    );
  });

  describe('startNewRound', () => {
    /**
     * @target should start a new round and fetch data from mempool
     * @dependencies
     * @scenario
     * - call startNewRound function
     * - check if the round state is properly initialized
     * - verify that mempool data is fetched and stored
     * @expected
     * - round state should be reset and populated with mempool data
     */
    it('should start a new round and fetch data from mempool', async () => {
      await dataProvider.startNewRound();

      const roundState = dataProvider.getCurrentRoundState();

      expect(roundState.spentBoxIds).toEqual(
        new Set(
          sampleUnconfirmedTransactions
            .map((tx) => tx.inputs.map((input) => input.boxId))
            .flat(),
        ),
      );
      expect(roundState.unspentBoxes.map((box) => box.boxId)).toEqual(
        sampleUnconfirmedTransactions
          .map((tx) => tx.outputs.map((box) => box.boxId))
          .flat(),
      );
      expect(sampleNodeAPI.getUnconfirmedTransactions).toHaveBeenCalled();
    });

    /**
     * @target should reset round state when starting a new round
     * @dependencies
     * @scenario
     * - start first round and add some data
     * - start a second round
     * - check if the state is properly reset
     * @expected
     * - round state should be reset for the new round
     */
    it('should reset round state when starting a new round', async () => {
      // Start first round
      dataProvider['currentRoundState'] = {
        spentBoxIds: new Set<string>(['box-id-1']),
        unspentBoxes: [{ boxId: 'box-id-2' } as ErgoBox],
      };
      const firstRoundState = dataProvider.getCurrentRoundState();

      // Start second round
      await dataProvider.startNewRound();
      const secondRoundState = dataProvider.getCurrentRoundState();

      // The states should be different (reset)
      expect(firstRoundState.spentBoxIds).not.toEqual(
        secondRoundState.spentBoxIds,
      );
      expect(firstRoundState.unspentBoxes).not.toEqual(
        secondRoundState.unspentBoxes,
      );
    });
  });

  describe('updateRoundWithTxPotData', () => {
    beforeEach(() => {
      dataProvider['deserializeTx'] = vi
        .fn()
        .mockReturnValue(sampleDeserializedTx);
    });

    /**
     * @target should update round state with TxPot data
     * @dependencies
     * @scenario
     * - start a new round
     * - call updateRoundWithTxPotData
     * - check if TxPot data is properly integrated
     * @expected
     * - round state should be updated with TxPot spent and unspent boxes
     */
    it('should update round state with TxPot data', async () => {
      await dataProvider.startNewRound();
      await dataProvider.updateRoundWithTxPotData();
      const updatedState = dataProvider.getCurrentRoundState();

      // Should have more data after updating with TxPot
      sampleDeserializedTx.inputs.forEach((input) => {
        expect(updatedState.spentBoxIds.has(input.boxId)).toBe(true);
      });
      expect(updatedState.unspentBoxes.map((box) => box.boxId)).toEqual(
        expect.arrayContaining(
          sampleDeserializedTx.outputs.map((box) => box.boxId),
        ),
      );
    });

    /**
     * @target should filter out spent boxes from unspent boxes
     * @dependencies
     * @scenario
     * - start a round with some unspent boxes
     * - update with TxPot data that includes spent boxes
     * - check if spent boxes are properly filtered out
     * @expected
     * - unspent boxes should not contain any boxes that are marked as spent
     */
    it('should filter out spent boxes from unspent boxes', async () => {
      await dataProvider.startNewRound();
      await dataProvider.updateRoundWithTxPotData();

      const roundState = dataProvider.getCurrentRoundState();

      // Check that no unspent box is in the spent box list
      for (const unspentBox of roundState.unspentBoxes) {
        expect(roundState.spentBoxIds.has(unspentBox.boxId)).toBe(false);
      }
    });

    /**
     * @target should handle duplicate boxes correctly
     * @dependencies
     * @scenario
     * - start a round with some boxes
     * - update with TxPot data that includes duplicate boxes
     * - check if duplicates are handled properly
     * @expected
     * - should not have duplicate boxes in the unspent boxes list
     */
    it('should handle duplicate boxes correctly', async () => {
      await dataProvider.startNewRound();
      await dataProvider.updateRoundWithTxPotData();

      const roundState = dataProvider.getCurrentRoundState();
      const boxIds = roundState.unspentBoxes.map((box) => box.boxId);
      const uniqueBoxIds = new Set(boxIds);

      expect(boxIds.length).toBe(uniqueBoxIds.size);
    });
  });

  describe('getCurrentRoundState', () => {
    /**
     * @target should return a copy of current round state
     * @dependencies
     * @scenario
     * - start a new round to populate state
     * - call getCurrentRoundState multiple times
     * - modify the returned state
     * @expected
     * - should return independent copies of the state
     */
    it('should return a copy of current round state', async () => {
      await dataProvider.startNewRound();

      const state1 = dataProvider.getCurrentRoundState();
      const state2 = dataProvider.getCurrentRoundState();

      // Modify state1
      state1.spentBoxIds.add('test-box-id');
      state1.unspentBoxes.push({} as ErgoBox);

      // state2 should remain unchanged
      expect(state2.spentBoxIds.has('test-box-id')).toBe(false);
      expect(state2.unspentBoxes.length).toBeLessThan(
        state1.unspentBoxes.length,
      );
    });
  });

  describe('deserializeTx', () => {
    /**
     * @target should deserialize valid transaction correctly
     * @dependencies
     * @scenario
     * - create a valid transaction entity
     * - deserialize it
     * - check if deserialization is correct
     * @expected
     * - should return deserialized transaction object
     */
    it('should deserialize valid transaction correctly', async () => {
      const serializedTx = Buffer.from(
        serializeTransaction(sampleDeserializedTx).toBytes(),
      ).toString('hex');
      const deserializedTx = await dataProvider['deserializeTx']({
        serializedTx,
      } as unknown as TransactionEntity);
      expect(sampleDeserializedTx).toMatchObject(deserializedTx);
    });
  });
});
