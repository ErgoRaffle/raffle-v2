import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network } from '@fleet-sdk/core';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { GiftRedeemExtractor } from '../../lib/extractors/giftRedeem';
import { createDatabase } from '../utils.mock';
import {
  sampleGiftRedeemBoxes,
  sampleGiftRedeemExtractedData,
} from './mocked/giftRedeem.mock';

interface TestInterface {
  extractor: GiftRedeemExtractor;
  dataSource: DataSource;
  boxFalseErgoTree: ErgoTree;
}

describe('GiftRedeemExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new GiftRedeemExtractor(
      dataSource,
      'GiftRedeem',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
    );
    ctx.dataSource = dataSource;
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample GiftRedeem box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if GiftRedeem box data extracted correctly
     * @expected
     * - GiftRedeems should extract successfully
     */
    it<TestInterface>(`should successfully extract data from a sample GiftRedeem box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleGiftRedeemBoxes[0],
      );

      expect(extractedData).toEqual(sampleGiftRedeemExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when valid box data is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box
     * - result must be true
     * @expected
     * - GiftRedeems box checking result must be true
     */
    it<TestInterface>(`should return true when valid box data is provided`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData(sampleGiftRedeemBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when an invalid box address is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when an invalid box address is provided`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftRedeemBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R6 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box R6 is empty
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when R6 is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftRedeemBoxes[0],
        additionalRegisters: {
          ...sampleGiftRedeemBoxes[0].additionalRegisters,
          R6: undefined,
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the asset's licenseTokenId is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box first asset-id is not valid
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when the asset's licenseTokenId is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftRedeemBoxes[0],
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
     * @target should return false when assets are empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box assets is empty
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when assets are empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftRedeemBoxes[0],
        assets: [],
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
