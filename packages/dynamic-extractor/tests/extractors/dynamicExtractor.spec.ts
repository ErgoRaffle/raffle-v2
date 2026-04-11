import { DataSource } from '@rosen-bridge/extended-typeorm';
import * as bitcoin from 'bitcoinjs-lib';

import { DynamicExtractor } from '../../lib/extractors/dynamicExtractor';
import type { TxOutputRune } from '../../lib/network/types';
import { createDatabase } from '../utils.mock';
import {
  sampleDynamicExtractedDataWithRune,
  sampleDynamicExtractedBtcBox,
  sampleBitcoinAddress,
  sampleInvalidBitcoinAddress,
  sampleBitcoinTx,
  sampleBitcoinTxOnlyOther,
  sampleTokenId,
} from './testData';

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
      bitcoin.networks.bitcoin,
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
     * @target should skip tx when no vout decodes to a watched address
     * @dependencies
     * - db actions
     * @scenario
     * - watch BTC only for an address that does not match tx vout (tx vout decodes to different address)
     * - call processTransactions with that tx
     * @expected
     * - getTxOutputRunes not called, storeEntities not called
     */
    it(`should skip tx when no vout decodes to a watched address`, async () => {
      const getTxOutputRunesSpy = vi.spyOn(
        extractor['runesNetwork'],
        'getTxOutputRunes',
      );
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      // Watch BTC only; tx has no vout decoding to sampleBitcoinAddress (only Other)
      extractor.addNewAddress(sampleBitcoinAddress, 'btc');
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTxOnlyOther],
        block,
      );

      expect(result).toBe(true);
      expect(getTxOutputRunesSpy).not.toHaveBeenCalled();
      expect(storeEntitiesSpy).not.toHaveBeenCalled();
    });

    /**
     * @target should store box with tokenId btc and UTXO value when watching address for btc
     * @dependencies
     * - db actions
     * @scenario
     * - add (address, 'btc') to watch list; tx vout scriptPubKey decodes to that address
     * - call processTransactions with tx that has vout to that address
     * @expected
     * - storeEntities called with one box tokenId 'btc', amount = vout value (sats)
     */
    it(`should store box for watched address with tokenId btc using UTXO value`, async () => {
      const storeEntitiesSpy = vi
        .spyOn(extractor.actions, 'storeEntities')
        .mockResolvedValue(true);

      // sampleBitcoinTx vout scriptPubKey decodes to sampleBitcoinAddress (P2WPKH)
      extractor.addNewAddress(sampleBitcoinAddress, 'btc');
      const block = { hash: 'block', height: 800000 };
      const result = await extractor.processTransactions(
        [sampleBitcoinTx],
        block,
      );

      expect(result).toBe(true);
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedBtcBox],
        block,
        'Dynamic:BTC',
      );
    });

    /**
     * @target should store box for watched (address, tokenId) when runes network returns matching rune
     * @dependencies
     * - db actions
     * - runesNetwork
     * @scenario
     * - add (address, tokenId) to watch list; tx has vout decoding to that address so passes pre-filter
     * - mock runes network to return one rune for the tx matching address and tokenId
     * - call processTransactions
     * @expected
     * - storeEntities called with BTC boxes for tx outputs plus the matched rune box
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
          voutIndex: 1,
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
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(2);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedBtcBox],
        block,
        'Dynamic:BTC',
      );
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedDataWithRune],
        block,
        'Dynamic:RUNES',
      );
    });

    /**
     * @target should store only BTC boxes when runeId does not match watched tokenId
     * @dependencies
     * - db actions
     * - runesNetwork
     * @scenario
     * - add (address, tokenId) to watch list; tx has vout decoding to that address so passes pre-filter
     * - mock runes network to return rune with different runeId for that address
     * - call processTransactions
     * @expected
     * - storeEntities called with BTC boxes only (rune is filtered out)
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
            voutIndex: 1,
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
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedBtcBox],
        block,
        'Dynamic:BTC',
      );
    });

    /**
     * @target should store only BTC boxes when runes network returns no runes for tx
     * @dependencies
     * - db actions
     * - runesNetwork
     * @scenario
     * - add (address, tokenId) to watch list; tx has vout decoding to that address so passes pre-filter
     * - mock runes network to return empty array
     * - call processTransactions
     * @expected
     * - processTransactions returns true and storeEntities is called with BTC boxes only
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
      expect(storeEntitiesSpy).toHaveBeenCalledTimes(1);
      expect(storeEntitiesSpy).toHaveBeenCalledWith(
        [sampleDynamicExtractedBtcBox],
        block,
        'Dynamic:BTC',
      );
    });
  });
});
