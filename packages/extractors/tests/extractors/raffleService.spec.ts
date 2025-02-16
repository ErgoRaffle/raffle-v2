import { describe, it, expect } from 'vitest';
import { NetworkPrefix } from 'ergo-lib-wasm-nodejs';
import { Network } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { RaffleServiceExtractor } from '../../lib/extractors/raffleService';
import { createDatabase } from '../utilsFunctions.mock';
import { sampleRaffleServiceBoxes } from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createRaffleServiceExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    extractor: new RaffleServiceExtractor(
      dataSource,
      'RaffleService',
      NetworkPrefix.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '1'.repeat(64),
      logger,
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createRaffleServiceExtractorTest();

describe('RaffleServiceExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample RaffleService box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if RaffleService box data extracted correctly
     * @expected
     * - RaffleServices should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample RaffleService box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleRaffleServiceBoxes[0],
        );

        expect(extractedData).toMatchObject({
          boxId: sampleRaffleServiceBoxes[0].boxId,
          txId: sampleRaffleServiceBoxes[0].transactionId,
          serialized:
            'wIQ9GQYBAQHRcwBkAhERERERERERERERERERERERERERERERERERERERERERAS' +
            'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiwIQ9AhEEyAHIAcAM4KcSDiAf3qYMD6+' +
            '4oyUk249AGdtnsSpixJ9LlcFLeJAt4uzUvAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
          serviceFeePercent: '100',
          implementerFeePercent: '100',
          creationFee: '800',
          extractor: 'RaffleService',
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
     * - check if RaffleService box
     * - result must be true
     * @expected
     * - RaffleServices box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          sampleRaffleServiceBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid serviceNFT
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box serviceNFT`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleRaffleServiceBoxes[0],
          assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
