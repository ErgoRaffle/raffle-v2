import { describe, it, expect } from 'vitest';
import { Network, SByte, SColl, SLong } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import { InactiveRaffleExtractor } from '../../lib/extractors/inactiveRaffle';
import { createDatabase } from '../utils.mock';
import { serviceWallet } from '../utils.mock';
import {
  sampleInactiveRaffleBoxes,
  sampleInactiveRaffleExtensions,
  sampleInactiveRaffleExtractedData,
  sampleInactiveRaffleExtractedDataForEmptyExtension,
} from './mocked/inactiveRaffle.mock';

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

const extractorTest = await createInactiveRaffleExtractorTest();

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
    extractorTest(
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
     * @target should extract data from sample InactiveRaffle box with empty extension data
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if InactiveRaffle box data extracted correctly
     * @expected
     * - InactiveRaffles should extract successfully
     */
    extractorTest(
      `should extract data from sample InactiveRaffle box with empty extension data`,
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
     * @target should returns true with valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box
     * - result must be true
     * @expected
     * - InactiveRaffles box checking result must be true
     */
    extractorTest(
      `should returns true with valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleInactiveRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should returns false with invalid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    extractorTest(
      `should returns false with invalid box data`,
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
     * @target should returns false when license token-id is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box first token is Raffle-License token
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    extractorTest(
      `should returns false when license token-id is invalid`,
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

    /**
     * @target should returns false when additionalRegisters is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    extractorTest(
      `should returns false when additionalRegisters is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          additionalRegisters: undefined,
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should returns false when R4 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    extractorTest(
      `should returns false when R4 length is not valid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          additionalRegisters: {
            ...sampleInactiveRaffleBoxes[0].additionalRegisters,
            R4: SColl(SLong, []).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should returns false when R7 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    extractorTest(
      `should returns false when R7 length is not valid`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          additionalRegisters: {
            ...sampleInactiveRaffleBoxes[0].additionalRegisters,
            R7: SColl(SColl(SByte), []).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
