import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { ActiveRaffleExtractor } from '../../lib/extractors/activeRaffle';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleActiveRaffleBoxes } from './data.mock';

const SAMPLE_RAFFLE_ID = 'F'.repeat(64);

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createActiveRaffleExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new ActiveRaffleExtractor(
      dataSource,
      'ActiveRaffle',
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

const raffleServiceExtractorTest = await createActiveRaffleExtractorTest();

describe('ActiveRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample ActiveRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if ActiveRaffle box data extracted correctly
     * @expected
     * - ActiveRaffles should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample ActiveRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleActiveRaffleBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleActiveRaffleBoxes[0].boxId,
          txId: sampleActiveRaffleBoxes[0].transactionId,
          serialized:
            'wOzzjgQZBgEBAdFzAK7QYgJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk+' +
            'TgHSneql2Alf4wkwhFQSsJPSunW0jjHCXf+fBaZzlncw+/6T69wDBBEHkAPIAcgB' +
            'gNrECdAP5qDFAYCHpw4aAyDttmLQCbFoEqK9L/0bkmuWXWIECt6SQf3EuII3qZ3+' +
            'viC4lPrvb5RGR9rJMNGVaAgIo/18ZgMIGW8qD06U3IwPqCDSF8gQnju1U1yW0Eh1' +
            'ZJ79sHshG1m9DRxiaBuqi44PEQQCBQA229ogPSFDpRlXlB16P6WIeVkhyGb/QHXj' +
            '7m6ZHwxi1QA=',
          raffleId: SAMPLE_RAFFLE_ID,
          extractor: 'ActiveRaffle',
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
     * - check if ActiveRaffle box
     * - result must be true
     * @expected
     * - ActiveRaffles box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleActiveRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if ActiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - ActiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleActiveRaffleBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
