import { describe, it, expect } from 'vitest';

import { InactiveRaffle } from '../../lib/entities';
import { InactiveRaffleAction } from '../../lib/actions/inactiveRaffle';
import { createDatabase } from '../utilsFunctions.mock';
import * as testData from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create action object
 *   - create repository object
 * @returns vitest customized "it" object
 */
const createInactiveRaffleActionTest = async () => {
  const dataSource = await createDatabase();

  return it.extend({
    dataSource: dataSource,
    action: new InactiveRaffleAction(dataSource),
    repository: dataSource.getRepository(InactiveRaffle),
  });
};

const raffleServiceActionTest = await createInactiveRaffleActionTest();

describe('InactiveRaffleAction', () => {
  describe('insert', () => {
    /**
     * @target should insert a nonexistent InactiveRaffle box entity into database
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - check if the InactiveRaffle have been saved to database successfully
     * @expected
     * - InactiveRaffle should have been saved to database successfully
     */
    raffleServiceActionTest(
      `should insert a nonexistent InactiveRaffle box entity into database`,
      async ({ repository, action }) => {
        const raffleServices = testData.sampleInactiveRaffleEntities[0];
        await action.insertBoxes(
          [raffleServices],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        const [rows, rowsCount] = await repository.findAndCount();
        expect(rowsCount).toEqual(1);
        expect(rows[0]).toEqual({
          ...raffleServices,
          block: '123',
          height: 1,
          spendBlock: null,
          spendHeight: null,
        });
      },
    );
  });

  describe('update', () => {
    /**
     * @target should update data of an existing InactiveRaffle correctly
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - update some data on the database by calling the insertBoxes method again
     * - check if the InactiveRaffle have been updated in database correctly
     * @expected
     * - InactiveRaffle should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should update data of an existing InactiveRaffle correctly`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleInactiveRaffleEntities[0],
            },
            {
              ...testData.sampleInactiveRaffleEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        await action.insertBoxes(
          [
            {
              ...testData.sampleInactiveRaffleEntities[0],
              serviceFeePercent: 200,
              implementerFeePercent: 200,
            },
          ],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        const [rows, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(2);
        expect(
          rows.filter(
            (col) =>
              col.boxId === testData.sampleInactiveRaffleEntities[0].boxId,
          )[0],
        ).toEqual({
          ...testData.sampleInactiveRaffleEntities[0],
          block: '123',
          height: 1,
          spendBlock: null,
          spendHeight: null,
          serviceFeePercent: 200,
          implementerFeePercent: 200,
        });
      },
    );

    /**
     * @target should update spend info of an existing InactiveRaffle correctly
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - update some data on the database by calling the spendBoxes method
     * - check if the InactiveRaffle have been updated in database correctly
     * @expected
     * - InactiveRaffle should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should update spend info of an existing InactiveRaffle correctly`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleInactiveRaffleEntities[0],
            },
            {
              ...testData.sampleInactiveRaffleEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        await action.spendBoxes(
          [
            {
              boxId: testData.sampleInactiveRaffleEntities[1].boxId,
              txId: 'tx 2',
              index: 2,
            },
          ],
          { hash: '123', height: 200 },
          'InactiveRaffle',
        );

        const [rows, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(2);

        expect(
          rows.filter(
            (col) =>
              col.boxId === testData.sampleInactiveRaffleEntities[1].boxId,
          )[0],
        ).toEqual({
          ...testData.sampleInactiveRaffleEntities[1],
          height: 1,
          block: '123',
          spendBlock: '123',
          spendHeight: 200,
        });
      },
    );
  });

  describe('delete', () => {
    /**
     * @target should delete all InactiveRaffle boxes data
     * @dependencies
     * @scenario
     * - insert sample data to the database
     * - call the removeAllData method of InactiveRaffleAction object
     * - check database for deleted data
     * @expected
     * - InactiveRaffle should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should delete all InactiveRaffle boxes data`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleInactiveRaffleEntities[0],
            },
            {
              ...testData.sampleInactiveRaffleEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        let [, rowCount] = await repository.findAndCount();
        expect(rowCount).toEqual(2);

        await action.removeAllData('InactiveRaffle');

        [, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(0);
      },
    );

    /**
     * @target should delete InactiveRaffle boxes data related to special block
     * @dependencies
     * @scenario
     * - insert sample data to the database
     * - call the deleteBlockBoxes method of InactiveRaffleAction object
     * - check database for deleted data
     * @expected
     * - InactiveRaffle should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should delete InactiveRaffle boxes data related to special block`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleInactiveRaffleEntities[0],
            },
            {
              ...testData.sampleInactiveRaffleEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'InactiveRaffle',
        );

        let [, rowCount] = await repository.findAndCount();
        expect(rowCount).toEqual(2);

        await action.deleteBlockBoxes('123', 'InactiveRaffle');

        [, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(0);
      },
    );
  });
});
