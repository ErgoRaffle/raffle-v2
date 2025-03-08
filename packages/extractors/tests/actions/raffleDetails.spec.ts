import { describe, it, expect } from 'vitest';

import { RaffleDetailsAction } from '../../lib/actions/raffleDetails';
import { createDatabase } from '../utils.mock';
import { sampleInsertBoxesData } from './mocked/raffleDetails.mock';
import { PictureEntity, RaffleDetailsEntity } from '../../lib/entities';
import { RaffleDetailsBoxInterface } from '../../lib/interfaces/types';

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createRaffleDetailsActionTest = async () => {
  const dataSource = await createDatabase();
  const queryRunner = dataSource.createQueryRunner();
  const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);
  const pictureRepository = queryRunner.manager.getRepository(PictureEntity);

  await repository.clear();
  await pictureRepository.clear();

  return it.extend({
    action: new RaffleDetailsAction(dataSource),
    queryRunner: dataSource.createQueryRunner(),
    repository: repository,
    pictureRepository: pictureRepository,
  });
};

const actionTest = await createRaffleDetailsActionTest();

describe('RaffleDetailsAction', () => {
  describe('insertEntities', () => {
    /**
     * @target should successfully store picture entities to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * - clear the db
     * @expected
     * - RaffleDetails should stored pictures
     */
    actionTest(
      'should successfully store picture entities to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        await action.insertEntities(
          queryRunner,
          sampleInsertBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(3);

        await repository.clear();
        await pictureRepository.clear();
      },
    );

    /**
     * @target should successfully store raffleDetail entity without pictures to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * - clear the db
     * @expected
     * - RaffleDetails should stored pictures
     */
    actionTest(
      'should successfully store raffleDetail entity without pictures to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        await action.insertEntities(
          queryRunner,
          [
            {
              ...sampleInsertBoxesData[0],
              pictures: undefined,
            },
          ],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(0);

        await repository.clear();
        await pictureRepository.clear();
      },
    );
  });

  describe('updateEntity', () => {
    /**
     * @target should successfully update picture entities to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function
     * - then call the updateEntity function to override pictures data
     * - clear the db
     * @expected
     * - RaffleDetails should stored pictures
     */
    actionTest(
      'should successfully update picture entities to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        expect(await pictureRepository.count()).toEqual(0);
        await action.insertEntities(
          queryRunner,
          sampleInsertBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(3);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          {
            ...(raffleDetails as RaffleDetailsBoxInterface),
            pictures: [
              {
                orderIndex: 0,
                raffleId:
                  'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
                content: 'updated picture content 1',
              },
              {
                orderIndex: 1,
                raffleId:
                  'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
                content: 'updated picture content 2',
              },
            ],
          },
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(2);

        await repository.clear();
        await pictureRepository.clear();
      },
    );

    /**
     * @target should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function for a raffleDetails without pictures
     * - then call the updateEntity function to override pictures data
     * - clear the db
     * @expected
     * - RaffleDetails should stored pictures
     */
    actionTest(
      'should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        expect(await pictureRepository.count()).toEqual(0);
        await action.insertEntities(
          queryRunner,
          [
            {
              ...sampleInsertBoxesData[0],
              pictures: [],
            },
          ],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(0);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          sampleInsertBoxesData[0],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(3);

        await repository.clear();
        await pictureRepository.clear();
      },
    );

    /**
     * @target should successfully remove picture entities of a raffleDetails that already owned pictures with valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function for a raffleDetails with pictures
     * - then call the updateEntity function to remove pictures data
     * - clear the db
     * @expected
     * - RaffleDetails should stored pictures
     */
    actionTest(
      'should successfully remove picture entities of a raffleDetails that already owned pictures with valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        expect(await pictureRepository.count()).toEqual(0);
        await action.insertEntities(
          queryRunner,
          sampleInsertBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(3);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          {
            ...sampleInsertBoxesData[0],
            pictures: [],
          },
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await pictureRepository.count()).toEqual(0);

        await repository.clear();
        await pictureRepository.clear();
      },
    );
  });
});
