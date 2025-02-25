import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner';

import { TicketRepoExtractor } from '../../lib/extractors/ticketRepo';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketRepo,
  sampleTicketRepoExtractedData,
} from '../mocked/ticketRepo.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createTicketRepoExtractorTest = async () => {
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');
  const boxFalseErgoTree = compile('{sigmaProp(false);}');

  return it.extend({
    extractor: new TicketRepoExtractor(
      dataSource,
      'TicketRepo',
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
    ),
    boxFalseErgoTree: boxFalseErgoTree,
  });
};

const raffleServiceExtractorTest = await createTicketRepoExtractorTest();

describe('TicketRepoExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should extract data from sample TicketRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if TicketRepo box data extracted correctly
     * @expected
     * - TicketRepos should extract successfully
     */
    raffleServiceExtractorTest(
      `should extract data from sample TicketRepo box`,
      async ({ extractor }) => {
        const extractedData = await extractor.extractBoxData(
          sampleTicketRepo[0],
        );

        expect(extractedData).toEqual(sampleTicketRepoExtractedData);
      },
    );
  });

  describe('hasData', () => {
    /**
     * @target should result of hasData method be true by valid box data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box
     * - result must be true
     * @expected
     * - TicketRepos box checking result must be true
     */
    raffleServiceExtractorTest(
      `should result of hasData method be true by valid box data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketRepo[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should result of hasData method be false by invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - TicketRepos box checking result must be false
     */
    raffleServiceExtractorTest(
      `should result of hasData method be false by invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketRepo[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );
  });
});
