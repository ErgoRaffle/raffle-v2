import { DataSource } from '@rosen-bridge/extended-typeorm';

import { DynamicExtractor } from '../../lib/extractors/dynamicExtractor';
import type { TxOutputRune } from '../../lib/network/types';
import { createDatabase } from '../utils.mock';
import {
  sampleDynamicExtractedDataWithRune,
  sampleBitcoinAddress,
  sampleInvalidBitcoinAddress,
  sampleBitcoinTx,
  sampleTokenId,
} from './mocked/dynamic.mock';

const unisatUrl = 'https://open-api.unisat.io';
const unisatApiKey = '';

describe('DynamicExtractor', () => {
  let dataSource: DataSource;
  let extractor: DynamicExtractor;
  beforeEach(async () => {
    dataSource = await createDatabase();
    extractor = new DynamicExtractor(
      dataSource,
      'Dynamic',
      unisatUrl,
      unisatApiKey,
    );
  });

  describe('addNewAddress', () => {
    /**
     * @target should add new Bitcoin address and tokenId to the watch list
     * @dependencies
     * @scenario
     * - call the addNewAddress function with valid Bitcoin address and tokenId
     * - check if the address is added to the watch list
     * @expected
     * - Address and tokenId should be in addressWatchList
     */
    it(`should add new Bitcoin address and tokenId to the watch list`, () => {
      extractor.addNewAddress(sampleBitcoinAddress, sampleTokenId);

      expect(extractor['addressWatchList'].has(sampleBitcoinAddress)).toBe(
        true,
      );
      expect(extractor['addressWatchList'].get(sampleBitcoinAddress)).toBe(
        sampleTokenId,
      );
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
        extractor.addNewAddress(sampleInvalidBitcoinAddress, sampleTokenId),
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
      extractor['addressWatchList'] = new Map([
        [sampleBitcoinAddress, sampleTokenId],
        ['bc1qanothertestaddress1234567890abcdefghjk', 'other-rune'],
      ]);
      extractor.removeAddress(sampleBitcoinAddress);
      expect(extractor['addressWatchList'].has(sampleBitcoinAddress)).toBe(
        false,
      );
      expect(
        extractor['addressWatchList'].has(
          'bc1qanothertestaddress1234567890abcdefghjk',
        ),
      ).toBe(true);
    });
  });

  describe('processTransactions', () => {
    /**
     * @target should store box with tokenId btc and UTXO value when watching address for btc
     * @dependencies
     * @scenario
     * - add (address, 'btc') to watch list
     * - call processTransactions with tx that has vout to that address
     * @expected
     * - storeEntities called with one box tokenId 'btc', amount = vout value (sats)
     */
    it(`should store box for watched address with tokenId btc using UTXO value`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      extractor.addNewAddress(sampleBitcoinAddress, 'btc');
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [
          {
            identifier: `${sampleBitcoinTx.txid}:0`,
            txId: sampleBitcoinTx.txid,
            address: sampleBitcoinAddress,
            serialized: '',
            tokenId: 'btc',
            amount: '50000',
          },
        ],
        block,
        'Dynamic',
      );
    });

    /**
     * @target should store box for watched (address, tokenId) when runes network returns matching rune
     * @dependencies
     * @scenario
     * - add (address, tokenId) to watch list
     * - mock runes network to return one rune for the tx matching address and tokenId
     * - call processTransactions
     * @expected
     * - storeEntities called with one box with tokenId and amount from rune
     */
    it(`should store box for runes token when runes network returns matching rune`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      const mockRunes: TxOutputRune[] = [
        {
          address: sampleBitcoinAddress,
          runeId: sampleTokenId,
          runeAmount: '100',
          voutIndex: 0,
        },
      ];
      vi.spyOn(extractor['runesNetwork'], 'getTxOutputRunes').mockResolvedValue(
        mockRunes,
      );

      extractor.addNewAddress(sampleBitcoinAddress, sampleTokenId);
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedDataWithRune],
        block,
        'Dynamic',
      );
    });

    /**
     * @target should not store rune when runeId does not match watched tokenId
     * @dependencies
     * @scenario
     * - add (address, tokenId) to watch list
     * - mock runes network to return rune with different runeId for same address
     * - call processTransactions
     * @expected
     * - storeEntities not called (rune filtered out)
     */
    it(`should not store rune when runeId does not match watched tokenId`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      const otherRuneId = 'other-rune-id';
      vi.spyOn(extractor['runesNetwork'], 'getTxOutputRunes').mockResolvedValue(
        [
          {
            address: sampleBitcoinAddress,
            runeId: otherRuneId,
            runeAmount: '50',
            voutIndex: 0,
          },
        ],
      );

      extractor.addNewAddress(sampleBitcoinAddress, sampleTokenId);
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).not.toHaveBeenCalled();
    });

    /**
     * @target should not store when runes network returns no runes for tx
     * @dependencies
     * @scenario
     * - add (address, tokenId) to watch list
     * - mock runes network to return empty array
     * - call processTransactions
     * @expected
     * - processTransactions returns true and storeEntities is not called
     */
    it(`should not store when runes network returns no runes for tx`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      vi.spyOn(extractor['runesNetwork'], 'getTxOutputRunes').mockResolvedValue(
        [],
      );

      extractor.addNewAddress(sampleBitcoinAddress, sampleTokenId);
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).not.toHaveBeenCalled();
    });
  });
});
