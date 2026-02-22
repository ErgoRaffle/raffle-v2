import { DataSource } from '@rosen-bridge/extended-typeorm';

import { DynamicExtractor } from '../../lib/extractors/dynamicExtractor';
import { createDatabase } from '../utils.mock';
import {
  sampleDynamicExtractedData,
  sampleBitcoinAddress,
  sampleBitcoinAddressOther,
  sampleInvalidBitcoinAddress,
  sampleBitcoinTx,
  sampleBitcoinTxOutput,
} from './mocked/dynamic.mock';

describe('DynamicExtractor', () => {
  let dataSource: DataSource;
  let extractor: DynamicExtractor;
  beforeEach(async () => {
    dataSource = await createDatabase();
    extractor = new DynamicExtractor(dataSource, 'Dynamic');
  });

  describe('extractBoxData', () => {
    /**
     * @target should successfully extract data from a Bitcoin tx output
     * @dependencies
     * @scenario
     * - call the extractBoxData function with tx, vout index, and output
     * - check if Dynamic box data extracted correctly
     * @expected
     * - Extracted data should match expected shape
     */
    it(`should successfully extract data from a Bitcoin tx output`, () => {
      const extractedData = extractor.extractBoxData(
        sampleBitcoinTx,
        0,
        sampleBitcoinTxOutput,
      );

      expect(extractedData).toEqual(sampleDynamicExtractedData);
    });
  });

  describe('hasData', () => {
    /**
     * @target should return true when output address is in the watch list
     * @dependencies
     * @scenario
     * - add the output address to the watch list
     * - call hasData with the output
     * @expected
     * - hasData returns true
     */
    it(`should return true with output address in the watch list`, () => {
      extractor.addNewAddress(sampleBitcoinAddress);

      expect(extractor.hasData(sampleBitcoinTxOutput)).toBeTruthy();
    });

    /**
     * @target should return false when output address is not in the watch list
     * @dependencies
     * @scenario
     * - add a different (valid) address to the watch list
     * - call hasData with the output
     * @expected
     * - hasData returns false
     */
    it(`should return false when output address is not in the watch list`, () => {
      extractor.addNewAddress(sampleBitcoinAddressOther);

      expect(extractor.hasData(sampleBitcoinTxOutput)).toBeFalsy();
    });
  });

  describe('addNewAddress', () => {
    /**
     * @target should add new Bitcoin address to the watch list
     * @dependencies
     * @scenario
     * - call the addNewAddress function with valid Bitcoin address
     * - check if the address is added to the watch list
     * @expected
     * - Address should be in addressWatchList
     */
    it(`should add new Bitcoin address to the watch list`, () => {
      extractor.addNewAddress(sampleBitcoinAddress);

      expect(extractor['addressWatchList']).toContain(sampleBitcoinAddress);
    });

    /**
     * @target should throw for invalid Bitcoin address
     * @dependencies
     * @scenario
     * - call addNewAddress with invalid address
     * @expected
     * - Error is thrown
     */
    it(`should throw when adding invalid Bitcoin address`, () => {
      expect(() =>
        extractor.addNewAddress(sampleInvalidBitcoinAddress),
      ).toThrow();
    });
  });

  describe('removeAddress', () => {
    /**
     * @target should remove Bitcoin address from the watch list
     * @dependencies
     * @scenario
     * - set addressWatchList with known addresses
     * - call removeAddress
     * - check address is removed and others remain
     * @expected
     * - Address is removed from watch list
     */
    it(`should remove address from the watch list`, () => {
      extractor['addressWatchList'] = new Set([
        sampleBitcoinAddress,
        'bc1qanothertestaddress1234567890abcdefghjk',
      ]);
      extractor.removeAddress(sampleBitcoinAddress);
      expect(extractor['addressWatchList']).not.toContain(sampleBitcoinAddress);
      expect(extractor['addressWatchList']).toContain(
        'bc1qanothertestaddress1234567890abcdefghjk',
      );
    });
  });

  describe('processTransactions', () => {
    /**
     * @target should store boxes for watched addresses in block
     * @dependencies
     * @scenario
     * - add address to watch list
     * - call processTransactions with tx that has output to that address
     * @expected
     * - processTransactions returns true and boxes are stored
     */
    it(`should process transactions and store boxes for watched addresses`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      extractor['addressWatchList'] = new Set([sampleBitcoinAddress]);
      const block = {
        hash: '0000000000000000000123456789abcdef',
        height: 800000,
      };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedData],
        block,
        'Dynamic',
      );
    });
  });
});
