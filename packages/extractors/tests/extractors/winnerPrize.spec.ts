import { describe, it, expect } from 'vitest';
import { Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { WinnerPrizeExtractor } from '../../lib/extractors/winnerPrize';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerPrizeBoxes,
  sampleWinnerPrizeExtractedData,
} from './mocked/winnerPrize.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createWinnerPrizeExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new WinnerPrizeExtractor(
      dataSource,
      'WinnerPrize',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createWinnerPrizeExtractorTest();

describe('WinnerPrizeExtractor', () => {
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
    extractorTest(
      `should successfully extract data from a sample WinnerPrize box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleWinnerPrizeBoxes[0],
        );

        expect(extractedData).toEqual(sampleWinnerPrizeExtractedData);
      },
    );
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
    extractorTest(
      `should return true when valid box data is provided`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleWinnerPrizeBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

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
    extractorTest(
      `should return false when an invalid box address is provided`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when R4 length is not valid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          additionalRegisters: {
            ...sampleWinnerPrizeBoxes[0].additionalRegisters,
            R4: SColl(SLong, []).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when R5 is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          additionalRegisters: {
            ...sampleWinnerPrizeBoxes[0].additionalRegisters,
            R5: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when R6 is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          additionalRegisters: {
            ...sampleWinnerPrizeBoxes[0].additionalRegisters,
            R6: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when assets are empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          assets: [],
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false when more than 3 assets are provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box owned more than 3 assets
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    extractorTest(
      `should return false when more than 3 assets are provided`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
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
