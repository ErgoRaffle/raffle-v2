import { describe, expect, it } from 'vitest';

import { RaffleStatus } from '@ergo-raffle/db-views';

import {
  mergeAssets,
  transformErgoTreeToAddress,
  transformRaffleViewToApiResponse,
  winnersViewToScheme,
} from '../../src/utils';
import {
  mockRaffleWithCustomToken,
  mockRaffleWithErgToken,
  mockRaffleWithUndefinedTokenFields,
  mockRaffleWithNullSoldTicketCount,
  validErgoTree,
  mockWinners,
  mockWinnersWithDuplicateIndices,
  mockAssetsWithDuplicates,
  mockAssetsWithUniqueTokenIds,
  mockSingleAsset,
} from './testData';

describe('utils', () => {
  describe('transformRaffleViewToApiResponse', () => {
    /**
     * @target should transform RaffleView to API response with custom token
     * @dependencies
     * @scenario
     * - create a RaffleView with collectingTokenId, tokenName, tokenDecimals, tokenIsVerified
     * - call transformRaffleViewToApiResponse
     * @expected
     * - should return API response with custom token information
     */
    it('should transform RaffleView to API response with custom token', () => {
      const result = transformRaffleViewToApiResponse(
        mockRaffleWithCustomToken,
      );

      expect(result.id).toBe('raffle1');
      expect(result.name).toBe('Test Raffle');
      expect(result.description).toBe('Test description');
      expect(result.token).toEqual({
        id: 'token123',
        name: 'Test Token',
        decimals: 9,
        verified: true,
      });
      expect(result.winnersCount).toBe(2);
      expect(result.giftCount).toBe(2);
      expect(result.deadline).toBe(1234567890);
      expect(result.amount.goal).toBe(1000000000n);
      expect(result.amount.raised).toBe(100000000n);
      expect(result.tags).toEqual(['tech', 'blockchain']);
      expect(result.ticketPrice).toBe(1000000n);
      expect(result.status).toBe(RaffleStatus.Active);
    });

    /**
     * @target should transform RaffleView to API response with ERG token when no collectingTokenId
     * @dependencies
     * @scenario
     * - create a RaffleView without collectingTokenId
     * - call transformRaffleViewToApiResponse
     * @expected
     * - should return API response with ERG token defaults
     */
    it('should transform RaffleView to API response with ERG token when no collectingTokenId', () => {
      const result = transformRaffleViewToApiResponse(mockRaffleWithErgToken);

      expect(result.token).toEqual({
        id: 'erg',
        name: 'Erg',
        decimals: 9,
        verified: true,
      });
    });

    /**
     * @target should handle undefined token fields gracefully
     * @dependencies
     * @scenario
     * - create a RaffleView with collectingTokenId but undefined token fields
     * - call transformRaffleViewToApiResponse
     * @expected
     * - should return API response with default values for undefined token fields
     */
    it('should handle undefined token fields gracefully', () => {
      const result = transformRaffleViewToApiResponse(
        mockRaffleWithUndefinedTokenFields,
      );

      expect(result.token).toEqual({
        id: 'token123',
        name: undefined,
        decimals: 0,
        verified: false,
      });
    });

    /**
     * @target should handle null soldTicketCount
     * @dependencies
     * @scenario
     * - create a RaffleView with null soldTicketCount
     * - call transformRaffleViewToApiResponse
     * @expected
     * - should return API response with raised amount of 0
     */
    it('should handle null soldTicketCount', () => {
      const result = transformRaffleViewToApiResponse(
        mockRaffleWithNullSoldTicketCount,
      );

      expect(result.amount.raised).toBe(0n);
    });
  });

  describe('transformErgoTreeToAddress', () => {
    /**
     * @target should transform ErgoTree hex to address
     * @dependencies
     * @scenario
     * - call transformErgoTreeToAddress with a valid ErgoTree hex string
     * @expected
     * - should return a valid Ergo address string
     */
    it('should transform ErgoTree hex to address', () => {
      const result = transformErgoTreeToAddress(validErgoTree);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('winnersViewToScheme', () => {
    /**
     * @target should transform WinnerView array to Winner array
     * @dependencies
     * @scenario
     * - create an array of WinnerView objects
     * - call winnersViewToScheme
     * @expected
     * - should return array of Winner objects with correct structure
     */
    it('should transform WinnerView array to Winner array', () => {
      const result = winnersViewToScheme(mockWinners);

      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(0);
      expect(result[0].share).toBe(500);
      expect(result[0].gifts).toEqual([]);
      expect(result[1].index).toBe(1);
      expect(result[1].share).toBe(500);
      expect(result[1].gifts).toEqual([]);
    });

    /**
     * @target should merge winners with same index
     * @dependencies
     * @scenario
     * - create WinnerView array with duplicate indices
     * - call winnersViewToScheme
     * @expected
     * - should return array with unique indices and merged gifts
     */
    it('should merge winners with same index', () => {
      const result = winnersViewToScheme(mockWinnersWithDuplicateIndices);

      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
      expect(result[0].share).toBe(500);
    });

    /**
     * @target should handle empty array
     * @dependencies
     * @scenario
     * - call winnersViewToScheme with empty array
     * @expected
     * - should return empty array
     */
    it('should handle empty array', () => {
      const result = winnersViewToScheme([]);
      expect(result).toEqual([]);
    });
  });

  describe('mergeAssets', () => {
    /**
     * @target should merge assets with same tokenId
     * @dependencies
     * @scenario
     * - create array of WinnerGift with duplicate tokenIds
     * - call mergeAssets
     * @expected
     * - should return array with unique tokenIds and summed amounts
     */
    it('should merge assets with same tokenId', () => {
      const result = mergeAssets(mockAssetsWithDuplicates);
      expect(result).toHaveLength(2);
      expect(result[0].tokenId).toBe('token1');
      expect(result[0].amount).toBe(150n);
      expect(result[1].tokenId).toBe('token2');
      expect(result[1].amount).toBe(200n);
    });

    /**
     * @target should handle empty array
     * @dependencies
     * @scenario
     * - call mergeAssets with empty array
     * @expected
     * - should return empty array
     */
    it('should handle empty array', () => {
      const result = mergeAssets([]);
      expect(result).toEqual([]);
    });

    /**
     * @target should handle array with single asset
     * @dependencies
     * @scenario
     * - call mergeAssets with single asset
     * @expected
     * - should return array with that asset unchanged
     */
    it('should handle array with single asset', () => {
      const result = mergeAssets(mockSingleAsset);
      expect(result).toEqual([{ tokenId: 'token1', amount: 100n }]);
    });

    /**
     * @target should handle array with unique tokenIds
     * @dependencies
     * @scenario
     * - call mergeAssets with array of unique tokenIds
     * @expected
     * - should return array unchanged
     */
    it('should handle array with unique tokenIds', () => {
      const result = mergeAssets(mockAssetsWithUniqueTokenIds);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockAssetsWithUniqueTokenIds);
    });
  });
});
