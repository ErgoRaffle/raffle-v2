import { describe, it, expect, beforeEach } from 'vitest';
import { ErgoAddress } from '@fleet-sdk/core';

import { DynamicExtractor } from '../../lib/extractors/dynamicExtractor';
import { createDatabase } from '../utils.mock';
import {
  sampleDynamicBoxes,
  sampleDynamicExtractedData,
  sampleDynamicAddress,
  sampleInvalidAddress,
} from './mocked/dynamic.mock';
import { DataSource } from 'typeorm';

describe('DynamicExtractor', () => {
  let dataSource: DataSource;
  let extractor: DynamicExtractor;
  beforeEach(async () => {
    dataSource = await createDatabase();
    extractor = new DynamicExtractor(dataSource, 'Dynamic');
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a sample dynamic box
     * @dependencies
     * @scenario
     * - call the extractBoxData functions
     * - check if Dynamic box data extracted correctly
     * @expected
     * - Dynamic box should extract successfully
     */
    it(`should successfully extract data from a sample dynamic box`, () => {
      const extractedData = extractor.extractBoxData(sampleDynamicBoxes[0]);

      expect(extractedData).toEqual(sampleDynamicExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true with valid box data matching the watch list
     * @dependencies
     * @scenario
     * - add the box address to the watch list
     * - call the hasData functions
     * - result must be true
     * @expected
     * - Dynamic box checking result must be true
     */
    it(`should return true with valid box data matching the watch list`, () => {
      extractor.addNewAddress(sampleDynamicAddress);
      const extractedData = extractor.hasData(sampleDynamicBoxes[0]);

      expect(extractedData).toBeTruthy();
    });

    /**
     * @target should return false with an invalid box address
     * @dependencies
     * @scenario
     * - add the invalid box address to the watch list
     * - call the hasData functions
     * - result must be false
     * @expected
     * - Dynamic box checking result must be false
     */
    it(`should return false with an invalid box address`, () => {
      extractor.addNewAddress(sampleInvalidAddress);
      const extractedData = extractor.hasData(sampleDynamicBoxes[0]);

      expect(extractedData).toBeFalsy();
    });
  });

  describe('addNewAddress', () => {
    /**
     * @target should add new address to the watch list
     * @dependencies
     * @scenario
     * - call the addNewAddress function
     * - check if the address is added to the watch list
     * @expected
     * - Should add the new address to the watch list
     */
    it(`should add new address to the watch list`, () => {
      extractor.addNewAddress(sampleDynamicAddress);

      expect(extractor['ergoTreeWatchList']).toContain(
        ErgoAddress.fromBase58(sampleDynamicAddress).ergoTree.toString(),
      );
    });
  });

  describe('removeAddress', () => {
    /**
     * @target should remove address from the watch list
     * @dependencies
     * @scenario
     * - call the removeAddress function
     * - check if the address is removed from the watch list
     * @expected
     * - Should remove the address from the watch list
     */
    it(`should remove address from the watch list`, () => {
      const addressToRemove =
        ErgoAddress.fromBase58(sampleDynamicAddress).ergoTree.toString();
      extractor['ergoTreeWatchList'] = [addressToRemove];
      extractor.removeAddress(sampleDynamicAddress);
      expect(extractor['ergoTreeWatchList']).not.toContain(addressToRemove);
    });
  });
});
