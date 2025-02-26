import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';

import { ActiveRaffleExtractor } from '../../lib/extractors/activeRaffle';
import { createDatabase } from '../utils.mock';
import {
  sampleActiveRaffleBoxes,
  sampleActiveRaffleExtractedData,
} from './mocked/activeRaffle.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createActiveRaffleExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new ActiveRaffleExtractor(
      dataSource,
      'ActiveRaffle',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createActiveRaffleExtractorTest();

describe('ActiveRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample ActiveRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if ActiveRaffle box data extracted correctly
     * @expected
     * - ActiveRaffles should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample ActiveRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleActiveRaffleBoxes[0],
        );

        expect(extractedData).toEqual(sampleActiveRaffleExtractedData);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box
     * - result must be true
     * @expected
     * - ActiveRaffles box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleActiveRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleActiveRaffleBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
