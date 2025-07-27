import { describe, it, expect } from 'vitest';
import { Network } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { TicketRepoExtractor } from '../../lib/extractors/ticketRepoExtractor';
import { createDatabase } from '../utils.mock';
import {
  sampleTicketRepo,
  sampleTicketRepoExtractedData,
} from './mocked/ticketRepo.mock';

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

const extractorTest = await createTicketRepoExtractorTest();

describe('TicketRepoExtractor', () => {
  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample TicketRepo box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if TicketRepo box data extracted correctly
     * @expected
     * - TicketRepos should extract successfully
     */
    extractorTest(
      `should successfully extract data from a sample TicketRepo box`,
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
     * @target should return true for hasData method when the box contains valid data
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box
     * - result must be true
     * @expected
     * - TicketRepos box checking result must be true
     */
    extractorTest(
      `should return true for hasData method when the box contains valid data`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData(sampleTicketRepo[0]);

        expect(extractedData).toBeTruthy();
      },
    );

    /**
     * @target should return false for hasData method when provided with an invalid box address
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box ergoTree is valid
     * - result must be false
     * @expected
     * - TicketRepos box checking result must be false
     */
    extractorTest(
      `should return false for hasData method when provided with an invalid box address`,
      async ({ extractor, boxFalseErgoTree }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketRepo[0],
          // set invalid ergoTree
          ergoTree: boxFalseErgoTree.toAddress(Network.Testnet).toString(),
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false for hasData method when the assets list is empty
     * @dependencies
     * - call the hasData functions
     * - check if TicketRepo box assets is undefined
     * - result must be false
     * @scenario
     * @expected
     * - TicketRepos box checking result must be false
     */
    extractorTest(
      `should return false for hasData method when the assets list is empty`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketRepo[0],
          assets: [],
        });

        expect(extractedData).toBeFalsy();
      },
    );

    /**
     * @target should return false for hasData method when the assets list contains more than one item
     * @dependencies
     * @scenario
     * - call the hasData functions
     * - check if TicketRepo box assets is more than 1
     * - result must be false
     * @expected
     * - TicketRepos box checking result must be false
     */
    extractorTest(
      `should return false for hasData method when the assets list contains more than one item`,
      async ({ extractor }) => {
        const extractedData = await extractor.hasData({
          ...sampleTicketRepo[0],
          assets: [
            {
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
      },
    );
  });
});
