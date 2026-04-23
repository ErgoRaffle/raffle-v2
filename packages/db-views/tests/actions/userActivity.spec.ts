import { beforeEach, describe, expect, it } from 'vitest';

import { UserActivityView, UserActivityViewActions } from '../../lib';
import { activityItems, mockActivities } from '../testData';

const sortByTxId = (items: UserActivityView[]) =>
  items.sort((a, b) => a.txId.localeCompare(b.txId));

describe('UserActivityViewActions', () => {
  describe('getActivities', () => {
    let actions: UserActivityViewActions;
    beforeEach(async () => {
      const dataSource = await mockActivities();
      actions = new UserActivityViewActions(dataSource);
    });

    /**
     * @target should return all activities when no filter is passed
     * @dependencies
     * @scenario
     * - call getActivities with no query filters
     * - check if all 8 activities are returned (3 creations, 3 donations, 2 gifts)
     * @expected
     * - total should be 8
     * - items sorted by txId should match all activityItems
     */
    it('should return all activities when no filter is passed', async () => {
      const result = await actions.getActivities({ limit: 100 });
      expect(result.total).toBe(8);
      expect(sortByTxId(result.items)).toEqual(activityItems);
    });

    /**
     * @target should return only activities for the given ergoTree
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user1'
     * - addr_user1 created raffle1 and raffle3, donated to raffle2, added gift to raffle1
     * @expected
     * - total should be 4
     * - items sorted by txId should match activityItems at indices 0, 2, 4, 6
     */
    it('should return only activities for a given ergoTree', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1' },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(sortByTxId(result.items)).toEqual([
        activityItems[0],
        activityItems[2],
        activityItems[4],
        activityItems[6],
      ]);
    });

    /**
     * @target should return only activities for an ergoTree with fewer activities
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user3'
     * - addr_user3 donated to raffle1 and added gift to raffle3
     * @expected
     * - total should be 2
     * - items sorted by txId should match activityItems at indices 1, 7
     */
    it('should return only activities for an ergoTree with fewer activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user3' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(sortByTxId(result.items)).toEqual([
        activityItems[1],
        activityItems[7],
      ]);
    });

    /**
     * @target should return only activities for the given raffleId
     * @dependencies
     * @scenario
     * - call getActivities with raffleId 'raffle1'
     * - raffle1 has 1 creation (addr_user1), 2 donations (addr_user2 and addr_user3), 1 gift (addr_user1)
     * @expected
     * - total should be 4
     * - items sorted by txId should match activityItems at indices 0, 2, 5, 7
     */
    it('should return only activities for a given raffleId', async () => {
      const result = await actions.getActivities({
        query: { raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(sortByTxId(result.items)).toEqual([
        activityItems[0],
        activityItems[2],
        activityItems[5],
        activityItems[7],
      ]);
    });

    /**
     * @target should return only activities for a raffleId with fewer activities
     * @dependencies
     * @scenario
     * - call getActivities with raffleId 'raffle3'
     * - raffle3 has 1 creation (addr_user1) and 1 gift (addr_user3)
     * @expected
     * - total should be 2
     * - items sorted by txId should match activityItems at indices 1, 4
     */
    it('should return only activities for a raffleId with fewer activities', async () => {
      const result = await actions.getActivities({
        query: { raffleId: 'raffle3' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(sortByTxId(result.items)).toEqual([
        activityItems[1],
        activityItems[4],
      ]);
    });

    /**
     * @target should return activities matching both ergoTree and raffleId
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user1' and raffleId 'raffle1'
     * - addr_user1 created raffle1 and added gift to raffle1
     * @expected
     * - total should be 2
     * - items sorted by txId should match activityItems at indices 0, 2
     */
    it('should return activities matching both ergoTree and raffleId', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1', raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(sortByTxId(result.items)).toEqual([
        activityItems[0],
        activityItems[2],
      ]);
    });

    /**
     * @target should return correct ticketCount for donation activities
     * @dependencies
     * @scenario
     * - call getActivities filtered to addr_user2 and raffle1
     * - addr_user2 bought tickets with rangeStart=0 and rangeEnd=5
     * @expected
     * - total should be 1
     * - item should match activityItems at index 5 (ticketCount 5n)
     */
    it('should return correct ticketCount for donation activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user2', raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual(activityItems[5]);
    });

    /**
     * @target should return undefined ticketCount for non-donation activities
     * @dependencies
     * @scenario
     * - call getActivities filtered to addr_user1 and raffle3 (creation only)
     * - raffle3 was created by addr_user1
     * @expected
     * - total should be 1
     * - item should match activityItems at index 4 (ticketCount undefined)
     */
    it('should return undefined ticketCount for non-donation activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1', raffleId: 'raffle3' },
        limit: 100,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual(activityItems[4]);
    });

    /**
     * @target should return a paginated subset of activities
     * @dependencies
     * @scenario
     * - call getActivities with limit 3 and offset 2 and no filter
     * @expected
     * - total should be 8 (full count)
     * - items length should be 3
     */
    it('should return a paginated subset of activities', async () => {
      const result = await actions.getActivities({ limit: 3, offset: 2 });
      expect(result.total).toBe(8);
      expect(result.items).toHaveLength(3);
    });
  });
});
