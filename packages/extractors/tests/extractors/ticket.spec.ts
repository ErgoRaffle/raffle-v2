import { compile } from '@fleet-sdk/compiler';
import { ErgoTree, Network, SColl, SLong } from '@fleet-sdk/core';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { describe, it, expect, beforeEach } from 'vitest';

import { TicketExtractor } from '../../lib/extractors/ticket';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketBoxes,
  sampleTicketExtension,
  sampleTicketExtractedData,
} from './mocked/ticket.mock';

interface TestInterface {
  extractor: TicketExtractor;
  dataSource: DataSource;
  boxFalseErgoTree: ErgoTree;
}

describe('TicketExtractor', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();
    const boxErgoTree = compile('{sigmaProp(true);}');
    const boxFalseErgoTree = compile('{sigmaProp(false);}');

    ctx.extractor = new TicketExtractor(dataSource, 'Ticket', {
      type: ErgoNetworkType.Node,
      url: 'http://127.0.0.1/',
      address: boxErgoTree.toAddress(Network.Testnet).toString(),
    });
    ctx.dataSource = dataSource;
    ctx.boxFalseErgoTree = boxFalseErgoTree;
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample ticket box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Ticket box data extracted correctly
     * @expected
     * - Tickets should extract successfully
     */
    it<TestInterface>(`should successfully extract data from a sample ticket box`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleTicketBoxes[0],
        sampleTicketExtension,
      );

      expect(extractedData).toEqual(sampleTicketExtractedData);
    });

    /**
     * @target should fail extract data from a sample ticket box and by empty extension value
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Ticket box data extracted correctly
     * @expected
     * - Tickets should not extract successfully
     */
    it<TestInterface>(`should fail extract data from a sample ticket box and by empty extension value`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.extractBoxData(
        sampleTicketBoxes[0],
        [],
      );

      expect(extractedData).toEqual(undefined);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when valid box data is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be true
     * @expected
     * - Tickets box checking result must be true
     */
    it<TestInterface>(`should return true when valid box data is provided`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData(sampleTicketBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false when an invalid box address is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    it<TestInterface>(`should return false when an invalid box address is provided`, async ({
      extractor,
      boxFalseErgoTree,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleTicketBoxes[0],
        ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
      });

      expect(extractedData).toBeFalsy();
    });

    /**
     * @target should return false when an invalid R5 length is provided
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box R5 length is not valid
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    it<TestInterface>(`should return false when an invalid R5 length is provided`, async ({
      extractor,
    }) => {
      const extractedData = await extractor.hasBoxData({
        ...sampleTicketBoxes[0],
        additionalRegisters: {
          ...sampleTicketBoxes[0].additionalRegisters,
          R5: SColl(SLong, []).toHex(),
        },
      });

      expect(extractedData).toBeFalsy();
    });
  });
});
