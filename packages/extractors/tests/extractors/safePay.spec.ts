import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import { SafePayExtractor } from '../../lib/extractors/safePay';
import { createDatabase } from '../utils.mock';
import * as safePayMocks from './mocked/safePay.mock';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { TxExtra } from '@rosen-bridge/abstract-extractor';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createSafePayExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');
  const serviceErgoTree = compile('{sigmaProp(HEIGHT > 1);}');
  const successRaffleErgoTree = compile('{sigmaProp(HEIGHT > 2);}');
  const winnerPrizeErgoTree = compile('{sigmaProp(HEIGHT > 3);}');
  const winnerErgoTree = compile('{sigmaProp(HEIGHT > 4);}');
  const ticketRedeemErgoTree = compile('{sigmaProp(HEIGHT > 5);}');

  return it.extend({
    extractor: new SafePayExtractor(
      dataSource,
      'SafePay',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      serviceErgoTree.toAddress(Network.Testnet).toString(),
      successRaffleErgoTree.toAddress(Network.Testnet).toString(),
      winnerPrizeErgoTree.toAddress(Network.Testnet).toString(),
      winnerErgoTree.toAddress(Network.Testnet).toString(),
      ticketRedeemErgoTree.toAddress(Network.Testnet).toString(),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
    serviceErgoTree: serviceErgoTree,
    successRaffleErgoTree: successRaffleErgoTree,
    winnerPrizeErgoTree: winnerPrizeErgoTree,
    winnerErgoTree: winnerErgoTree,
    ticketRedeemErgoTree: ticketRedeemErgoTree,
  });
};

const extractorTest = await createSafePayExtractorTest();

describe('SafePayExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from a sample SafePay box successfully
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if SafePay box data extracted correctly
     * @expected
     * - SafePays should extract successfully
     */
    extractorTest(
      `should extract data from a sample SafePay box successfully`,
      async ({ extractor }) => {
        const extractedData = extractor.extractBoxData(
          safePayMocks.sampleSafePayBoxes[0],
          [],
        );

        expect(extractedData).toEqual(safePayMocks.sampleSafePayExtractedData);
      },
    );
  });

  describe('getTransactionExtraData', () => {
    /**
     * @target should return value be equals to the expected value by different transactions successfully
     * @dependencies
     * @scenario
     * - call the getTransactionExtraData functions
     * - check if the extractBoxData call correctly
     * - result must be false
     * @expected
     * - SafePays box checking result must be false
     */
    extractorTest(
      `should return value be equals to the expected value by different transactions successfully`,
      async ({ extractor }) => {
        for (const txData of safePayMocks.sampleSafePayTxs) {
          const txExtraData: TxExtra = extractor.getTransactionExtraData(
            txData.tx,
          );
          expect(txExtraData.txType).toEqual(txData.txType);
        }
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should return true for valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SafePay box
     * - result must be true
     * @expected
     * - SafePays box checking result must be true
     */
    extractorTest(
      `should return true for valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(
          safePayMocks.sampleSafePayBoxes[0],
        );

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should return false for invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if SafePay box ergoTree is valid
     * - result must be false
     * @expected
     * - SafePays box checking result must be false
     */
    extractorTest(
      `should return false for invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...safePayMocks.sampleSafePayBoxes[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
