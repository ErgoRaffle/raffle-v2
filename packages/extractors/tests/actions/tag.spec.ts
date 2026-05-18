import { DataSource } from '@rosen-bridge/extended-typeorm';
import { describe, it, expect, beforeEach } from 'vitest';

import { TagAction } from '../../lib';
import { createDatabase } from '../utils.mock';

interface TestInterface {
  tagAction: TagAction;
  dataSource: DataSource;
}

describe('TagAction', () => {
  beforeEach<TestInterface>(async (ctx) => {
    const dataSource = await createDatabase();

    ctx.tagAction = new TagAction(dataSource);
    ctx.dataSource = dataSource;
  });

  describe('upsertTag', () => {
    /**
     * @target should successfully upsert a new tag
     * @dependencies
     * @scenario
     * - call the upsertTag function with a new tag
     * - check if tag is upserted correctly
     * @expected
     * - Tag should be upserted successfully
     */
    it<TestInterface>(`should successfully upsert a new tag`, async ({
      tagAction,
      dataSource,
    }) => {
      await tagAction.upsertTag('test-tag');

      const tagRepository = dataSource.getRepository('TagEntity');
      const tags = await tagRepository.find();
      expect(tags).toHaveLength(1);
      expect(tags[0].title).toBe('test-tag');
    });

    /**
     * @target should successfully update an existing tag
     * @dependencies
     * @scenario
     * - call the upsertTag function with an existing tag
     * - check if tag is updated correctly
     * @expected
     * - Tag should be updated successfully
     */
    it<TestInterface>(`should successfully update an existing tag`, async ({
      tagAction,
      dataSource,
    }) => {
      await tagAction.upsertTag('test-tag');
      await tagAction.upsertTag('test-tag');

      const tagRepository = dataSource.getRepository('TagEntity');
      const tags = await tagRepository.find();
      expect(tags).toHaveLength(1);
      expect(tags[0].title).toBe('test-tag');
    });
  });

  describe('getTags', () => {
    /**
     * @target should successfully get tags with a query
     * @dependencies
     * @scenario
     * - upsert multiple tags
     * - call the getTags function with a query
     * - check if tags are returned correctly
     * @expected
     * - Tags should be returned successfully
     */
    it<TestInterface>(`should successfully get tags with a query`, async ({
      tagAction,
    }) => {
      await tagAction.upsertTag('test-tag-1');
      await tagAction.upsertTag('test-tag-2');
      await tagAction.upsertTag('other-tag');

      const tags = await tagAction.getTags('test');

      expect(tags).toHaveLength(2);
      expect(tags[0].title).toBe('test-tag-1');
      expect(tags[1].title).toBe('test-tag-2');
    });

    /**
     * @target should successfully get tags with case insensitive query
     * @dependencies
     * @scenario
     * - upsert multiple tags with different cases
     * - call the getTags function with a lowercase query
     * - check if tags are returned correctly
     * @expected
     * - Tags should be returned successfully case insensitive
     */
    it<TestInterface>(`should successfully get tags with case insensitive query`, async ({
      tagAction,
    }) => {
      await tagAction.upsertTag('Test-Tag-1');
      await tagAction.upsertTag('TEST-TAG-2');
      await tagAction.upsertTag('other-tag');

      const tags = await tagAction.getTags('test');

      expect(tags).toHaveLength(2);
    });

    /**
     * @target should successfully get tags with offset and limit
     * @dependencies
     * @scenario
     * - upsert multiple tags
     * - call the getTags function with offset and limit
     * - check if tags are returned correctly
     * @expected
     * - Tags should be returned with correct offset and limit
     */
    it<TestInterface>(`should successfully get tags with offset and limit`, async ({
      tagAction,
    }) => {
      await tagAction.upsertTag('test-tag-1');
      await tagAction.upsertTag('test-tag-2');
      await tagAction.upsertTag('test-tag-3');
      await tagAction.upsertTag('test-tag-4');

      const tags = await tagAction.getTags('test', 1, 2);

      expect(tags).toHaveLength(2);
    });

    /**
     * @target should return empty array when no tags match query
     * @dependencies
     * @scenario
     * - upsert tags
     * - call the getTags function with a non-matching query
     * - check if empty array is returned
     * @expected
     * - Empty array should be returned
     */
    it<TestInterface>(`should return empty array when no tags match query`, async ({
      tagAction,
    }) => {
      await tagAction.upsertTag('test-tag-1');
      await tagAction.upsertTag('test-tag-2');

      const tags = await tagAction.getTags('nonexistent');

      expect(tags).toHaveLength(0);
    });
  });
});
