import { describe, it, expect, beforeEach } from 'vitest';

import { RaffleDetailsAction } from '../../lib/actions/raffleDetails';
import { createDatabase } from '../utils.mock';
import {
  sampleBoxesData,
  sampleDBData,
  sampleDBPicturesData,
  sampleUpdatedPicturesDBData,
} from './mocked/raffleDetails.mock';
import { PictureEntity, RaffleDetailsEntity } from '../../lib/entities';
import { RaffleDetailsBoxInterface } from '../../lib/interfaces/types';
import { DataSource, QueryRunner, Repository } from 'typeorm';

interface RaffleDetailsTestContext {
  dataSource: DataSource;
  queryRunner: QueryRunner;
  repository: Repository<RaffleDetailsEntity>;
  pictureRepository: Repository<PictureEntity>;
  action: RaffleDetailsAction;
}

describe('RaffleDetailsAction', () => {
  beforeEach<RaffleDetailsTestContext>(async (context) => {
    context.dataSource = await createDatabase();
    context.queryRunner = context.dataSource.createQueryRunner();
    context.repository =
      context.queryRunner.manager.getRepository(RaffleDetailsEntity);
    context.pictureRepository =
      context.queryRunner.manager.getRepository(PictureEntity);
    context.action = new RaffleDetailsAction(context.dataSource);
  });

  describe('insertEntities', () => {
    /**
     * @target should successfully store picture entities to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * @expected
     * - RaffleDetails should stored details and related pictures
     */
    it<RaffleDetailsTestContext>('should successfully store picture entities to db by valid data', async ({
      queryRunner,
      action,
      repository,
      pictureRepository,
    }) => {
      await action.insertEntities(
        queryRunner,
        sampleBoxesData,
        { height: 1, hash: '0' },
        'RaffleDetails',
      );
      expect(await repository.count()).toEqual(1);
      expect((await repository.find())[0]).toMatchObject(sampleDBData);
      expect(await pictureRepository.count()).toEqual(3);
      expect(await pictureRepository.find()).toMatchObject(
        sampleDBPicturesData,
      );
    });

    /**
     * @target should successfully store raffleDetail entity without pictures to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * @expected
     * - RaffleDetails should stored details without any pictures
     */
    it<RaffleDetailsTestContext>('should successfully store raffleDetail entity without pictures to db by valid data', async ({
      queryRunner,
      action,
      repository,
      pictureRepository,
    }) => {
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
      expect((await repository.find())[0]).toMatchObject(sampleDBData);
      expect(await pictureRepository.count()).toEqual(0);
    });
  });

  describe('updateEntity', () => {
    /**
     * @target should successfully update picture entities to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function
     * - then call the updateEntity function to override pictures data
     * @expected
     * - RaffleDetails should stored details and update related pictures
     */
    it<RaffleDetailsTestContext>('should successfully update picture entities to db by valid data', async ({
      queryRunner,
      action,
      repository,
      pictureRepository,
    }) => {
      const raffleDetailsObject = await repository.manager.save(
        RaffleDetailsEntity,
        sampleDBData,
      );
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: raffleDetailsObject };
        }),
      );

      await action.updateEntity(
        queryRunner,
        {
          ...(raffleDetailsObject as RaffleDetailsBoxInterface),
          pictures: sampleUpdatedPicturesDBData.slice(0, 2),
        },
        { height: 1, hash: '0' },
        'RaffleDetails',
      );
      expect(await repository.count()).toEqual(1);
      expect((await repository.find())[0]).toMatchObject(sampleDBData);
      expect(await pictureRepository.count()).toEqual(2);
      expect(await pictureRepository.find()).toMatchObject(
        sampleUpdatedPicturesDBData.slice(0, 2),
      );
    });

    /**
     * @target should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function for a raffleDetails without pictures
     * - then call the updateEntity function to override pictures data
     * @expected
     * - RaffleDetails should stored details and update related pictures
     */
    it<RaffleDetailsTestContext>('should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data', async ({
      queryRunner,
      action,
      repository,
      pictureRepository,
    }) => {
      const raffleDetailsObject = await repository.manager.save(
        RaffleDetailsEntity,
        sampleDBData,
      );
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: raffleDetailsObject };
        }),
      );

      await action.updateEntity(
        queryRunner,
        sampleBoxesData[0],
        { height: 1, hash: '0' },
        'RaffleDetails',
      );
      expect(await repository.count()).toEqual(1);
      expect((await repository.find())[0]).toMatchObject(sampleDBData);
      expect(await pictureRepository.count()).toEqual(3);
      expect(await pictureRepository.find()).toMatchObject(
        sampleDBPicturesData,
      );
    });

    /**
     * @target should successfully remove picture entities of a raffleDetails that already owned pictures with valid data
     * @dependencies
     * @scenario
     * - call the insertEntities function for a raffleDetails with pictures
     * - then call the updateEntity function to remove pictures data
     * @expected
     * - RaffleDetails should stored details and remove related old pictures
     */
    it<RaffleDetailsTestContext>('should successfully remove picture entities of a raffleDetails that already owned pictures with valid data', async ({
      queryRunner,
      action,
      repository,
      pictureRepository,
    }) => {
      const raffleDetailsObject = await repository.manager.save(
        RaffleDetailsEntity,
        sampleDBData,
      );
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: raffleDetailsObject };
        }),
      );

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
      expect((await repository.find())[0]).toMatchObject(sampleDBData);
      expect(await pictureRepository.count()).toEqual(0);
    });
  });
});
