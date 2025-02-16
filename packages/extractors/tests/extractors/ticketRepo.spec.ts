import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { TicketRepoExtractor } from '../../lib/extractors/ticketRepo';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleTicketRepo } from './data.mock';

const SAMPLE_RAFFLE_ID = 'F'.repeat(64);

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createTicketRepoExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new TicketRepoExtractor(
      dataSource,
      'TicketRepo',
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

const raffleServiceExtractorTest = await createTicketRepoExtractorTest();

describe('TicketRepoExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample TicketRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if TicketRepo box data extracted correctly
     * @expected
     * - TicketRepos should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample TicketRepo box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketRepo[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleTicketRepo[0].boxId,
          txId: sampleTicketRepo[0].transactionId,
          raffleId: SAMPLE_RAFFLE_ID,
          serialized:
            'wMOTBxkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7gJTr3AMDDg9UaWNrZXRSZXBvVG9r' +
            'ZW4OAA4BMBBQc4LOwiPc2T0UwTAJ3cuzWF0Tmiasnrl6KwvkxjbSAQ==',
          extractor: 'TicketRepo',
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
     * - check if TicketRepo box
     * - result must be true
     * @expected
     * - TicketRepos box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketRepo[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - TicketRepos box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketRepo[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
