import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { WinnerExtractor } from '../../lib/extractors/winner';
import { createDatabase } from '../utils.mock';
import {
  sampleWinnerBoxes,
  sampleWinnerExtractedData,
} from '../mocked/winner.mock';

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

const winnerExtractorTest = await createWinnerExtractorTest();

describe('WinnerExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample Winner box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Winner box data extracted correctly
     * @expected
     * - Winners should extract successfully
     */
    winnerExtractorTest(
      `should extract data from sample Winner box`,
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
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box
     * - result must be true
     * @expected
     * - Winners box checking result must be true
     */
    winnerExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleWinnerBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    winnerExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
