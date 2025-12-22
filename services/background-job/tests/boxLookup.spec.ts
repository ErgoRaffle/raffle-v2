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
import { sampleErgoBox, sampleTxEntity } from './mocked/boxLookup.mock';
import { OutputBox } from '@ergo-raffle/box-lookup';

describe('toBoxLookupRequest', () => {
  /**
   * @target should treat ErgoBox as OutputBox and convert it back to ErgoBox
   * @dependencies
   * @scenario
   * - treat a sample ErgoBox as an OutputBox
   * - convert it back to ErgoBox
   * @expected
   * - core fields should remain equal across the roundtrip
   */
  it('should convert ErgoBox -> OutputBox -> ErgoBox preserving key fields', () => {
    const out = sampleErgoBox as unknown as OutputBox;
    const roundtrip = new ErgoBox(out);

    expect(out.boxId).toBe(sampleErgoBox.boxId);
    expect(out.value).toBe(sampleErgoBox.value);
    expect(typeof out.value).toBe('bigint');
    expect(out.ergoTree).toBe(sampleErgoBox.ergoTree);
    expect(out.creationHeight).toBe(sampleErgoBox.creationHeight);
    expect(out.assets[0].tokenId).toBe(sampleErgoBox.assets[0].tokenId);
    expect(out.assets[0].amount).toBe(sampleErgoBox.assets[0].amount);
    expect(out.additionalRegisters).toEqual(sampleErgoBox.additionalRegisters);
    expect(out.transactionId).toBe(sampleErgoBox.transactionId);
    expect(out.index).toBe(sampleErgoBox.index);

    expect(roundtrip.boxId).toBe(sampleErgoBox.boxId);
    expect(roundtrip.value).toBe(sampleErgoBox.value);
    expect(roundtrip.ergoTree).toBe(sampleErgoBox.ergoTree);
  });

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
    expect(confirmed[0]).toBeInstanceOf(ErgoBox);
    expect(adapted.ergoTree).toBe(sampleErgoBox.ergoTree);

    await adapted.onSuffice(confirmed, confirmed, 7);
    expect(onSuffice).toHaveBeenCalledTimes(1);
    const [boxes, unspent, requestId] = onSuffice.mock.calls[0];
    expect(requestId).toBe(7);
    expect(boxes[0].boxId).toBe(sampleErgoBox.boxId);
    expect(unspent[0].boxId).toBe(sampleErgoBox.boxId);
  });

  /**
   * @target should convert OutputBox DTOs passed by box-lookup into fleet ErgoBox instances in onSuffice
   * @dependencies
   * @scenario
   * - create a request with an onSuffice spy
   * - adapt it using toBoxLookupRequest
   * - call adapted.onSuffice with plain OutputBox DTOs (not ErgoBox instances)
   * @expected
   * - onSuffice should receive fleet ErgoBox instances with matching fields
   */
  it('should convert OutputBox DTOs into ErgoBox instances in onSuffice', async () => {
    const onSuffice = vi.fn().mockResolvedValue(undefined);
    const address = ErgoAddress.fromErgoTree(sampleErgoBox.ergoTree).toString(
      Network.Mainnet,
    );
    const request = {
      address,
      value: undefined,
      tokens: [],
      onSuffice,
      getConfirmedBoxes: vi.fn().mockResolvedValue([]),
    };

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

    const adapted = toBoxLookupRequest(request);
    await adapted.onSuffice([dto], [dto], 9);

    expect(onSuffice).toHaveBeenCalledTimes(1);
    const [boxes, unspentBoxes, requestId] = onSuffice.mock.calls[0];
    expect(requestId).toBe(9);
    expect(boxes[0]).toBeInstanceOf(ErgoBox);
    expect(unspentBoxes[0]).toBeInstanceOf(ErgoBox);
    expect(boxes[0].boxId).toBe('dto-box-1');
    expect(boxes[0].transactionId).toBe('dto-tx-1');
    expect(boxes[0].index).toBe(0);
    expect(boxes[0].value).toBe(1n);
  });
});

describe('deserializeTxForBoxLookup', () => {
  /**
   * @target should convert a fleet deserialized tx into the minimal shape expected by box-lookup
   * @dependencies
   * - deserializeTransaction (mocked)
   * @scenario
   * - mock deserializeTransaction to return outputs with string|bigint amounts and missing tx metadata
   * - call deserializeTxForBoxLookup with a txpot entity
   * @expected
   * - id and inputs[].boxId should be preserved
   * - outputs[].value and assets[].amount should be bigint
   * - outputs[].transactionId and outputs[].index should be set (defaulted if missing)
   */
  it('should convert deserialized tx to minimal box-lookup shape', () => {
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
        },
        {
          boxId: 'out-obj-2',
          value: 4n,
          ergoTree: '00',
          creationHeight: 11,
          assets: [{ tokenId: 't2', amount: 6n }],
          additionalRegisters: {},
          transactionId: undefined,
          index: undefined,
        },
      ],
    } as unknown as ReturnType<typeof deserializeTransaction>);

    const projected = deserializeTxForBoxLookup(sampleTxEntity);
    expect(projected.id).toBe('tx-id-obj');
    expect(projected.inputs[0].boxId).toBe('in-obj');

    expect(projected.outputs).toHaveLength(2);

    expect(projected.outputs[0].boxId).toBe('out-obj');
    expect(projected.outputs[0].value).toBe(3n);
    expect(typeof projected.outputs[0].value).toBe('bigint');
    expect(projected.outputs[0].assets[0].amount).toBe(5n);
    expect(typeof projected.outputs[0].assets[0].amount).toBe('bigint');
    expect(projected.outputs[0].transactionId).toBe('tx-id-obj');
    expect(projected.outputs[0].index).toBe(0);

    expect(projected.outputs[1].boxId).toBe('out-obj-2');
    expect(projected.outputs[1].value).toBe(4n);
    expect(projected.outputs[1].assets[0].amount).toBe(6n);
    expect(projected.outputs[1].transactionId).toBe('tx-id-obj');
    expect(projected.outputs[1].index).toBe(1);
  });
});
