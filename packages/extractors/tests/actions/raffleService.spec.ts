import { describe, it, expect } from 'vitest';

import { RaffleService } from '../../lib/entities';
import { RaffleServiceAction } from '../../lib/actions/raffleService';
import { createDatabase } from '../utilsFunctions.mock';
import * as testData from './data.mock';

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
     * - call insertBoxes function
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
        expect(rows[0]).toMatchObject({
          ...RaffleService,
          extractor: 'RaffleService',
          spendBlock: null,
          spendHeight: null,
        });
      },
    );

    /**
     * @target should update an existing RaffleService related spend info correctly
     * @dependencies
     * @scenario
     * - call spendBoxes
     * - check if the RaffleService have been updated in database correctly
     * @expected
     * - RaffleService should have been updated in database correctly
     */
    raffleServiceActionTest(
      `should update an existing RaffleService correctly`,
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

        const expectedData = {
          ...testData.sampleRaffleServiceEntities[1],
          creationFee: Number(
            testData.sampleRaffleServiceEntities[1].creationFee,
          ),
        };
        await action.spendBoxes(
          [
            {
              boxId: expectedData.boxId,
              txId: 'tx 2',
              index: 2,
            },
          ],
          { hash: '123', height: 200 },
          expectedData.extractor,
        );

        const [rows, rowCount] = await repository.findAndCount();

        expect(rowCount).toEqual(2);
        expect(
          rows.filter((col) => col.boxId === expectedData.boxId)[0],
        ).toMatchObject({
          ...expectedData,
          spendBlock: '123',
          spendHeight: 200,
        });
      },
    );
  });
});
