import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TokenAction } from '../lib';
import mockTokens from './testData';
import { createDatabase } from './utils.mock';

describe('TokenAction', () => {
  describe('searchTokens', () => {
    let dataSource: Awaited<ReturnType<typeof createDatabase>>;
    let action: TokenAction;

    beforeEach(async () => {
      dataSource = await mockTokens();
      action = new TokenAction(dataSource, '');
    });

    afterEach(async () => {
      await dataSource.destroy();
    });

    /**
     * @target should find tokens by name using case-insensitive partial match
     * @dependencies
     * @scenario
     * - insert tokens with mixed-case name
     * - call searchTokens with query using different case
     * @expected
     * - should return the matching token
     */
    it('should find tokens by name (case-insensitive)', async () => {
      const [items, total] = await action.searchTokens('TeST', 0, 100);
      expect(total).toBe(1);
      expect(items.map((t) => t.id)).toEqual(['cccc3333']);
    });

    /**
     * @target should find tokens by id using case-insensitive partial match
     * @dependencies
     * @scenario
     * - insert tokens with known id
     * - call searchTokens using partial id in different case
     * @expected
     * - should return the matching token
     */
    it('should find tokens by id (case-insensitive)', async () => {
      const [items, total] = await action.searchTokens('DEAD', 0, 100);
      expect(total).toBe(1);
      expect(items.map((t) => t.id)).toEqual(['deadbeef']);
    });

    /**
     * @target should apply offset/limit pagination while returning total matching count
     * @dependencies
     * @scenario
     * - insert 5 tokens
     * - call searchTokens with query '' to match all tokens
     * - request a limited page with an offset near the end
     * @expected
     * - should return total=5 and items limited by offset/limit
     */
    it('should paginate results using offset and limit', async () => {
      const [page1Items, page1Total] = await action.searchTokens('', 0, 2);
      expect(page1Total).toBe(5);
      expect(page1Items).toHaveLength(2);

      const [page3Items, page3Total] = await action.searchTokens('', 4, 2);
      expect(page3Total).toBe(5);
      expect(page3Items).toHaveLength(1);
    });
  });
});
