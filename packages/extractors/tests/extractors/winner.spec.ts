import { describe, it, expect } from 'vitest';
import { Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { WinnerExtractor } from '../../lib/extractors/winner';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerBoxes,
  sampleWinnerExtractedData,
} from './mocked/winner.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createWinnerExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new WinnerExtractor(
      dataSource,
      'Winner',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createWinnerExtractorTest();

describe('WinnerExtractor', () => {
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
    extractorTest(
      `should successfully extract data from the sample Winner box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleWinnerBoxes[0],
        );

        expect(extractedData).toEqual(sampleWinnerExtractedData);
      },
    );
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
    extractorTest(
      `should return true when the box data is valid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleWinnerBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

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
    extractorTest(
      `should return false when the box address is invalid`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when the assets array is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          assets: undefined,
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when the assets array length exceeds 2`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
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
      },
    );

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
    extractorTest(
      `should return false when the length of R4 is invalid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          additionalRegisters: {
            ...sampleWinnerBoxes[0].additionalRegisters,
            R4: SColl(SLong, [1n]).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when R5 is missing`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          additionalRegisters: {
            R4: sampleWinnerBoxes[0].additionalRegisters!.R4,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
