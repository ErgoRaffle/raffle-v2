import { describe, expect, it } from 'vitest';

import { RaffleStatus, RaffleView } from '../../lib';

describe('RaffleView', () => {
  describe('getStatus', () => {
    /**
     * @target should return SuccessFull status when successCount > 0
     * @dependencies
     * @scenario
     * - create a RaffleView with successCount = 1, redeemCount = 0
     * - call status() method
     * @expected
     * - should return RaffleStatus.SuccessFull
     */
    it('should return SuccessFull status when successCount > 0', () => {
      const raffle = new RaffleView();
      raffle.successCount = 1;
      raffle.redeemCount = 0;
      expect(raffle.status()).toBe(RaffleStatus.SuccessFull);
    });

    /**
     * @target should return Failed status when redeemCount > 0 and successCount = 0
     * @dependencies
     * @scenario
     * - create a RaffleView with successCount = 0, redeemCount = 1
     * - call status() method
     * @expected
     * - should return RaffleStatus.Failed
     */
    it('should return Failed status when redeemCount > 0 and successCount = 0', () => {
      const raffle = new RaffleView();
      raffle.successCount = 0;
      raffle.redeemCount = 1;
      expect(raffle.status()).toBe(RaffleStatus.Failed);
    });

    /**
     * @target should return Active status when both successCount and redeemCount are 0
     * @dependencies
     * @scenario
     * - create a RaffleView with successCount = 0, redeemCount = 0
     * - call status() method
     * @expected
     * - should return RaffleStatus.Active
     */
    it('should return Active status when both successCount and redeemCount are 0', () => {
      const raffle = new RaffleView();
      raffle.successCount = 0;
      raffle.redeemCount = 0;
      expect(raffle.status()).toBe(RaffleStatus.Active);
    });
  });
});
