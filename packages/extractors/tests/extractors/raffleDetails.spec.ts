import { describe, it, expect } from 'vitest';
import { Network, SByte, SColl } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { RaffleDetailsExtractor } from '../../lib/extractors/raffleDetails';
import { createDatabase } from '../utils.mock';
import {
  sampleRaffleDetailsBoxes,
  sampleRaffleDetailsExtractedData,
} from './mocked/raffleDetails.mock';
import { PictureEntity } from '../../lib/entities';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createRaffleDetailsExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new RaffleDetailsExtractor(
      dataSource,
      'RaffleDetails',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createRaffleDetailsExtractorTest();

describe('RaffleDetailsExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample RaffleDetails box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if RaffleDetails box data extracted correctly
     * @expected
     * - RaffleDetails should extract successfully
     */
    extractorTest(
      `should extract data from sample RaffleDetails box`,
      async ({ extractor, dataSource }) => {
        const extractedData = await extractor.extractBoxData(
          sampleRaffleDetailsBoxes[0],
        );

        expect(extractedData).toEqual(sampleRaffleDetailsExtractedData);

        await new Promise((r) => setTimeout(r, 100));
        expect(await dataSource.manager.count(PictureEntity)).toEqual(3);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box
     * - result must be true
     * @expected
     * - RaffleDetails box checking result must be true
     */
    extractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleRaffleDetailsBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleDetailsBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when R4 length is less than 2
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box R4 length is less than 2
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when R4 length is less than 2`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleDetailsBoxes[0],
          additionalRegisters: {
            ...sampleRaffleDetailsBoxes[0].additionalRegisters,
            R4: SColl(SColl(SByte), [
              Array.from(Buffer.from('abcdef')),
            ]).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when assets length is more than 1
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box R4 assets length is more than 1
     * - result must be false
     * @expected
     * - RaffleDetails box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false when assets length is more than 1`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleDetailsBoxes[0],
          assets: [
            {
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
  });
});
