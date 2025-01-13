import { MockChain } from '@fleet-sdk/mock-chain';

import {
  RaffleServiceBoxInterface,
  InactiveRaffleBoxInterface,
} from '../../lib/interfaces/types';

const chain = new MockChain(1);
const serviceWallet = chain.newParty('service');
const implementerWallet = chain.newParty('implementer');
const creatorWallet = chain.newParty('creator');

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

export const sampleInactiveRaffleEntities: InactiveRaffleBoxInterface[] = [
  {
    boxId: '1',
    txId: 'tx 1',
    boxSerialized: 'serialized data 1',
    extractor: 'InactiveRaffle-InactiveRaffle',
    serviceErgoTree: serviceWallet.ergoTree.toString(),
    implementorErgoTree: implementerWallet.ergoTree.toString(),
    creatorErgoTree: creatorWallet.ergoTree.toString(),
    winnersPercent: 200,
    serviceFeePercent: 200,
    implementerFeePercent: 100,
    ticketPrice: 100_000n,
    goal: 1_000_000n,
    deadline: 1_000,
    winnersPercentList: [200, 200, 200, 200, 200].toString(),
    txFee: 15_000n,
  },
  {
    boxId: '2',
    txId: 'tx 2',
    boxSerialized: 'serialized data 2',
    extractor: 'InactiveRaffle-InactiveRaffle',
    serviceErgoTree: serviceWallet.ergoTree.toString(),
    implementorErgoTree: implementerWallet.ergoTree.toString(),
    creatorErgoTree: creatorWallet.ergoTree.toString(),
    winnersPercent: 200,
    serviceFeePercent: 200,
    implementerFeePercent: 100,
    ticketPrice: 100_000n,
    goal: 1_000_000n,
    deadline: 1_000,
    winnersPercentList: [200, 200, 200, 200, 200].toString(),
    txFee: 15_000n,
  },
  {
    boxId: '3',
    txId: 'tx 3',
    boxSerialized: 'serialized data 3',
    extractor: 'InactiveRaffle-InactiveRaffle',
    serviceErgoTree: serviceWallet.ergoTree.toString(),
    implementorErgoTree: implementerWallet.ergoTree.toString(),
    creatorErgoTree: creatorWallet.ergoTree.toString(),
    winnersPercent: 200,
    serviceFeePercent: 200,
    implementerFeePercent: 100,
    ticketPrice: 100_000n,
    goal: 1_000_000n,
    deadline: 1_000,
    winnersPercentList: [200, 200, 200, 200, 200].toString(),
    txFee: 15_000n,
  },
];
