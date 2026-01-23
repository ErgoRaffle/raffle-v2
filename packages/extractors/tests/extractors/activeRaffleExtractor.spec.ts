import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { ActiveRaffleExtractor } from '../../lib/extractors/activeRaffleExtractor';
import { createDatabase } from '../utils.mock';
import {
  sampleActiveRaffleBoxes,
  sampleActiveRaffleExtractedData,
} from './mocked/activeRaffle.mock';

interface TestInterface {
  extractor: ActiveRaffleExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('ActiveRaffleExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new ActiveRaffleExtractor(
      dataSource,
      'ActiveRaffle',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
    );
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample ActiveRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if ActiveRaffle box data extracted correctly
     * @expected
     * - ActiveRaffles should extract successfully
     */
    it<TestInterface>(`should successfully extract data from a sample ActiveRaffle box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleActiveRaffleBoxes[0],
      );

      expect(extractedData).toEqual(sampleActiveRaffleExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when the box contains valid data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box
     * - result must be true
     * @expected
     * - ActiveRaffles box checking result must be true
     */
    it<TestInterface>(`should return true when the box contains valid data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData(sampleActiveRaffleBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when provided with an invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    it<TestInterface>(`should return false when provided with an invalid box address`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleActiveRaffleBoxes[0],
        // set invalid ergoTree
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the asset's licenseTokenId is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box first asset-id is not valid
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    it<TestInterface>(`should return false when the asset's licenseTokenId is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleActiveRaffleBoxes[0],
        assets: [
          {
            // invalid licenseTokenId
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

    /**
     * @target should return false when the assets list contains fewer than 2 item
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box assets length is less than 2
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    it<TestInterface>(`should return false when the assets list contains fewer than 2 item`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleActiveRaffleBoxes[0],
        assets: [
          {
            tokenId: sampleActiveRaffleBoxes[0].assets![0].tokenId,
            amount: 1n,
          },
        ],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the assets list contains more than 3 items
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box assets length is more than 3
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    it<TestInterface>(`should return false when the assets list contains more than 3 items`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleActiveRaffleBoxes[0],
        assets: [
          {
            tokenId: sampleActiveRaffleBoxes[0].assets![0].tokenId,
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
          {
            tokenId: '4'.repeat(64),
            amount: 1n,
          },
        ],
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
