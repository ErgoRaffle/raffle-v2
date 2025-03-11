import { describe, it, expect, afterEach } from 'vitest';
import { omit } from 'lodash-es';

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

const dataSource = await createDatabase();
const queryRunner = dataSource.createQueryRunner();
const repository = queryRunner.manager.getRepository(RaffleDetailsEntity);
const pictureRepository = queryRunner.manager.getRepository(PictureEntity);
const action = new RaffleDetailsAction(dataSource);

const makeNewRaffleDetailsEntity = async () => {
  const raffleDetailsEntity = new RaffleDetailsEntity();
  raffleDetailsEntity.block = sampleDBData['block'];
  raffleDetailsEntity.boxId = sampleDBData['boxId'];
  raffleDetailsEntity.name = sampleDBData['name'];
  raffleDetailsEntity.description = sampleDBData['description'];
  raffleDetailsEntity.extractor = sampleDBData['extractor'];
  raffleDetailsEntity.height = sampleDBData['height'];
  raffleDetailsEntity.raffleId = sampleDBData['raffleId'];
  raffleDetailsEntity.serialized = sampleDBData['serialized'];
  raffleDetailsEntity.spendBlock = sampleDBData['spendBlock'];
  raffleDetailsEntity.spendHeight = sampleDBData['spendHeight'];
  raffleDetailsEntity.txId = sampleDBData['txId'];
  const result = await repository.manager.save(raffleDetailsEntity);
  return await repository.findOne({ where: { id: result.id } });
};

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
     * @expected
     * - RaffleDetails should stored details and related pictures
     */
    it('should successfully store picture entities to db by valid data', async () => {
      await action.insertEntities(
        queryRunner,
        sampleBoxesData,
        { height: 1, hash: '0' },
        'RaffleDetails',
      );
      expect(await repository.count()).toEqual(1);
      expect(omit((await repository.find())[0], 'id')).toEqual(sampleDBData);
      expect(await pictureRepository.count()).toEqual(3);
      expect(
        (await pictureRepository.find()).map((pic) => omit(pic, 'id')),
      ).toEqual(sampleDBPicturesData);
    });

    /**
     * @target should successfully store raffleDetail entity without pictures to db by valid data
     * @dependencies
     * @scenario
     * - call the insertEntities functions
     * @expected
     * - RaffleDetails should stored details without any pictures
     */
    it('should successfully store raffleDetail entity without pictures to db by valid data', async () => {
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
      expect(omit((await repository.find())[0], 'id')).toEqual(sampleDBData);
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
    it('should successfully update picture entities to db by valid data', async () => {
      const raffleDetailsObject = await makeNewRaffleDetailsEntity();
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: { id: raffleDetailsObject!.id } };
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
      expect(omit((await repository.find())[0], 'id')).toEqual(sampleDBData);
      expect(await pictureRepository.count()).toEqual(2);
      expect(
        (await pictureRepository.find()).map((pic) => omit(pic, 'id')),
      ).toEqual(sampleUpdatedPicturesDBData.slice(0, 2));
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
    it('should successfully update picture entities to a raffleDetails that does not already own any pictures with valid data', async () => {
      const raffleDetailsObject = await makeNewRaffleDetailsEntity();
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: { id: raffleDetailsObject!.id } };
        }),
      );

      await action.updateEntity(
        queryRunner,
        sampleBoxesData[0],
        { height: 1, hash: '0' },
        'RaffleDetails',
      );
      expect(await repository.count()).toEqual(1);
      expect(omit((await repository.find())[0], 'id')).toEqual(sampleDBData);
      expect(await pictureRepository.count()).toEqual(3);
      expect(
        (await pictureRepository.find()).map((pic) => omit(pic, 'id')),
      ).toEqual(sampleDBPicturesData);
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
    it('should successfully remove picture entities of a raffleDetails that already owned pictures with valid data', async () => {
      const raffleDetailsObject = await makeNewRaffleDetailsEntity();
      await pictureRepository.insert(
        sampleDBPicturesData.map((pic) => {
          return { ...pic, details: { id: raffleDetailsObject!.id } };
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
      expect(omit((await repository.find())[0], 'id')).toEqual(sampleDBData);
      expect(await pictureRepository.count()).toEqual(0);
    });
  });
});
