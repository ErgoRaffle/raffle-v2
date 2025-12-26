import { describe, expect, it, vi } from 'vitest';

vi.mock('@fleet-sdk/serializer', () => ({
  deserializeTransaction: vi.fn(),
}));

import { deserializeTransaction } from '@fleet-sdk/serializer';

import {
  deserializeTxForBoxLookup,
  toBoxLookupRequest,
} from '../src/services/boxLookup';
import { ErgoAddress, ErgoBox, Network } from '@fleet-sdk/core';
import {
  sampleDeserializeTransactionResult,
  sampleErgoBoxCandidate,
  sampleSerializedTx,
  sampleTxId,
} from './testData';
import { OutputBox } from '@ergo-raffle/box-lookup';
import { TransactionEntity, TransactionStatus } from '@rosen-bridge/tx-pot';
import { Amount, BoxCandidate, NonMandatoryRegisters } from '@fleet-sdk/common';

describe('BoxLookup', () => {
  describe('toBoxLookupRequest', () => {
    /**
     * @target should adapt background-job request into box-lookup request
     * @dependencies
     * @scenario
     * - create a request with fleet ErgoBox getConfirmedBoxes and onSuffice
     * - adapt it using toBoxLookupRequest
     * - call adapted.getConfirmedBoxes and capture returned OutputBox
     * - call adapted.onSuffice with returned OutputBoxes
     * - call adapted.onSuffice with plain OutputBox DTOs (not ErgoBox instances)
     * @expected
     * - getConfirmedBoxes should return OutputBoxes with correct ids
     * - onSuffice should be called with fleet ErgoBoxes (converted back)
     */
    it('should adapt background-job request into box-lookup request', async () => {
      const onSuffice = vi.fn().mockResolvedValue(undefined);
      const candidate: BoxCandidate<Amount, NonMandatoryRegisters> =
        sampleErgoBoxCandidate;
      const sampleErgoBox = new ErgoBox(candidate, sampleTxId, 0);
      const address = ErgoAddress.fromErgoTree(sampleErgoBox.ergoTree).toString(
        Network.Mainnet,
      );
      const request = {
        address,
        value: 1n,
        tokens: sampleErgoBox.assets,
        onSuffice,
        getConfirmedBoxes: vi.fn().mockResolvedValue([sampleErgoBox]),
      };

      const adapted = toBoxLookupRequest(request);

      const confirmed = await adapted.getConfirmedBoxes();
      expect(confirmed).toHaveLength(1);
      expect(confirmed[0].boxId).toBe(sampleErgoBox.boxId);
      expect(adapted.ergoTree).toBe(sampleErgoBox.ergoTree);

      await adapted.onSuffice(confirmed, confirmed, 7);
      expect(onSuffice).toHaveBeenCalledTimes(1);
      const [boxes, unspent, requestId] = onSuffice.mock.calls[0];
      expect(requestId).toBe(7);
      expect(boxes[0]).toBeInstanceOf(ErgoBox);
      expect(unspent[0]).toBeInstanceOf(ErgoBox);
      expect(boxes[0].boxId).toBe(sampleErgoBox.boxId);

      const dto: OutputBox = {
        boxId: 'dto-box-1',
        value: 1n,
        ergoTree: sampleErgoBox.ergoTree,
        creationHeight: 123,
        assets: [{ tokenId: 't1', amount: 5n }],
        additionalRegisters: {},
        transactionId: 'dto-tx-1',
        index: 0,
      };

      await adapted.onSuffice([dto], [dto], 9);

      expect(onSuffice).toHaveBeenCalledTimes(2);
      const [boxes2, unspentBoxes2, requestId2] = onSuffice.mock.calls[1];
      expect(requestId2).toBe(9);
      expect(boxes2[0]).toBeInstanceOf(ErgoBox);
      expect(unspentBoxes2[0]).toBeInstanceOf(ErgoBox);
      expect(boxes2[0].boxId).toBe('dto-box-1');
      expect(unspentBoxes2[0].boxId).toBe('dto-box-1');
    });
  });

  describe('deserializeTxForBoxLookup', () => {
    /**
     * @target should convert deserialized tx to minimal box-lookup shape
     * @dependencies
     * - deserializeTransaction (mocked)
     * @scenario
     * - mock deserializeTransaction to return a signed transaction with outputs and assets
     * - call deserializeTxForBoxLookup with a txpot entity
     * @expected
     * - outputs[].transactionId and outputs[].index should be preserved
     */
    it('should convert deserialized tx to minimal box-lookup shape', () => {
      const deserialized: ReturnType<typeof deserializeTransaction> =
        sampleDeserializeTransactionResult;
      vi.mocked(deserializeTransaction).mockReturnValue(deserialized);

      const sampleTxEntity: TransactionEntity = {
        txId: 'tx-id-entity',
        chain: 'ergo',
        txType: 'test',
        status: TransactionStatus.SIGNED,
        requiredSign: 1,
        lastCheck: 0,
        lastStatusUpdate: '0',
        failedInSign: false,
        signFailedCount: 0,
        serializedTx: sampleSerializedTx,
      };
      const projected = deserializeTxForBoxLookup(sampleTxEntity);
      expect(projected.id).toBe(sampleTxId);
      expect(projected.inputs[0].boxId).toBe(
        sampleDeserializeTransactionResult.inputs[0].boxId,
      );

      expect(projected.outputs).toHaveLength(2);

      expect(projected.outputs[0].transactionId).toBe(sampleTxId);
      expect(projected.outputs[0].index).toBe(0);

      expect(projected.outputs[1].transactionId).toBe(sampleTxId);
      expect(projected.outputs[1].index).toBe(1);
    });
  });
});
