import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { GiftTokenRepoExtractor } from '../../lib/extractors/giftTokenRepo';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleGiftTokenRepo } from './data.mock';

const SAMPLE_RAFFLE_ID = 'F'.repeat(64);

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createGiftTokenRepoExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new GiftTokenRepoExtractor(
      dataSource,
      'GiftTokenRepo',
      Network.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      SAMPLE_RAFFLE_ID,
      logger,
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createGiftTokenRepoExtractorTest();

describe('GiftTokenRepoExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample GiftTokenRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if GiftTokenRepo box data extracted correctly
     * @expected
     * - GiftTokenRepos should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample GiftTokenRepo box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftTokenRepo[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleGiftTokenRepo[0].boxId,
          txId: sampleGiftTokenRepo[0].transactionId,
          raffleId: SAMPLE_RAFFLE_ID,
          serialized:
            'wMOTBxkGAQEB0XMArtBiAY9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8K0A8GEAECEAEEEAEGEQKgH4CHpw4OINKd6qXYCV' +
            '/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7EAICAjbb2iA9IUOlGVeUHXo/pYh5WSHIZv9AdePubpkfDGLVAg==',
          extractor: 'GiftTokenRepo',
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
     * - check if GiftTokenRepo box
     * - result must be true
     * @expected
     * - GiftTokenRepos box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleGiftTokenRepo[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if GiftTokenRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - GiftTokenRepos box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftTokenRepo[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
