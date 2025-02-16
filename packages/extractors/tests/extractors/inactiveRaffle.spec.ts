import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { InactiveRaffleExtractor } from '../../lib/extractors/inactiveRaffle';
import { createDatabase } from '../utilsFunctions.mock';
import {
  sampleInactiveRaffleBoxes,
  serviceWallet,
  implementerWallet,
  creatorWallet,
} from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createInactiveRaffleExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new InactiveRaffleExtractor(
      dataSource,
      'InactiveRaffle',
      Network.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '2'.repeat(64),
      serviceWallet.ergoTree.toString(),
      implementerWallet.ergoTree.toString(),
      creatorWallet.ergoTree.toString(),
      [200, 200, 200, 200, 200].toString(),
      logger,
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createInactiveRaffleExtractorTest();

describe('InactiveRaffleExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample InactiveRaffle box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if InactiveRaffle box data extracted correctly
     * @expected
     * - InactiveRaffles should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample InactiveRaffle box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleInactiveRaffleBoxes[0],
        );

        expect(extractedData).toEqual({
          boxId: sampleInactiveRaffleBoxes[0].boxId,
          txId: sampleInactiveRaffleBoxes[0].transactionId,
          serialized:
            'wIQ9GQYBAQHRcwBkASIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
            'AQURB5ADyAHIAcCaDICJetAPsOoBGgMgsyiS4NtDjteZCvL2Fhr1TQ7+2cWgkoCs732QLXNLM/' +
            'AgdB4lw40FQMbZocnIcAh7X0IaZt6MSmb6yE1cDfJZGHogXH9xiMrF43Y0Ndj/FhjuAMMPnqgU' +
            '064mYgVHFiAwCpIaAgRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uGgIgMzMzMzMzMzMzMzMzMz' +
            'MzMzMzMzMzMzMzMzMzMzMzMzMge8trSPEi5LKmV26w9zy4pvrbGAREDHFDs8o74DhqB5gECgEB' +
            'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
          creatorErgoTree: creatorWallet.ergoTree.toString(),
          implementorErgoTree: implementerWallet.ergoTree.toString(),
          serviceErgoTree: serviceWallet.ergoTree.toString(),
          deadline: 1000,
          extractor: 'InactiveRaffle',
          goal: 1000000n,
          implementerFeePercent: 100,
          serviceFeePercent: 100,
          ticketPrice: 100000n,
          txFee: 15000n,
          winnersPercent: 200,
          winnersPercentList: [200, 200, 200, 200, 200].toString(),
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
     * - check if InactiveRaffle box
     * - result must be true
     * @expected
     * - InactiveRaffles box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleInactiveRaffleBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid amount of tokens
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box first token is Raffle-License token
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid amount of tokens`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          assets: [
            {
              // set invalid raffle-license token id
              tokenId: '3'.repeat(64),
              amount: 1n,
            },
          ],
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid amount of tokens
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box tokens amount is valid
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid amount of tokens`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleInactiveRaffleBoxes[0],
          assets: [
            {
              tokenId: '2'.repeat(64),
              amount: 1n,
            },
            {
              tokenId: '3'.repeat(64),
              amount: 100n,
            },
            // add one more extra token
            {
              tokenId: '4'.repeat(64),
              amount: 100n,
            },
          ],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
