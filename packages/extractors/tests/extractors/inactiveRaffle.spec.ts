import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import { InactiveRaffleExtractor } from '../../lib/extractors/inactiveRaffle';
import { createDatabase } from '../utils.mock';
import { serviceWallet } from '../utils.mock';
import {
  sampleInactiveRaffleBoxes,
  sampleInactiveRaffleExtensions,
  sampleInactiveRaffleExtractedData,
  sampleInactiveRaffleExtractedDataForEmptyExtension,
} from '../mocked/inactiveRaffle.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createInactiveRaffleExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new InactiveRaffleExtractor(
      dataSource,
      'InactiveRaffle',
      'http://127.0.0.1/',
      boxErgoTree.toAddress(Network.Testnet).toString(),
      serviceWallet.ergoTree.toString(),
      '2'.repeat(64),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createInactiveRaffleExtractorTest();

describe('InactiveRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample InactiveRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if InactiveRaffle box data extracted correctly
     * @expected
     * - InactiveRaffles should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample InactiveRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleInactiveRaffleBoxes[0],
          sampleInactiveRaffleExtensions,
        );

        expect(extractedData).toEqual(sampleInactiveRaffleExtractedData);
      },
    );

    /**
     * @target should extract data from sample InactiveRaffle box and by empty extension data
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if InactiveRaffle box data extracted correctly
     * @expected
     * - InactiveRaffles should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample InactiveRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleInactiveRaffleBoxes[0],
          [],
        );

        expect(extractedData).toEqual(
          sampleInactiveRaffleExtractedDataForEmptyExtension,
        );
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box
     * - result must be true
     * @expected
     * - InactiveRaffles box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleInactiveRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid license token-id
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box first token is Raffle-License token
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid license token-id`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          assets: [
            {
              // set invalid raffle-license token id
              tokenId: '3'.repeat(64),
              amount: 1n,
            },
          ],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
