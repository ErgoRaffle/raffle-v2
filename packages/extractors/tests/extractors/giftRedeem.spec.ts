import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { GiftRedeemExtractor } from '../../lib/extractors/giftRedeem';
import { createDatabase } from '../utils.mock';
import {
  sampleGiftRedeemBoxes,
  sampleGiftRedeemExtractedData,
} from './mocked/giftRedeem.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createGiftRedeemExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new GiftRedeemExtractor(
      dataSource,
      'GiftRedeem',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createGiftRedeemExtractorTest();

describe('GiftRedeemExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample GiftRedeem box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if GiftRedeem box data extracted correctly
     * @expected
     * - GiftRedeems should extract successfully
     */
    extractorTest(
      `should extract data from sample GiftRedeem box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftRedeemBoxes[0],
        );

        expect(extractedData).toEqual(sampleGiftRedeemExtractedData);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box
     * - result must be true
     * @expected
     * - GiftRedeems box checking result must be true
     */
    extractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleGiftRedeemBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftRedeemBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by R6 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box R6 is empty
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by R6 is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftRedeemBoxes[0],
          additionalRegisters: {
            ...sampleGiftRedeemBoxes[0].additionalRegisters,
            R6: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by empty assets
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box assets is empty
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by empty assets`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftRedeemBoxes[0],
          assets: undefined,
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by more than 3 assets
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftRedeem box owned more than 3 assets
     * - result must be false
     * @expected
     * - GiftRedeems box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by more than 3 assets`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftRedeemBoxes[0],
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
            {
              tokenId: '4'.repeat(64),
              amount: 1n,
            },
          ],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
