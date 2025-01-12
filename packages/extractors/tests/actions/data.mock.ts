import { RaffleServiceBoxInterface } from '../../lib/interfaces/types';

export const sampleRaffleServiceEntities: RaffleServiceBoxInterface[] = [
  {
    boxId: '1',
    txId: 'tx 1',
    boxSerialized: 'serialized data 1',
    extractor: 'RaffleService-RaffleService',
    serviceFeePercent: 100,
    implementerFeePercent: 100,
    creationFee: 100000000n,
  },
  {
    boxId: '2',
    txId: 'tx 2',
    boxSerialized: 'serialized data 2',
    extractor: 'RaffleService-RaffleService',
    serviceFeePercent: 200,
    implementerFeePercent: 100,
    creationFee: 100000000n,
  },
  {
    boxId: '3',
    txId: 'tx 2',
    boxSerialized: 'serialized data 3',
    extractor: 'RaffleService-RaffleService',
    serviceFeePercent: 100,
    implementerFeePercent: 100,
    creationFee: 100000000n,
  },
  {
    boxId: '4',
    txId: 'tx 4',
    boxSerialized: 'serialized data 4',
    extractor: 'RaffleService-RaffleService',
    serviceFeePercent: 50,
    implementerFeePercent: 50,
    creationFee: 100000000n,
  },
];
