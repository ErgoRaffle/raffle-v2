import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { WinnerExtractor } from '../../lib/extractors/winner';
import { createDatabase } from '../utils.mock';
import { sampleWinnerBoxes } from '../mocked/winner.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createWinnerExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new WinnerExtractor(
      dataSource,
      'Winner',
      Network.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '1'.repeat(64),
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
      logger,
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const winnerExtractorTest = await createWinnerExtractorTest();

describe('WinnerExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample Winner box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Winner box data extracted correctly
     * @expected
     * - Winners should extract successfully
     */
    winnerExtractorTest(
      `should extract data from sample Winner box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleWinnerBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleWinnerBoxes[0].boxId,
          txId: sampleWinnerBoxes[0].transactionId,
          extractor: 'Winner',
          index: 1,
          raffleId:
            '1111111111111111111111111111111111111111111111111111111111111111',
          rewardPercent: 1000,
          serialized:
            'gI7OHBkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdz' +
            'D7AQQRA9AP5qDFAYCHpw4EAgUADiCPQKkvIoCUUuoLyBkzFfbD2rvLoN7+bNk/okRPxWT/Cjbb2i' +
            'A9IUOlGVeUHXo/pYh5WSHIZv9AdePubpkfDGLVAw==',
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
     * - check if Winner box
     * - result must be true
     * @expected
     * - Winners box checking result must be true
     */
    winnerExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleWinnerBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Winner box
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    winnerExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
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
     * - check if Winner box
     * - result must be false
     * @expected
     * - Winners box checking result must be false
     */
    winnerExtractorTest(
      `should result of hasData method be false by invalid box ticketTokenId`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
