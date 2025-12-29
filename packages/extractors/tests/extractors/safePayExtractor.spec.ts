import { compile } from '@fleet-sdk/compiler';
import { Network } from '@fleet-sdk/core';
import { TxExtra } from '@rosen-bridge/abstract-extractor';
import {
  ErgoNetworkType,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect } from 'vitest';

import { SafePayExtractor } from '../../lib/extractors/safePayExtractor';
import { createDatabase } from '../utils.mock';
import * as safePayMocks from './mocked/safePay.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createSafePayExtractorTest = async () => {
  const dataSource = await createDatabase();
  const safePayAddress =
    'ZqMQQYoChK43wLcSN4mFHZNRnuby8vkSnpwgEZ2td3hXWecWe5v2MYvPoR6MRpQhXiZKRQEV85h7ZaxzUUQywYchpL4';
  const boxErgoTree = compile('{sigmaProp(true);}')
    .toAddress(Network.Testnet)
    .toString();
  const successRaffleErgoTree = compile('{sigmaProp(HEIGHT > 1);}');
  const successRaffleAddress = successRaffleErgoTree
    .toAddress(Network.Testnet)
    .toString();

  return it.extend({
    extractor: new SafePayExtractor(
      dataSource,
      'SafePay',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      safePayAddress,
      successRaffleAddress,
    ),
    successRaffleErgoTree,
    boxErgoTree,
  });
};

const extractorTest = await createSafePayExtractorTest();

describe('SafePayExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from a service fee box in fee payment transaction
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check safe pay extracted data
     * @expected
     * - to extract recipient from the first box (active raffle) input extension
     */
    extractorTest(
      `should extract data from a service fee box in fee payment transaction`,
      async ({ extractor, successRaffleErgoTree }) => {
        const extractedData = extractor.extractBoxData(
          safePayMocks.feePaymentTx.outputs[1],
          safePayMocks.feePaymentTx.inputs.map(
            (input) => input.extension as InputExtension,
          ),
          {
            firstOutputErgoTree: successRaffleErgoTree.toHex(),
          },
        );

        expect(extractedData).toEqual(
          safePayMocks.feePaymentSafePayExtractedData[0],
        );
      },
    );

    /**
     * @target should extract data from a implementer fee box in fee payment transaction
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check safe pay extracted data
     * @expected
     * - to extract recipient from the first input box (active raffle) extension
     */
    extractorTest(
      `should extract data from a implementer fee box in fee payment transaction`,
      async ({ extractor, successRaffleErgoTree }) => {
        const extractedData = extractor.extractBoxData(
          safePayMocks.feePaymentTx.outputs[2],
          safePayMocks.feePaymentTx.inputs.map(
            (input) => input.extension as InputExtension,
          ),
          { firstOutputErgoTree: successRaffleErgoTree.toHex() },
        );

        expect(extractedData).toEqual(
          safePayMocks.feePaymentSafePayExtractedData[1],
        );
      },
    );

    /**
     * @target should extract data from a final prize transaction
     * @dependencies
     * @scenario
     * - call the extractBoxData function with final prize box
     * - check safe pay extracted data
     * @expected
     * - to extract recipient from the second input box extension
     */
    extractorTest(
      `should extract data from a sample safe pay creation transaction`,
      async ({ extractor }) => {
        const extractedData = extractor.extractBoxData(
          safePayMocks.finalPrizeTx.outputs[0],
          safePayMocks.finalPrizeTx.inputs.map(
            (input) => input.extension as InputExtension,
          ),
          { firstOutputErgoTree: '' },
        );

        expect(extractedData).toEqual(safePayMocks.finalPrizeExtractedData);
      },
    );

    /**
     * @target should extract data from a sample safe pay creation transaction
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check safe pay extracted data
     * @expected
     * - to extract recipient from the second input box extension
     */
    extractorTest(
      `should extract data from a sample safe pay creation transaction`,
      async ({ extractor }) => {
        const extractedData = extractor.extractBoxData(
          safePayMocks.sampleSafePayTx.outputs[1],
          safePayMocks.sampleSafePayTx.inputs.map(
            (input) => input.extension as InputExtension,
          ),
          { firstOutputErgoTree: '' },
        );

        expect(extractedData).toEqual(safePayMocks.sampleSafePayExtractedData);
      },
    );
  });

  describe('getTransactionExtraData', () => {
    /**
     * @target should return first output ergo tree as extra data
     * @dependencies
     * @scenario
     * - call the getTransactionExtraData function with mocked tx
     * @expected
     * - to return first output ergo tree
     */
    extractorTest(
      `should return first output ergo tree as extra data`,
      async ({ extractor }) => {
        const tx = safePayMocks.sampleSafePayTx;
        const txExtraData: TxExtra = extractor.getTransactionExtraData(tx);
        expect(txExtraData.firstOutputErgoTree).toEqual(tx.outputs[0].ergoTree);
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
          safePayMocks.sampleSafePayTx.outputs[1],
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
      async ({ extractor, boxErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...safePayMocks.sampleSafePayTx.outputs[1],
          // set invalid ergoTree
          ergoTree: boxErgoTree,
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
