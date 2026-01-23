import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SByte, SColl } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { GiftTokenRepoExtractor } from '../../lib';
import { createDatabase } from '../utils.mock';
import {
  sampleGiftTokenRepo,
  sampleGiftTokenRepoExtractedData,
} from './mocked/giftTokenRepo.mock';

interface TestInterface {
  extractor: GiftTokenRepoExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('GiftTokenRepoExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new GiftTokenRepoExtractor(
      dataSource,
      'GiftTokenRepo',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    );
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample GiftTokenRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if GiftTokenRepo box data extracted correctly
     * @expected
     * - GiftTokenRepos should extract successfully
     */
    it<TestInterface>(`should successfully extract data from a sample GiftTokenRepo box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleGiftTokenRepo[0],
      );

      expect(extractedData).toEqual(sampleGiftTokenRepoExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when the box contains valid data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box
     * - result must be true
     * @expected
     * - GiftTokenRepos box checking result must be true
     */
    it<TestInterface>(`should return true when the box contains valid data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData(sampleGiftTokenRepo[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when provided with an invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    it<TestInterface>(`should return false when provided with an invalid box address`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftTokenRepo[0],
        // set invalid ergoTree
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R8 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box R8 is empty
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    it<TestInterface>(`should return false when R8 is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftTokenRepo[0],
        additionalRegisters: {
          ...sampleGiftTokenRepo[0].additionalRegisters,
          R8: undefined,
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R8 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box R8 length is not valid
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    it<TestInterface>(`should return false when R8 length is not valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleGiftTokenRepo[0],
        additionalRegisters: {
          ...sampleGiftTokenRepo[0].additionalRegisters,
          R8: SColl(SByte, '1234').toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
