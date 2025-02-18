import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { WinnerPrizeExtractor } from '../../lib/extractors/winnerPrize';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleWinnerPrizeBoxes } from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createWinnerPrizeExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new WinnerPrizeExtractor(
      dataSource,
      'WinnerPrize',
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

const winnerPrizeExtractorTest = await createWinnerPrizeExtractorTest();

describe('WinnerPrizeExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample WinnerPrize box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if WinnerPrize box data extracted correctly
     * @expected
     * - WinnerPrizes should extract successfully
     */
    winnerPrizeExtractorTest(
      `should extract data from sample WinnerPrize box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleWinnerPrizeBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleWinnerPrizeBoxes[0].boxId,
          txId: sampleWinnerPrizeBoxes[0].transactionId,
          extractor: 'WinnerPrize',
          winnerTicketIndex: 16,
          winnerIndex: 1,
          unwrappedGiftCount: 0,
          giftCount: 1,
          raffleId:
            '1111111111111111111111111111111111111111111111111111111111111111',
          serialized:
            'wM7pdBkGAQEB0XMAtdBiAtKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7' +
            'AY9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8Kzw8DEQMgAoCHpw4EAgUA' +
            'Jt1Titvt7WLmVwNcbMAbUftlQT/4fgy8VnC28iJQX2IB',
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
     * - check if WinnerPrize box
     * - result must be true
     * @expected
     * - WinnerPrizes box checking result must be true
     */
    winnerPrizeExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleWinnerPrizeBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    winnerPrizeExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid TicketTokenId
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if WinnerPrize box
     * - result must be false
     * @expected
     * - WinnerPrizes box checking result must be false
     */
    winnerPrizeExtractorTest(
      `should result of hasData method be false by invalid box TicketTokenId`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleWinnerPrizeBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
