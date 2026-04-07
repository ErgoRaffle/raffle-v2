import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SByte, SColl } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { RaffleDetailsExtractor } from '../../lib/extractors/raffleDetailsExtractor';
import { createDatabase } from '../utils.mock';
import {
  sampleRaffleDetailsBoxes,
  sampleRaffleDetailsExtractedData,
} from './mocked/raffleDetails.mock';

interface TestInterface {
  extractor: RaffleDetailsExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('RaffleDetailsExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new RaffleDetailsExtractor(dataSource, 'RaffleDetails', {
      type: ErgoNetworkType.Node,
      url: 'http://127.0.0.1/',
      address: boxErgoTree.toAddress(Network.Testnet).toString(),
    });
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from the sample RaffleDetails box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if RaffleDetails box data extracted correctly
     * @expected
     * - RaffleDetails should extract successfully
     */
    it<TestInterface>(`should successfully extract data from the sample RaffleDetails box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleRaffleDetailsBoxes[0],
      );

      expect(extractedData).toEqual(sampleRaffleDetailsExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when the box data is valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box
     * - result must be true
     * @expected
     * - RaffleDetails box checking result must be true
     */
    it<TestInterface>(`should return true when the box data is valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(
        sampleRaffleDetailsBoxes[0],
      );

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when the box address is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    it<TestInterface>(`should return false when the box address is invalid`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleDetailsBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the length of R4 is less than 3
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box R4 length is less than 3
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    it<TestInterface>(`should return false when the length of R4 is less than 3`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleDetailsBoxes[0],
        additionalRegisters: {
          ...sampleRaffleDetailsBoxes[0].additionalRegisters,
          R4: SColl(SColl(SByte), [
            Array.from(Buffer.from('abcdef')),
            Array.from(Buffer.from('abcdef')),
          ]).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the assets array length is greater than 1
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box R4 assets length is more than 1
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    it<TestInterface>(`should return false when the assets array length is greater than 1`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleDetailsBoxes[0],
        assets: [
          {
            tokenId: '1'.repeat(64),
            amount: 1n,
          },
          {
            tokenId: '2'.repeat(64),
            amount: 1n,
          },
        ],
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
