import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { GiftExtractor } from '../../lib/extractors/gift';
import { createDatabase } from '../utils.mock';
import {
  sampleGiftBoxes,
  sampleGiftExtension,
  sampleGiftExtractedData,
} from './mocked/gift.mock';

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
     * @target should successfully extract data from a sample gift box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Gift box data extracted correctly
     * @expected
     * - Gifts should extract successfully
     */
    extractorTest(
      `should successfully extract data from a sample gift box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftBoxes[0],
          sampleGiftExtension,
          {
            raffleId:
              'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
          },
        );

        expect(extractedData).toEqual(sampleGiftExtractedData);
      },
    );

    /**
     * @target should fail extracting data from a sample gift box and by empty extension value
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Gift box data extracted correctly
     * @expected
     * - Gifts should extract successfully
     */
    extractorTest(
      `should fail extracting data from a sample gift box and by empty extension value`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleGiftBoxes[0],
          [],
          {
            raffleId:
              'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
          },
        );

        expect(extractedData).toEqual(undefined);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should return true with valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box
     * - result must be true
     * @expected
     * - Gifts box checking result must be true
     */
    extractorTest(
      `should return true with valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleGiftBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should return false with an invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    extractorTest(
      `should return false with an invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleGiftBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false with an empty R5 value
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Gift box owned empty R5
     * - result must be false
     * @expected
     * - Gifts box checking result must be false
     */
    extractorTest(
      `should return false with an empty R5 value`,
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
