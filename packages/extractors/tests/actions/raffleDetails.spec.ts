import { describe, it, expect, afterEach } from 'vitest';

import { RaffleDetailsAction } from '../../lib/actions/raffleDetails';
import { createDatabase } from '../utils.mock';
import {
  sampleBoxesData,
  sampleDBData,
  sampleUpdatedDBData,
} from './mocked/raffleDetails.mock';
import { PictureEntity, RaffleDetailsEntity } from '../../lib/entities';
import { RaffleDetailsBoxInterface } from '../../lib/interfaces/types';

const dataSource = await createDatabase();
const queryRunner = dataSource.createQueryRunner();
const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);
const pictureRepository = queryRunner.manager.getRepository(PictureEntity);

/*
 * create fixtures that contains below steps data:
 *   - create datasource and initial database
 *   - create extractor
 * @returns vitest customized "it" object
 */
const createRaffleDetailsActionTest = async () => {
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
  afterEach(async () => {
    await repository.clear();
    await pictureRepository.clear();
  });

  describe('insertEntities', () => {
    /**
     * @target should successfully store picture entities to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * - clear the db
     * @expected
     * - RaffleDetails should stored details and related pictures
     */
    actionTest(
      'should successfully store picture entities to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        await action.insertEntities(
          queryRunner,
          sampleBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(3);
        expect(await pictureRepository.find()).toEqual(sampleDBData);
      },
    );

    /**
     * @target should successfully store raffleDetail entity without pictures to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * - clear the db
     * @expected
     * - RaffleDetails should stored details without any pictures
     */
    actionTest(
      'should successfully store raffleDetail entity without pictures to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        await action.insertEntities(
          queryRunner,
          [
            {
              ...sampleBoxesData[0],
              pictures: undefined,
            },
          ],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(0);
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
     * - RaffleDetails should stored details and related pictures
     */
    actionTest(
      'should successfully update picture entities to db by valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        await action.insertEntities(
          queryRunner,
          sampleBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(3);
        expect(await pictureRepository.find()).toEqual(sampleDBData);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          {
            ...(raffleDetails as RaffleDetailsBoxInterface),
            pictures: sampleUpdatedDBData.slice(0, 2),
          },
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(2);
        expect(await pictureRepository.find()).toEqual(
          sampleUpdatedDBData.slice(0, 2),
        );
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
     * - RaffleDetails should stored details and related pictures
     */
    actionTest(
      'should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        expect(await pictureRepository.count()).toEqual(0);
        await action.insertEntities(
          queryRunner,
          [
            {
              ...sampleBoxesData[0],
              pictures: [],
            },
          ],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(0);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          sampleBoxesData[0],
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(3);
        expect(await pictureRepository.find()).toEqual(sampleDBData);
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
     * - RaffleDetails should stored details and remove related old pictures
     */
    actionTest(
      'should successfully remove picture entities of a raffleDetails that already owned pictures with valid data',
      async ({ action, queryRunner, repository, pictureRepository }) => {
        expect(await pictureRepository.count()).toEqual(0);
        await action.insertEntities(
          queryRunner,
          sampleBoxesData,
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(3);
        expect(await pictureRepository.find()).toEqual(sampleDBData);

        const raffleDetails = (
          await repository.findBy({ extractor: 'RaffleDetails' })
        ).at(0);
        expect(raffleDetails).toBeTruthy();

        await action.updateEntity(
          queryRunner,
          {
            ...sampleBoxesData[0],
            pictures: [],
          },
          { height: 1, hash: '0' },
          'RaffleDetails',
        );
        expect(await repository.count()).toEqual(1);
        expect(await pictureRepository.count()).toEqual(0);
      },
    );
  });
});
