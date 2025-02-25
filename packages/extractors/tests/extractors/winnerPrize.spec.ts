import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { WinnerPrizeExtractor } from '../../lib/extractors/winnerPrize';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerPrizeBoxes,
  sampleWinnerPrizeExtractedData,
} from '../mocked/winnerPrize.mock';

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

const winnerPrizeExtractorTest = await createWinnerPrizeExtractorTest();

describe('WinnerPrizeExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample WinnerPrize box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if WinnerPrize box data extracted correctly
     * @expected
     * - WinnerPrizes should extract successfully
     */
    winnerPrizeExtractorTest(
      `should extract data from sample WinnerPrize box`,
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
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be true
     * @expected
     * - WinnerPrizes box checking result must be true
     */
    winnerPrizeExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleWinnerPrizeBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    winnerPrizeExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
