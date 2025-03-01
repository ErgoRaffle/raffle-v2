import { describe, it, expect } from 'vitest';
import { Network, SInt } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { GiftExtractor } from '../../lib/extractors/gift';
import { createDatabase } from '../utils.mock';
import { sampleGiftBoxes, sampleGiftExtractedData } from './mocked/gift.mock';

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
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      logger,
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createGiftExtractorTest();

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
    extractorTest(
      `should extract data from sample Gift box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftBoxes[0],
          undefined,
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        );

        expect(extractedData).toEqual(sampleGiftExtractedData);
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
    extractorTest(
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
    extractorTest(
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
     * @target should result of hasData method be false by invalid R4 value
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box owned invalid R4 value
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid R4 value`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftBoxes[0],
          additionalRegisters: {
            ...sampleGiftBoxes[0].additionalRegisters,
            R4: SInt(1).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by empty R5
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box owned empty R5
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by empty R5`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftBoxes[0],
          additionalRegisters: {
            ...sampleGiftBoxes[0].additionalRegisters,
            R5: undefined,
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
