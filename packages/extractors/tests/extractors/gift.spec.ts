import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { GiftExtractor } from '../../lib/extractors/gift';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleGiftBoxes } from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createGiftExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new GiftExtractor(
      dataSource,
      'Gift',
      Network.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '1'.repeat(64),
      '8f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
      logger,
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const giftExtractorTest = await createGiftExtractorTest();

describe('GiftExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample Gift box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Gift box data extracted correctly
     * @expected
     * - Gifts should extract successfully
     */
    giftExtractorTest(
      `should extract data from sample Gift box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleGiftBoxes[0].boxId,
          txId: sampleGiftBoxes[0].transactionId,
          extractor: 'Gift',
          winnerIndex: 1,
          donatorErgoTree:
            '0e200f318e1cd5860000282d016ef8b4ac1d06486b2e83be2777c86772b25886ecdc',
          raffleId:
            '1111111111111111111111111111111111111111111111111111111111111111',
          serialized:
            'gKPDRxkGAQEB0XMArtBiAo9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8K' +
            'AaL5RHkgRHarb/jF9GH9pW6h7t+C9LsdplgcOtKeSkXtCgMOIA8xjhzVhgAAKC0B' +
            'bvi0rB0GSGsug74nd8hncrJYhuzcBAIFgIenDi8UaZCp5ZvWBLKmQGpl3bETTGuB' +
            'zDRAaWfvmj2MsY/zAQ==',
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
     * - check if Gift box
     * - result must be true
     * @expected
     * - Gifts box checking result must be true
     */
    giftExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleGiftBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    giftExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftBoxes[0],
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
     * - check if Gift box
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    giftExtractorTest(
      `should result of hasData method be false by invalid box ticketTokenId`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
