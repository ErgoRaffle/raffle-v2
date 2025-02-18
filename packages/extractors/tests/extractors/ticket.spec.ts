import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { TicketExtractor } from '../../lib/extractors/ticket';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleTicketBoxes } from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createTicketExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new TicketExtractor(
      dataSource,
      'Ticket',
      Network.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '1'.repeat(64),
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
      logger,
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const ticketExtractorTest = await createTicketExtractorTest();

describe('TicketExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample Ticket box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Ticket box data extracted correctly
     * @expected
     * - Tickets should extract successfully
     */
    ticketExtractorTest(
      `should extract data from sample Ticket box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleTicketBoxes[0].boxId,
          txId: sampleTicketBoxes[0].transactionId,
          extractor: 'Ticket',
          rangeStart: 0n,
          rangeEnd: 100n,
          donatorErgoTree:
            '0e205b1a88f00bc6013cc6506883b23aabba148346ca6fa64e4e3573592f4e3ad854',
          raffleId:
            '1111111111111111111111111111111111111111111111111111111111111111',
          serialized:
            'wMq6FRkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7' +
            'ZAIOIFsaiPALxgE8xlBog7I6q7oUg0bKb6ZOTjVzWS9OOthUEQQAyAGA2sQJ5qDF' +
            'AdlhpLZhs+bZQXrdi2fTYoiGC06QWr1HgEpEJyNy2KP1AQ==',
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
     * - check if Ticket box
     * - result must be true
     * @expected
     * - Tickets box checking result must be true
     */
    ticketExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    ticketExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid ticketTokenId
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    ticketExtractorTest(
      `should result of hasData method be false by invalid box ticketTokenId`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
