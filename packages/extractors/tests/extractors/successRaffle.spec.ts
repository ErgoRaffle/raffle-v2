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
      '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createSuccessRaffleExtractorTest();

describe('SuccessRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a valid SuccessRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if SuccessRaffle box data extracted correctly
     * @expected
     * - SuccessRaffles should extract successfully
     */
    extractorTest(
      `should successfully extract data from a valid SuccessRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleSuccessRaffleBoxes[0],
          sampleSuccessRaffleExtensions,
        );

        expect(extractedData).toEqual(sampleSuccessRaffleExtractedData);
      },
    );

    /**
     * @target should extract data from a SuccessRaffle box with empty extension data
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if SuccessRaffle box data extracted correctly
     * @expected
     * - SuccessRaffles should extract successfully
     */
    extractorTest(
      `should extract data from a SuccessRaffle box with empty extension data`,
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
     * @target should return true for valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box
     * - result must be true
     * @expected
     * - SuccessRaffles box checking result must be true
     */
    extractorTest(
      `should return true for valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleSuccessRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should return false for invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should return false for invalid box address`,
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
     * @target should return false for invalid assets length
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box by invalid assets length
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should return false for invalid assets length`,
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
     * @target should return false when the asset's licenseTokenId is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box first asset-id is not valid
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should return false when the asset's licenseTokenId is invalid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          assets: [
            {
              // invalid licenseTokenId
              tokenId: '1'.repeat(64),
              amount: 1n,
            },
            {
              tokenId: '2'.repeat(64),
              amount: 1n,
            },
          ],
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false when additionalRegisters is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should return false when additionalRegisters is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleSuccessRaffleBoxes[0],
          additionalRegisters: {},
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false when R8 is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SuccessRaffle box R8 is empty
     * - result must be false
     * @expected
     * - SuccessRaffles box checking result must be false
     */
    extractorTest(
      `should return false when R8 is empty`,
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
