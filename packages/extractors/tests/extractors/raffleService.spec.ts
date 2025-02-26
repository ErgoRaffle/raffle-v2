import { describe, it, expect } from 'vitest';
import { Network, SByte, SColl } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { RaffleServiceExtractor } from '../../lib/extractors/raffleService';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleRaffleServiceBoxes } from '../mocked/raffleService.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createRaffleServiceExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new RaffleServiceExtractor(
      dataSource,
      'RaffleService',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '1'.repeat(64),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createRaffleServiceExtractorTest();

describe('RaffleServiceExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample RaffleService box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if RaffleService box data extracted correctly
     * @expected
     * - RaffleServices should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample RaffleService box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleRaffleServiceBoxes[0],
        );

        expect(extractedData).toMatchObject({
          boxId: sampleRaffleServiceBoxes[0].boxId,
          txId: sampleRaffleServiceBoxes[0].transactionId,
          serviceFeePercent: 100,
          implementerFeePercent: 100,
          creationFee: 800n,
        });
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleService box
     * - result must be true
     * @expected
     * - RaffleServices box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleRaffleServiceBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid serviceNFT
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box serviceNFT`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when the R4 missed
     * @dependencies
     * @scenario
     * - call the hasData functions by empty additionalRegisters
     * - check RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false when the R4 missed`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          additionalRegisters: {},
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false when the R4 value length is not equal to 4
     * @dependencies
     * @scenario
     * - call the hasData functions by empty additionalRegisters
     * - check RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false when the R4 value length is not equal to 4`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          additionalRegisters: {
            R4: SColl(SByte, [1, 2, 3]).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
