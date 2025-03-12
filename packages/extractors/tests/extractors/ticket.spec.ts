import { describe, it, expect } from 'vitest';
import { Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import { compile } from '@fleet-sdk/compiler';

import { TicketExtractor } from '../../lib/extractors/ticket';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketBoxes,
  sampleTicketExtension,
  sampleTicketExtractedData,
} from './mocked/ticket.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createTicketExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new TicketExtractor(
      dataSource,
      'Ticket',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    dataSource: dataSource,
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const extractorTest = await createTicketExtractorTest();

describe('TicketExtractor', () => {
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
    extractorTest(
      `should successfully extract data from a sample ticket box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketBoxes[0],
          sampleTicketExtension,
        );

        expect(extractedData).toEqual(sampleTicketExtractedData);
      },
    );

    /**
     * @target should fail extract data from a sample ticket box and by empty extension value
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Ticket box data extracted correctly
     * @expected
     * - Tickets should not extract successfully
     */
    extractorTest(
      `should fail extract data from a sample ticket box and by empty extension value`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketBoxes[0],
          [],
        );

        expect(extractedData).toEqual(undefined);
      },
    );
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
    extractorTest(
      `should return true when valid box data is provided`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

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
    extractorTest(
      `should return false when an invalid box address is provided`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

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
    extractorTest(
      `should return false when an invalid R5 length is provided`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          additionalRegisters: {
            ...sampleTicketBoxes[0].additionalRegisters,
            R5: SColl(SLong, []).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
