import { beforeEach, describe, expect, it } from 'vitest';

import { ActivityViewActions } from '../../lib';
import { activityItems, mockActivities } from '../testData';

describe('UserActivityViewActions', () => {
  describe('getActivities', () => {
    let actions: ActivityViewActions;
    beforeEach(async () => {
      const dataSource = await mockActivities();
      actions = new ActivityViewActions(dataSource);
    });

    /**
     * @target should return all activities when no filter is passed
     * @dependencies
     * @scenario
     * - call getActivities with no query filters
     * - check if all 12 activities are returned (3 creations, 3 donations,
     *   2 gifts, 2 ticket redeems, 2 gift returns); the extra `safe_pay`
     *   row whose `txId` has no matching `TicketRedeemEntity` /
     *   `GiftRedeemEntity` must be excluded
     * @expected
     * - total should be 12
     * - items should be ordered by height ASC
     */
    it('should return all activities when no filter is passed', async () => {
      const result = await actions.getActivities({ limit: 100 });
      expect(result.total).toBe(12);
      expect(result.items).toEqual([
        activityItems[2],
        activityItems[9],
        activityItems[11],
        activityItems[0],
        activityItems[6],
        activityItems[7],
        activityItems[3],
        activityItems[10],
        activityItems[5],
        activityItems[4],
        activityItems[1],
        activityItems[8],
      ]);
    });

    /**
     * @target should return only activities for the given ergoTree
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user1'
     * - addr_user1 created raffle1 and raffle3, donated to raffle2,
     *   redeemed tickets from raffle2, added gift to raffle1 and returned
     *   that gift
     * @expected
     * - total should be 6
     * - items should be ordered by height ASC
     */
    it('should return only activities for a given ergoTree', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1' },
        limit: 100,
      });
      expect(result.total).toBe(6);
      expect(result.items).toEqual([
        activityItems[2],
        activityItems[0],
        activityItems[7],
        activityItems[10],
        activityItems[5],
        activityItems[4],
      ]);
    });

    /**
     * @target should return only activities for an ergoTree with fewer activities
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user3'
     * - addr_user3 donated to raffle1, redeemed tickets from raffle1,
     *   added gift to raffle3 and returned that gift
     * @expected
     * - total should be 4
     * - items should be ordered by height ASC
     */
    it('should return only activities for an ergoTree with fewer activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user3' },
        limit: 100,
      });
      expect(result.total).toBe(4);
      expect(result.items).toEqual([
        activityItems[11],
        activityItems[6],
        activityItems[1],
        activityItems[8],
      ]);
    });

    /**
     * @target should return only activities for the given raffleId
     * @dependencies
     * @scenario
     * - call getActivities with raffleId 'raffle1'
     * - raffle1 has 1 creation (addr_user1), 2 donations (addr_user2 and
     *   addr_user3), 1 gift (addr_user1), 1 ticket redeem (addr_user3)
     *   and 1 gift return (addr_user1)
     * @expected
     * - total should be 6
     * - items should be ordered by height ASC
     */
    it('should return only activities for a given raffleId', async () => {
      const result = await actions.getActivities({
        query: { raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(6);
      expect(result.items).toEqual([
        activityItems[2],
        activityItems[9],
        activityItems[11],
        activityItems[0],
        activityItems[6],
        activityItems[7],
      ]);
    });

    /**
     * @target should return only activities for a raffleId with fewer activities
     * @dependencies
     * @scenario
     * - call getActivities with raffleId 'raffle3'
     * - raffle3 has 1 creation (addr_user1), 1 gift (addr_user3) and
     *   1 gift return (addr_user3)
     * @expected
     * - total should be 3
     * - items should be ordered by height ASC
     */
    it('should return only activities for a raffleId with fewer activities', async () => {
      const result = await actions.getActivities({
        query: { raffleId: 'raffle3' },
        limit: 100,
      });
      expect(result.total).toBe(3);
      expect(result.items).toEqual([
        activityItems[4],
        activityItems[1],
        activityItems[8],
      ]);
    });

    /**
     * @target should return activities matching both ergoTree and raffleId
     * @dependencies
     * @scenario
     * - call getActivities with ergoTree 'addr_user1' and raffleId 'raffle1'
     * - addr_user1 created raffle1, added a gift to raffle1 and returned
     *   that gift
     * @expected
     * - total should be 3
     * - items should be ordered by height ASC
     */
    it('should return activities matching both ergoTree and raffleId', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1', raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(3);
      expect(result.items).toEqual([
        activityItems[2],
        activityItems[0],
        activityItems[7],
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
     * - item should match activityItems at index 9 (ticketCount 5n)
     */
    it('should return correct ticketCount for donation activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user2', raffleId: 'raffle1' },
        limit: 100,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual(activityItems[9]);
    });

    /**
     * @target should return correct ticketCount for ticket_redeem activities
     * @dependencies
     * @scenario
     * - call getActivities filtered to addr_user1 and raffle2
     * - addr_user1 donated 3 tickets (rangeStart=0, rangeEnd=3) and later
     *   redeemed those 3 tickets, so the redeem row should expose the same
     *   ticket count as the donation row
     * @expected
     * - total should be 2
     * - items should be ordered by height ASC
     */
    it('should return correct ticketCount for ticket_redeem activities', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user1', raffleId: 'raffle2' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(result.items).toEqual([activityItems[10], activityItems[5]]);
    });

    /**
     * @target should return gift_return activity joined via safe_pay/gift_redeem
     * @dependencies
     * @scenario
     * - call getActivities filtered to addr_user3 and raffle3
     * - addr_user3 added a gift to raffle3 and later returned that gift,
     *   producing both a gift activity and a gift_return activity
     * @expected
     * - total should be 2
     * - items should be ordered by height ASC
     */
    it('should return gift_return activity joined via safe_pay/gift_redeem', async () => {
      const result = await actions.getActivities({
        query: { ergoTree: 'addr_user3', raffleId: 'raffle3' },
        limit: 100,
      });
      expect(result.total).toBe(2);
      expect(result.items).toEqual([activityItems[1], activityItems[8]]);
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
     * - total should be 12 (full count)
     * - items should contain the first 3 height-ordered activities
     */
    it('should return a paginated subset of activities', async () => {
      const result = await actions.getActivities({ limit: 3, offset: 2 });
      expect(result.total).toBe(12);
      expect(result.items).toEqual([
        activityItems[11],
        activityItems[0],
        activityItems[6],
      ]);
    });
  });
});
