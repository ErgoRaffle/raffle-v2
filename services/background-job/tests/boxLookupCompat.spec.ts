import { describe, expect, it, vi } from 'vitest';

vi.mock('@fleet-sdk/serializer', () => ({
  deserializeTransaction: vi.fn(),
}));

import { deserializeTransaction } from '@fleet-sdk/serializer';

import {
  deserializeTxForBoxLookup,
  ergoBoxToOutputBox,
  outputBoxToErgoBox,
  toBoxLookupRequest,
} from '../src/services/boxLookupCompat';
import { Network } from '@fleet-sdk/core';
import { ErgoAddress } from '@fleet-sdk/core';
import { sampleErgoBox, sampleTxEntity } from './mocked/boxLookupCompat.mock';

describe('boxLookupCompat', () => {
  describe('box conversions', () => {
    /**
     * @target should convert ErgoBox to OutputBox and back to ErgoBox
     * @dependencies
     * @scenario
     * - convert a sample ErgoBox to OutputBox
     * - convert it back to ErgoBox
     * @expected
     * - core fields should remain equal across the roundtrip
     */
    it('should convert ErgoBox -> OutputBox -> ErgoBox preserving key fields', () => {
      const out = ergoBoxToOutputBox(sampleErgoBox);
      const roundtrip = outputBoxToErgoBox(out);

      expect(out.boxId).toBe(sampleErgoBox.boxId);
      expect(out.value).toBe(sampleErgoBox.value);
      expect(out.ergoTree).toBe(sampleErgoBox.ergoTree);
      expect(out.creationHeight).toBe(sampleErgoBox.creationHeight);
      expect(out.assets[0].tokenId).toBe(sampleErgoBox.assets[0].tokenId);
      expect(out.assets[0].amount).toBe(sampleErgoBox.assets[0].amount);

      expect(roundtrip.boxId).toBe(sampleErgoBox.boxId);
      expect(roundtrip.value).toBe(sampleErgoBox.value);
      expect(roundtrip.ergoTree).toBe(sampleErgoBox.ergoTree);
    });
  });

  describe('toBoxLookupRequest', () => {
    /**
     * @target should adapt background-job request into box-lookup request
     * @dependencies
     * @scenario
     * - create a request with fleet ErgoBox getConfirmedBoxes and onSuffice
     * - adapt it using toBoxLookupRequest
     * - call adapted.getConfirmedBoxes and capture returned OutputBox
     * - call adapted.onSuffice with returned OutputBoxes
     * @expected
     * - getConfirmedBoxes should return OutputBoxes with correct ids
     * - onSuffice should be called with fleet ErgoBoxes (converted back)
     */
    it('should adapt getConfirmedBoxes and onSuffice through conversions', async () => {
      const onSuffice = vi.fn().mockResolvedValue(undefined);
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
      expect(boxes[0].boxId).toBe(sampleErgoBox.boxId);
      expect(unspent[0].boxId).toBe(sampleErgoBox.boxId);
    });
  });

  describe('deserializeTxForBoxLookup', () => {
    /**
     * @target should project a fleet deserialized transaction into box-lookup minimal tx shape
     * @dependencies
     * - deserializeTransaction (mocked)
     * @scenario
     * - mock deserializeTransaction return value
     * - call deserializeTxForBoxLookup with a txpot entity
     * @expected
     * - returned object should contain id, inputs[].boxId, outputs[] with OutputBox fields
     */
    it('should project fleet-deserialized tx into minimal shape', () => {
      vi.mocked(deserializeTransaction).mockReturnValue({
        id: 'tx-id-123',
        inputs: [{ boxId: 'in-1', spendingProof: null }],
        dataInputs: [],
        outputs: [
          {
            boxId: 'out-1',
            value: '2',
            ergoTree: '00',
            creationHeight: 10,
            assets: [],
            additionalRegisters: {},
            transactionId: 'tx-id-123',
            index: 0,
          },
        ],
      } as unknown as ReturnType<typeof deserializeTransaction>);

      const projected = deserializeTxForBoxLookup(sampleTxEntity);
      expect(projected.id).toBe('tx-id-123');
      expect(projected.inputs[0].boxId).toBe('in-1');
      expect(projected.outputs[0].boxId).toBe('out-1');
      expect(projected.outputs[0].value).toBe(2n);
    });

    /**
     * @target should normalize Amount fields (string|bigint) into bigint
     * @dependencies
     * - deserializeTransaction (mocked)
     * @scenario
     * - mock deserializeTransaction to return value/amount as string (Amount)
     * - call deserializeTxForBoxLookup with a txpot entity
     * @expected
     * - value and token amounts should be converted to bigint
     */
    it('should normalize amount fields', () => {
      vi.mocked(deserializeTransaction).mockReturnValue({
        id: 'tx-id-obj',
        inputs: [{ boxId: 'in-obj', spendingProof: null }],
        dataInputs: [],
        outputs: [
          {
            boxId: 'out-obj',
            value: '3',
            ergoTree: '00',
            creationHeight: 10,
            assets: [{ tokenId: 't1', amount: '5' }],
            additionalRegisters: {},
            transactionId: 'tx-id-obj',
            index: 0,
          },
        ],
      } as unknown as ReturnType<typeof deserializeTransaction>);

      const projected = deserializeTxForBoxLookup(sampleTxEntity);
      expect(projected.id).toBe('tx-id-obj');
      expect(projected.inputs[0].boxId).toBe('in-obj');
      expect(projected.outputs[0].boxId).toBe('out-obj');
      expect(projected.outputs[0].value).toBe(3n);
      expect(projected.outputs[0].assets[0].amount).toBe(5n);
      expect(projected.outputs[0].transactionId).toBe('tx-id-obj');
    });
  });
});
