import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SByte, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { InactiveRaffleExtractor } from '../../lib/extractors/inactiveRaffleExtractor';
import { createDatabase } from '../utils.mock';
import { serviceWallet } from '../utils.mock';
import {
  sampleInactiveRaffleBoxes,
  sampleInactiveRaffleExtensions,
  sampleInactiveRaffleExtractedData,
} from './mocked/inactiveRaffle.mock';

interface TestInterface {
  extractor: InactiveRaffleExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('InactiveRaffleExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new InactiveRaffleExtractor(
      dataSource,
      'InactiveRaffle',
      {
        type: ErgoNetworkType.Node,
        url: 'http://127.0.0.1/',
        address: boxErgoTree.toAddress(Network.Testnet).toString(),
      },
      serviceWallet.address.toString(),
      '2'.repeat(64),
    );
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

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
    it<TestInterface>(`should extract data from sample InactiveRaffle box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleInactiveRaffleBoxes[0],
        sampleInactiveRaffleExtensions,
      );

      expect(extractedData).toEqual(sampleInactiveRaffleExtractedData);
    });

    /**
     * @target should extract data from sample InactiveRaffle box with empty extension data
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if InactiveRaffle box data extracted correctly
     * @expected
     * - InactiveRaffles should extract successfully
     */
    it<TestInterface>(`should extract data from sample InactiveRaffle box with empty extension data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleInactiveRaffleBoxes[0],
        [],
      );

      expect(extractedData).toEqual(undefined);
    });
  });

  describe('hasData', () => {
    /**
     * @target should returns true with valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box
     * - result must be true
     * @expected
     * - InactiveRaffles box checking result must be true
     */
    it<TestInterface>(`should returns true with valid box data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(
        sampleInactiveRaffleBoxes[0],
      );

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should returns false with invalid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box ergoTree is valid
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    it<TestInterface>(`should returns false with invalid box data`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleInactiveRaffleBoxes[0],
        // set invalid ergoTree
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should returns false when license token-id is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box first token is Raffle-License token
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    it<TestInterface>(`should returns false when license token-id is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
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
    });

    /**
     * @target should returns false when additionalRegisters is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    it<TestInterface>(`should returns false when additionalRegisters is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleInactiveRaffleBoxes[0],
        additionalRegisters: {},
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should returns false when R4 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    it<TestInterface>(`should returns false when R4 length is not valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleInactiveRaffleBoxes[0],
        additionalRegisters: {
          ...sampleInactiveRaffleBoxes[0].additionalRegisters,
          R4: SColl(SLong, []).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should returns false when R7 length is not valid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if InactiveRaffle box additionalRegisters is empty
     * - result must be false
     * @expected
     * - InactiveRaffles box checking result must be false
     */
    it<TestInterface>(`should returns false when R7 length is not valid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleInactiveRaffleBoxes[0],
        additionalRegisters: {
          ...sampleInactiveRaffleBoxes[0].additionalRegisters,
          R7: SColl(SColl(SByte), []).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
