import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { RaffleDetailsExtractor } from '../../lib/extractors/raffleDetails';
import { createDatabase } from '../utils.mock';
import {
  sampleRaffleDetailsBoxes,
  sampleRaffleDetailsExtractedData,
} from '../mocked/raffleDetails.mock';
import { Picture } from '../../lib/entities';

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

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new RaffleDetailsExtractor(
      dataSource,
      'RaffleDetails',
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

const raffleDetailsExtractorTest = await createRaffleDetailsExtractorTest();

describe('RaffleDetailsExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample RaffleDetails box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if RaffleDetails box data extracted correctly
     * @expected
     * - RaffleDetailss should extract successfully
     */
    raffleDetailsExtractorTest(
      `should extract data from sample RaffleDetails box`,
      async ({ extractor, dataSource }) => {
        const extractedData = await extractor.extractBoxData(
          sampleRaffleDetailsBoxes[0],
        );

        expect(extractedData).toEqual(sampleRaffleDetailsExtractedData);

        await new Promise((r) => setTimeout(r, 100));
        expect(await dataSource.manager.count(Picture)).toEqual(3);
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
     * - RaffleDetailss box checking result must be true
     */
    raffleDetailsExtractorTest(
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
     * - RaffleDetailss box checking result must be false
     */
    raffleDetailsExtractorTest(
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
     * @target should result of hasData method be false by invalid ticketTokenId
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleDetails box
     * - result must be false
     * @expected
     * - RaffleDetailss box checking result must be false
     */
    raffleDetailsExtractorTest(
      `should result of hasData method be false by invalid box ticketTokenId`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleDetailsBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
