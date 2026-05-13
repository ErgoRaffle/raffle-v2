import { beforeEach, describe, expect, it } from 'vitest';

import { ERG_TOKEN_ID } from '@ergo-raffle/utils';

import { RaffleStatus, RaffleViewActions } from '../../lib';
import { mockRaffles } from '../testData';

describe('RaffleViewActions', () => {
  describe('getRaffles', () => {
    let actions: RaffleViewActions;
    beforeEach(async () => {
      const dataSource = await mockRaffles();
      actions = new RaffleViewActions(dataSource);
    });

    /**
     * @target should return all raffles when no search criteria is passed
     * @dependencies
     * @scenario
     * - call getRaffles with empty query object
     * - check if all 8 raffles are returned
     * @expected
     * - should return all raffles with correct IDs
     */
    it('should find appropriate raffle when no search passed', async () => {
      const result = await actions.getRaffles({ limit: 100 });
      expect(result.total).toBe(8);
      expect(result.items.map((item) => item.raffleId)).toEqual([
        'raffle1',
        'raffle2',
        'raffle3',
        'raffle4',
        'raffle5',
        'raffle6',
        'raffle7',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles whose name contains the search text
     * @dependencies
     * @scenario
     * - call getRaffles with text 'Tech'
     * - check if raffles with 'Tech' in name are returned
     * @expected
     * - should return 4 raffles (raffle2, raffle4, raffle6, raffle8)
     */
    it('should find appropriate raffle when name contains search text', async () => {
      const result = await actions.getRaffles({
        query: { text: 'Tech' },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle4',
        'raffle6',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles whose tags contain the search text
     * @dependencies
     * @scenario
     * - call getRaffles with text 'test-'
     * - check if raffles with 'test-' in tags are returned
     * @expected
     * - should return 2 raffles (raffle2, raffle4)
     */
    it('should find appropriate raffle when tag contains search text', async () => {
      const result = await actions.getRaffles({
        query: { text: 'test-' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle4',
      ]);
    });

    /**
     * @target should return raffles whose description contains the search text
     * @dependencies
     * @scenario
     * - call getRaffles with text 'educational'
     * - check if raffles with 'educational' in description are returned
     * @expected
     * - should return 1 raffle (raffle1)
     */
    it('should find appropriate raffle when description contains search text', async () => {
      const result = await actions.getRaffles({
        query: { text: 'educational' },
        limit: 100,
      });
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.raffleId)).toEqual(['raffle1']);
    });

    /**
     * @target should return raffles whose collectingTokenId contains the search text
     * @dependencies
     * @scenario
     * - call getRaffles with text 'token123'
     * - check if raffles with 'token123' in collectingTokenId are returned
     * @expected
     * - should return 3 raffles (raffle2, raffle5, raffle8)
     */
    it('should find appropriate raffle when collectingTokenId contains search text', async () => {
      const result = await actions.getRaffles({
        query: { text: 'token123' },
        limit: 100,
      });
      expect(result.total).toBe(3);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle5',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles whose raffleId contains the search text
     * @dependencies
     * @scenario
     * - call getRaffles with text 'raffle1'
     * - check if raffles with 'raffle1' in raffleId are returned
     * @expected
     * - should return 1 raffle (raffle1)
     */
    it('should find appropriate raffle when raffleId contains search text', async () => {
      const result = await actions.getRaffles({
        query: { text: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.raffleId)).toEqual(['raffle1']);
    });

    /**
     * @target should return raffles matching the provided list of raffleIds
     * @dependencies
     * @scenario
     * - call getRaffles with ids ['raffle1', 'raffle3', 'raffle5']
     * - check if only matching raffles are returned
     * @expected
     * - should return 3 raffles (raffle1, raffle3, raffle5)
     */
    it('should find appropriate raffle when list of raffleIds passed', async () => {
      const result = await actions.getRaffles({
        query: { ids: ['raffle1', 'raffle3', 'raffle5'] },
        limit: 100,
      });
      expect(result.total).toBe(3);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle3',
        'raffle5',
      ]);
    });

    /**
     * @target should return raffles matching the provided list of tokenIds
     * @dependencies
     * @scenario
     * - call getRaffles with tokenIds ['token123']
     * - check if only matching raffles are returned
     * @expected
     * - should return 3 raffles (raffle2, raffle5, raffle8)
     */
    it('should find appropriate raffle when list of tokenIds passed', async () => {
      const result = await actions.getRaffles({
        query: { tokenIds: ['token123'] },
        limit: 100,
      });
      expect(result.total).toBe(3);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle5',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles collecting ERG when ERG token id is passed
     * @dependencies
     * @scenario
     * - call getRaffles with tokenIds [ERG_TOKEN_ID]
     * - ERG raffles are stored with collectingTokenId = NULL (not literal 'erg')
     * @expected
     * - should return only raffles collecting ERG
     */
    it('should find appropriate raffle when ERG tokenId passed', async () => {
      const result = await actions.getRaffles({
        query: { tokenIds: [ERG_TOKEN_ID] },
        limit: 100,
      });
      expect(result.total).toBe(5);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle3',
        'raffle4',
        'raffle6',
        'raffle7',
      ]);
    });

    /**
     * @target should return raffles matching the provided list of tags
     * @dependencies
     * @scenario
     * - call getRaffles with tags ['tech']
     * - check if only raffles with 'tech' tag are returned
     * @expected
     * - should return 4 raffles (raffle2, raffle4, raffle6, raffle8)
     */
    it('should find appropriate raffle when list of tags passed', async () => {
      const result = await actions.getRaffles({
        query: { tags: ['tech'] },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle4',
        'raffle6',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles with Active status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.Active]
     * - check if only active raffles are returned (successCount = 0, redeemCount = 0)
     * @expected
     * - should return 4 raffles (raffle1, raffle6, raffle7, raffle8)
     */
    it('should find appropriate raffle when status is Active', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.Active] },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle6',
        'raffle7',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles with Success status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.SuccessFull]
     * - check if only successful raffles are returned (successCount > 0)
     * @expected
     * - should return 2 raffles (raffle2, raffle4)
     */
    it('should find appropriate raffle when status is Success', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.SuccessFull] },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle4',
      ]);
    });

    /**
     * @target should return raffles with Failed status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.Failed]
     * - check if only failed raffles are returned (redeemCount > 0)
     * @expected
     * - should return 2 raffles (raffle3, raffle5)
     */
    it('should find appropriate raffle when status is Failed', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.Failed] },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle3',
        'raffle5',
      ]);
    });

    /**
     * @target should return raffles with Success or Active status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.SuccessFull, RaffleStatus.Active]
     * - check if raffles with redeemCount = 0 are returned (intersection logic)
     * @expected
     * - should return 6 raffles (raffle1, raffle2, raffle4, raffle6, raffle7, raffle8)
     */
    it('should find appropriate raffle when status is Success or Active', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.SuccessFull, RaffleStatus.Active] },
        limit: 100,
      });
      expect(result.total).toBe(6);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle2',
        'raffle4',
        'raffle6',
        'raffle7',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles with Failed or Active status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.Failed, RaffleStatus.Active]
     * - check if raffles with successCount = 0 are returned (intersection logic)
     * @expected
     * - should return 6 raffles (raffle1, raffle3, raffle5, raffle6, raffle7, raffle8)
     */
    it('should find appropriate raffle when status is Failed or Active', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.Failed, RaffleStatus.Active] },
        limit: 100,
      });
      expect(result.total).toBe(6);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle3',
        'raffle5',
        'raffle6',
        'raffle7',
        'raffle8',
      ]);
    });

    /**
     * @target should find appropriate raffle when status is Success or Failed
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.Failed, RaffleStatus.SuccessFull]
     * @expected
     * - should return 4 raffles (raffle2, raffle3, raffle4, raffle5)
     */
    it('should find appropriate raffle when status is Success or Failed', async () => {
      const result = await actions.getRaffles({
        query: { status: [RaffleStatus.Failed, RaffleStatus.SuccessFull] },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle2',
        'raffle3',
        'raffle4',
        'raffle5',
      ]);
    });
    /**
     * @target should find appropriate raffle when passed all status
     * @dependencies
     * @scenario
     * - call getRaffles with status [RaffleStatus.Failed, RaffleStatus.SuccessFull, RaffleStatus.Active]
     * @expected
     * - should return 4 raffles (raffle2, raffle3, raffle4, raffle5)
     */
    it('should find appropriate raffle when passed all status', async () => {
      const result = await actions.getRaffles({
        query: {
          status: [
            RaffleStatus.Failed,
            RaffleStatus.SuccessFull,
            RaffleStatus.Active,
          ],
        },
        limit: 100,
      });
      expect(result.total).toBe(8);
      expect(result.items.map((item) => item.raffleId).sort()).toEqual([
        'raffle1',
        'raffle2',
        'raffle3',
        'raffle4',
        'raffle5',
        'raffle6',
        'raffle7',
        'raffle8',
      ]);
    });

    /**
     * @target should return raffles sorted by the specified field and direction
     * @dependencies
     * @scenario
     * - call getRaffles with order { field: 'raffleId', direction: 'DESC' }
     * - check if raffles are returned in descending order by raffleId
     * @expected
     * - should return all 8 raffles sorted from raffle8 to raffle1
     */
    it('should return raffle with correct order', async () => {
      const result = await actions.getRaffles({
        order: { field: 'raffleId', direction: 'DESC' },
        limit: 100,
      });
      expect(result.total).toBe(8);
      expect(result.items.map((item) => item.raffleId)).toEqual([
        'raffle8',
        'raffle7',
        'raffle6',
        'raffle5',
        'raffle4',
        'raffle3',
        'raffle2',
        'raffle1',
      ]);
    });

    /**
     * @target should return a paginated subset of raffles using limit and offset
     * @dependencies
     * @scenario
     * - call getRaffles with order { field: 'raffleId', direction: 'DESC' }, limit: 2, offset: 3
     * - check if only 2 raffles are returned starting from position 3
     * @expected
     * - should return total count of 8, but only raffle5 and raffle4 (positions 3-4 in descending order)
     */
    it('should return selected range of raffles', async () => {
      const result = await actions.getRaffles({
        order: { field: 'raffleId', direction: 'DESC' },
        limit: 2,
        offset: 3,
      });
      expect(result.total).toBe(8);
      expect(result.items.map((item) => item.raffleId)).toEqual([
        'raffle5',
        'raffle4',
      ]);
    });
  });
});
