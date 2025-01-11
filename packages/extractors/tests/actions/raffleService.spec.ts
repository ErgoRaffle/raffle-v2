import { describe, it, expect } from 'vitest';

import { RaffleService } from '../../lib/entities';
import { RaffleServiceAction } from '../../lib/actions/raffleService';
import { createDatabase } from '../utilsFunctions.mock';
import * as testData from './data.mock';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create action object
 *   - create repository object
 * @returns vitest customized "it" object
 */
const createRaffleServiceActionTest = async () => {
  const dataSource = await createDatabase();

  return it.extend({
    dataSource: dataSource,
    action: new RaffleServiceAction(dataSource),
    repository: dataSource.getRepository(RaffleService),
  });
};

const raffleServiceActionTest = await createRaffleServiceActionTest();

describe('RaffleServiceAction', () => {
  describe('insertRaffleService', () => {
    /**
     * @target should insert a nonexistent RaffleService box entity into database
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - check if the RaffleService have been saved to database successfully
     * @expected
     * - RaffleService should have been saved to database successfully
     */
    raffleServiceActionTest(
      `should insert a nonexistent RaffleService box entity into database`,
      async ({ repository, action }) => {
        const raffleServices = testData.sampleRaffleServiceEntities[0];
        await action.insertBoxes(
          [raffleServices],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        const [rows, rowsCount] = await repository.findAndCount();
        expect(rowsCount).toEqual(1);
        expect(rows[0]).toEqual({
          ...raffleServices,
          block: '123',
          creationFee: 100000000n,
          height: 1,
          extractor: 'RaffleService',
          spendBlock: null,
          spendHeight: null,
        });
      },
    );

    /**
     * @target should update data of an existing RaffleService related spend info correctly
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - update some data on the database by calling the insertBoxes method again
     * - check if the RaffleService have been updated in database correctly
     * @expected
     * - RaffleService should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should update data of an existing RaffleService related spend info correctly`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleRaffleServiceEntities[0],
            },
            {
              ...testData.sampleRaffleServiceEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        await action.insertBoxes(
          [
            {
              ...testData.sampleRaffleServiceEntities[0],
              serviceFeePercent: 200,
              implementerFeePercent: 200,
              creationFee: 100000000n,
            },
          ],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        const [rows, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(2);
        expect(
          rows.filter(
            (col) =>
              col.boxId === testData.sampleRaffleServiceEntities[0].boxId,
          )[0],
        ).toMatchObject({
          ...testData.sampleRaffleServiceEntities[0],
          serviceFeePercent: 200,
          implementerFeePercent: 200,
          creationFee: 100000000n,
        });
      },
    );

    /**
     * @target should update spend info of an existing RaffleService related spend info correctly
     * @dependencies
     * @scenario
     * - insert sample data to the database by calling the insertBoxes method
     * - update some data on the database by calling the spendBoxes method
     * - check if the RaffleService have been updated in database correctly
     * @expected
     * - RaffleService should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should update spend info of an existing RaffleService related spend info correctly`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleRaffleServiceEntities[0],
            },
            {
              ...testData.sampleRaffleServiceEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        await action.spendBoxes(
          [
            {
              boxId: testData.sampleRaffleServiceEntities[1].boxId,
              txId: 'tx 2',
              index: 2,
            },
          ],
          { hash: '123', height: 200 },
          testData.sampleRaffleServiceEntities[1].extractor,
        );

        const [rows, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(2);

        expect(
          rows.filter(
            (col) =>
              col.boxId === testData.sampleRaffleServiceEntities[1].boxId,
          )[0],
        ).toMatchObject({
          ...testData.sampleRaffleServiceEntities[1],
          spendBlock: '123',
          spendHeight: 200,
        });
      },
    );

    /**
     * @target should remove all RaffleService boxes data
     * @dependencies
     * @scenario
     * - insert sample data to the database
     * - call the removeAllData method of RaffleServiceAction object
     * - check database for deleted data
     * @expected
     * - RaffleService should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should remove all RaffleService boxes data`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleRaffleServiceEntities[0],
            },
            {
              ...testData.sampleRaffleServiceEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        let [, rowCount] = await repository.findAndCount();
        expect(rowCount).toEqual(2);

        await action.removeAllData();

        [, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(0);
      },
    );

    /**
     * @target should delete RaffleService boxes data related to special block
     * @dependencies
     * @scenario
     * - insert sample data to the database
     * - call the deleteBlockBoxes method of RaffleServiceAction object
     * - check database for deleted data
     * @expected
     * - RaffleService should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should delete RaffleService boxes data related to special block`,
      async ({ repository, action }) => {
        await action.insertBoxes(
          [
            {
              ...testData.sampleRaffleServiceEntities[0],
            },
            {
              ...testData.sampleRaffleServiceEntities[1],
            },
          ],
          { hash: '123', height: 1 },
          'RaffleService',
        );

        let [, rowCount] = await repository.findAndCount();
        expect(rowCount).toEqual(2);

        await action.deleteBlockBoxes('123');

        [, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(0);
      },
    );
  });
});
