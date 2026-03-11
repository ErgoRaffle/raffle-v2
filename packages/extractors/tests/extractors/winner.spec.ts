import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { WinnerExtractor } from '../../lib/extractors/winner';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerBoxes,
  sampleWinnerExtractedData,
} from './mocked/winner.mock';

interface TestInterface {
  extractor: WinnerExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('WinnerExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new WinnerExtractor(dataSource, 'Winner', {
      type: ErgoNetworkType.Node,
      url: 'http://127.0.0.1/',
      address: boxErgoTree.toAddress(Network.Testnet).toString(),
    });
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from the sample Winner box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Winner box data extracted correctly
     * @expected
     * - Winners should extract successfully
     */
    it<TestInterface>(`should successfully extract data from the sample Winner box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleWinnerBoxes[0],
      );

      expect(extractedData).toEqual(sampleWinnerExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when the box data is valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box
     * - result must be true
     * @expected
     * - Winners box checking result must be true
     */
    it<TestInterface>(`should return true when the box data is valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(sampleWinnerBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when the box address is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    it<TestInterface>(`should return false when the box address is invalid`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the assets array is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if assets of the Winner box is empty
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    it<TestInterface>(`should return false when the assets array is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerBoxes[0],
        assets: [],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the assets array length exceeds 2
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if length of assets of the Winner box is more than 2
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    it<TestInterface>(`should return false when the assets array length exceeds 2`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerBoxes[0],
        assets: [
          {
            tokenId: '1'.repeat(64),
            amount: 1n,
          },
          {
            tokenId: '2'.repeat(64),
            amount: 1n,
          },
          {
            tokenId: '3'.repeat(64),
            amount: 1n,
          },
        ],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the length of R4 is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box R4 length is not valid
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    it<TestInterface>(`should return false when the length of R4 is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerBoxes[0],
        additionalRegisters: {
          ...sampleWinnerBoxes[0].additionalRegisters,
          R4: SColl(SLong, [1n]).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R5 is missing
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box R5 is missed
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    it<TestInterface>(`should return false when R5 is missing`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerBoxes[0],
        additionalRegisters: {
          R4: sampleWinnerBoxes[0].additionalRegisters!.R4,
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
