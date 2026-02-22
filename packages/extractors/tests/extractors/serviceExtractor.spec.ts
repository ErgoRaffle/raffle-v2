import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SByte, SColl } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { ServiceExtractor } from '../../lib/extractors/serviceExtractor';
import { createDatabase } from '../utils.mock';
import { sampleRaffleServiceBoxes } from './mocked/raffleService.mock';

interface TestInterface {
  extractor: ServiceExtractor;
  boxFalseErgoTree: ErgoTree;
}

beforeEach<TestInterface>(async (ctx) => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  ctx.extractor = new ServiceExtractor(
    dataSource,
    'RaffleService',
    {
      type: ErgoNetworkType.Node,
      url: 'http://127.0.0.1/',
      address: boxErgoTree.toAddress(Network.Testnet).toString(),
    },
    '1'.repeat(64),
  );
  ctx.boxFalseErgoTree = boxFalseErgoTree;
});

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
    it<TestInterface>(`should extract data from sample RaffleService box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleRaffleServiceBoxes[0],
      );

      expect(extractedData).toMatchObject({
        identifier: sampleRaffleServiceBoxes[0].boxId,
        txId: sampleRaffleServiceBoxes[0].transactionId,
        serviceFeePercent: 100,
        implementerFeePercent: 100,
        creationFee: 800n,
      });
    });
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
    it<TestInterface>(`should result of hasData method be true by valid box data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(
        sampleRaffleServiceBoxes[0],
      );

      expect(extractedData).toBeTruthy();
    });

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
    it<TestInterface>(`should result of hasData method be false by invalid box address`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleServiceBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

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
    it<TestInterface>(`should result of hasData method be false by invalid box serviceNFT`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleServiceBoxes[0],
        assets: [{ tokenId: '0'.repeat(64), amount: 1n }],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should result of hasData method be false when the R4 missed
     * @dependencies
     * @scenario
     * - call the hasData functions by empty additionalRegisters
     * - check RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    it<TestInterface>(`should result of hasData method be false when the R4 missed`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleServiceBoxes[0],
        additionalRegisters: {},
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should result of hasData method be false when the R4 value length is not equal to 4
     * @dependencies
     * @scenario
     * - call the hasData functions by empty additionalRegisters
     * - check RaffleService box
     * - result must be false
     * @expected
     * - RaffleServices box checking result must be false
     */
    it<TestInterface>(`should result of hasData method be false when the R4 value length is not equal to 4`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleRaffleServiceBoxes[0],
        additionalRegisters: {
          R4: SColl(SByte, [1, 2, 3]).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
