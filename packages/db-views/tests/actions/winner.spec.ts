import { beforeEach, describe, expect, it } from 'vitest';

import { WinnerViewActions } from '../../lib';
import { InclusionStatus } from '../../lib';
import { mockRaffles } from '../testData';

describe('WinnerViewActions', () => {
  describe('getWinners', () => {
    let actions: WinnerViewActions;
    beforeEach(async () => {
      const dataSource = await mockRaffles();
      actions = new WinnerViewActions(dataSource);
    });

    /**
     * @target should return all winners for a raffle when no filters are passed
     * @dependencies
     * @scenario
     * - call getWinners with raffleId and limit
     * - check if all winners for that raffle are returned
     * @expected
     * - should return all winners with correct raffleId
     */
    it('should return all winners for a raffle when no filters are passed', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        limit: 100,
      });
      expect(total).toBe(5);
      expect(items.map((item) => [item.raffleId, item.index])).toEqual([
        ['raffle1', 0],
        ['raffle1', 1],
        ['raffle1', 2],
        ['raffle1', 3],
        ['raffle1', 4],
      ]);
    });

    /**
     * @target should return winners filtered by index
     * @dependencies
     * @scenario
     * - call getWinners with raffleId, index, and limit
     * - check if winners with specific index are returned
     * @expected
     * - should return winners with matching index
     */
    it('should return winners filtered by index', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        index: 0,
        limit: 100,
      });
      expect(total).toBe(1);
      expect(items[0].index).toBe(0);
      expect(items[0].raffleId).toBe('raffle1');
    });

    /**
     * @target should return winners with non-empty share when share filter is NonEmpty
     * @dependencies
     * @scenario
     * - call getWinners with share = InclusionStatus.NonEmpty
     * - check if winners with rewardPercent > 0 are returned
     * @expected
     * - should return only winners with non-zero rewardPercent
     */
    it('should return winners with non-empty share when share filter is NonEmpty', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        share: InclusionStatus.NonEmpty,
        limit: 100,
      });
      expect(total).toBe(4);
      expect(items.every((item) => item.rewardPercent > 0)).toBe(true);
    });

    /**
     * @target should return winners with empty share when share filter is Empty
     * @dependencies
     * @scenario
     * - call getWinners with share = InclusionStatus.Empty
     * - check if winners with rewardPercent = 0 are returned
     * @expected
     * - should return only winners with zero rewardPercent
     */
    it('should return winners with empty share when share filter is Empty', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        share: InclusionStatus.Empty,
        limit: 100,
      });
      expect(total).toBe(1);
      expect(items.every((item) => item.rewardPercent === 0)).toBe(true);
    });

    /**
     * @target should return winners with gifts when gift filter is NonEmpty
     * @dependencies
     * @scenario
     * - call getWinners with gift = InclusionStatus.NonEmpty
     * - check if winners with serialized gift data are returned
     * @expected
     * - should return only winners with non-null serialized field
     */
    it('should return winners with gifts when gift filter is NonEmpty', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        gift: InclusionStatus.NonEmpty,
        limit: 100,
      });
      expect(total).toBe(3);
      expect(items.every((item) => !!item.giftSerialized)).toBe(true);
    });

    /**
     * @target should return winners without gifts when gift filter is Empty
     * @dependencies
     * @scenario
     * - call getWinners with gift = InclusionStatus.Empty
     * - check if winners without serialized gift data are returned
     * @expected
     * - should return only winners with null serialized field
     */
    it('should return winners without gifts when gift filter is Empty', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        gift: InclusionStatus.Empty,
        limit: 100,
      });
      expect(total).toBe(2);
      expect(items.every((item) => !item.giftSerialized)).toBe(true);
    });

    /**
     * @target should apply offset and limit correctly
     * @dependencies
     * @scenario
     * - call getWinners with offset and limit
     * - check if pagination works correctly
     * @expected
     * - should return correct number of items with correct offset
     */
    it('should apply offset and limit correctly', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        offset: 1,
        limit: 2,
      });
      expect(total).toBe(5);
      expect(items).toHaveLength(2);
      expect(items[0].index).toBe(1);
      expect(items[1].index).toBe(2);
    });

    /**
     * @target should combine multiple filters correctly
     * @dependencies
     * @scenario
     * - call getWinners with index, share, and gift filters
     * - check if all filters are applied together
     * @expected
     * - should return winners matching all filter criteria
     */
    it('should combine multiple filters correctly', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'raffle1',
        index: 0,
        share: InclusionStatus.NonEmpty,
        gift: InclusionStatus.NonEmpty,
        limit: 100,
      });
      expect(total).toBe(1);
      expect(items[0].index).toBe(0);
      expect(items[0].rewardPercent).toBe(400);
      expect(!!items[0].giftSerialized).toEqual(true);
    });

    /**
     * @target should return empty array for non-existent raffle
     * @dependencies
     * @scenario
     * - call getWinners with non-existent raffleId
     * - check if empty result is returned
     * @expected
     * - should return empty array with total 0
     */
    it('should return empty array for non-existent raffle', async () => {
      const [items, total] = await actions.getWinners({
        raffleId: 'nonexistent',
        limit: 100,
      });
      expect(total).toBe(0);
      expect(items).toEqual([]);
    });
  });
});
