import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SColl, SLong } from '@fleet-sdk/core';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { WinnerPrizeExtractor } from '../../lib/extractors/winnerPrize';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerPrizeBoxes,
  sampleWinnerPrizeExtractedData,
} from './mocked/winnerPrize.mock';

interface TestInterface {
  extractor: WinnerPrizeExtractor;
  dataSource: DataSource;
  boxFalseErgoTree: ErgoTree;
}

describe('WinnerPrizeExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new WinnerPrizeExtractor(dataSource, 'WinnerPrize', {
      type: ErgoNetworkType.Node,
      url: 'http://127.0.0.1/',
      address: boxErgoTree.toAddress(Network.Testnet).toString(),
    });
    ctx.dataSource = dataSource;
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample WinnerPrize box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if WinnerPrize box data extracted correctly
     * @expected
     * - WinnerPrizes should extract successfully
     */
    it<TestInterface>(`should successfully extract data from a sample WinnerPrize box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleWinnerPrizeBoxes[0],
      );

      expect(extractedData).toEqual(sampleWinnerPrizeExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when valid box data is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be true
     * @expected
     * - WinnerPrizes box checking result must be true
     */
    it<TestInterface>(`should return true when valid box data is provided`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(
        sampleWinnerPrizeBoxes[0],
      );

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when an invalid box address is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    it<TestInterface>(`should return false when an invalid box address is provided`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerPrizeBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R4 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box R4 length is not valid
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    it<TestInterface>(`should return false when R4 length is not valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerPrizeBoxes[0],
        additionalRegisters: {
          ...sampleWinnerPrizeBoxes[0].additionalRegisters,
          R4: SColl(SLong, []).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R5 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box R5 is empty
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    it<TestInterface>(`should return false when R5 is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerPrizeBoxes[0],
        additionalRegisters: {
          ...sampleWinnerPrizeBoxes[0].additionalRegisters,
          R5: undefined,
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R6 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box R6 is empty
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    it<TestInterface>(`should return false when R6 is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerPrizeBoxes[0],
        additionalRegisters: {
          ...sampleWinnerPrizeBoxes[0].additionalRegisters,
          R6: undefined,
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when assets are empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box assets is empty
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    it<TestInterface>(`should return false when assets are empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleWinnerPrizeBoxes[0],
        assets: [],
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
