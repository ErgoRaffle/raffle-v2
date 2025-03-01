import { describe, it, expect } from 'vitest';
import { Network, SColl, SLong } from '@fleet-sdk/core';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { compile } from '@fleet-sdk/compiler';

import { TicketExtractor } from '../../lib/extractors/ticket';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketBoxes,
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
     * @target should extract data from sample Ticket box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Ticket box data extracted correctly
     * @expected
     * - Tickets should extract successfully
     */
    extractorTest(
      `should extract data from sample Ticket box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketBoxes[0],
        );

        expect(extractedData).toEqual(sampleTicketExtractedData);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be true
     * @expected
     * - Tickets box checking result must be true
     */
    extractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketBoxes[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid R4 value
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box R4 value is not valid
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid R4 value`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketBoxes[0],
          additionalRegisters: {
            ...sampleTicketBoxes[0].additionalRegisters,
            R4: SLong(1n).toHex(),
          },
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid R5 length
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if Ticket box R5 length is not valid
     * - result must be false
     * @expected
     * - Tickets box checking result must be false
     */
    extractorTest(
      `should result of hasData method be false by invalid R5 length`,
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
