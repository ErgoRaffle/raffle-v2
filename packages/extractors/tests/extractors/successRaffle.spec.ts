import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import { SuccessRaffleExtractor } from '../../lib/extractors/successRaffle';
import { createDatabase } from '../utils.mock';
import {
  sampleSuccessRaffleBoxes,
  sampleSuccessRaffleExtensions,
  sampleSuccessRaffleExtractedData,
  sampleSuccessRaffleExtractedDataForEmptyExtension,
} from './mocked/successRaffle.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createSuccessRaffleExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new SuccessRaffleExtractor(
      dataSource,
      'SuccessRaffle',
      'http://127.0.0.1/',
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createSuccessRaffleExtractorTest();

describe('SuccessRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample SuccessRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if SuccessRaffle box data extracted correctly
     * @expected
     * - SuccessRaffles should extract successfully
     */
    extractorTest(
      `should extract data from sample SuccessRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleSuccessRaffleBoxes[0],
          sampleSuccessRaffleExtensions,
        );

        expect(extractedData).toEqual(sampleSuccessRaffleExtractedData);
      },
    );

    /**
     * @target should extract data from sample SuccessRaffle box and by empty extension data
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if SuccessRaffle box data extracted correctly
     * @expected
     * - SuccessRaffles should extract successfully
     */
    extractorTest(
      `should extract data from sample SuccessRaffle box and by empty extension data`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleSuccessRaffleBoxes[0],
          [],
        );

        expect(extractedData).toEqual(
          sampleSuccessRaffleExtractedDataForEmptyExtension,
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
     * - check if SuccessRaffle box
     * - result must be true
     * @expected
     * - SuccessRaffles box checking result must be true
     */
    extractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleSuccessRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid assets length
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box by invalid assets length
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid assets length`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          assets: [
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
     * @target should result of hasData method be false when additionalRegisters is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when additionalRegisters is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          additionalRegisters: undefined,
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when R8 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box R8 is empty
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when R8 is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          additionalRegisters: {
            ...sampleSuccessRaffleBoxes[0].additionalRegisters,
            R8: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
