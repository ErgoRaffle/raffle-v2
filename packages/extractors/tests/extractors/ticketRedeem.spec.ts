import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { TicketRedeemExtractor } from '../../lib/extractors/ticketRedeem';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketRedeemBoxes,
  sampleTicketRedeemExtractedData,
} from './mocked/ticketRedeem.mock';

interface TestInterface {
  extractor: TicketRedeemExtractor;
  boxFalseErgoTree: ErgoTree;
}

describe('TicketRedeemExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new TicketRedeemExtractor(
      dataSource,
      'TicketRedeem',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
    );
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should extract data from a sample TicketRedeem box successfully
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if TicketRedeem box data extracted correctly
     * @expected
     * - TicketRedeems should extract successfully
     */
    it<TestInterface>(`should extract data from a sample TicketRedeem box successfully`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleTicketRedeemBoxes[0],
      );

      expect(extractedData).toEqual(sampleTicketRedeemExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true for valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRedeem box
     * - result must be true
     * @expected
     * - TicketRedeems box checking result must be true
     */
    it<TestInterface>(`should return true for valid box data`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData(sampleTicketRedeemBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false for invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRedeem box
     * - result must be false
     * @expected
     * - TicketRedeems box checking result must be false
     */
    it<TestInterface>(`should return false for invalid box address`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleTicketRedeemBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when assets is empty
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if assets of the TicketRedeem box is empty
     * - result must be false
     * @expected
     * - TicketRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when assets is empty`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleTicketRedeemBoxes[0],
        assets: [],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R4 length is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRedeem box R4 length is not valid
     * - result must be false
     * @expected
     * - TicketRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when R4 length is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleTicketRedeemBoxes[0],
        additionalRegisters: {
          ...sampleTicketRedeemBoxes[0].additionalRegisters,
          R4: SColl(SLong, [1n]).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when the asset's licenseTokenId is invalid
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRedeem box first asset-id is not valid
     * - result must be false
     * @expected
     * - TicketRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when the asset's licenseTokenId is invalid`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleTicketRedeemBoxes[0],
        assets: [
          {
            // invalid licenseTokenId
            tokenId: '1'.repeat(64),
            amount: 1n,
          },
          {
            tokenId: '2'.repeat(64),
            amount: 1n,
          },
        ],
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when R5 is missing
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRedeem box R5 is missed
     * - result must be false
     * @expected
     * - TicketRedeems box checking result must be false
     */
    it<TestInterface>(`should return false when R5 is missing`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasData({
        ...sampleTicketRedeemBoxes[0],
        additionalRegisters: {
          R4: sampleTicketRedeemBoxes[0].additionalRegisters!.R4,
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
