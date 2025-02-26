import { describe, it, expect } from 'vitest';
import { Network, SByte, SColl } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';

import { GiftTokenRepoExtractor } from '../../lib/extractors/giftTokenRepo';
import { createDatabase } from '../utils.mock';
import {
  sampleGiftTokenRepo,
  sampleGiftTokenRepoExtractedData,
} from './mocked/giftTokenRepo.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createGiftTokenRepoExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new GiftTokenRepoExtractor(
      dataSource,
      'GiftTokenRepo',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createGiftTokenRepoExtractorTest();

describe('GiftTokenRepoExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample GiftTokenRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if GiftTokenRepo box data extracted correctly
     * @expected
     * - GiftTokenRepos should extract successfully
     */
    extractorTest(
      `should extract data from sample GiftTokenRepo box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftTokenRepo[0],
        );

        expect(extractedData).toEqual(sampleGiftTokenRepoExtractedData);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box
     * - result must be true
     * @expected
     * - GiftTokenRepos box checking result must be true
     */
    extractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleGiftTokenRepo[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftTokenRepo[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when R8 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box R8 is empty
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when R8 is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftTokenRepo[0],
          additionalRegisters: {
            ...sampleGiftTokenRepo[0].additionalRegisters,
            R8: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when R8 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box R8 length is not valid
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when R8 length is not valid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftTokenRepo[0],
          additionalRegisters: {
            ...sampleGiftTokenRepo[0].additionalRegisters,
            R8: SColl(SByte, '1234').toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
