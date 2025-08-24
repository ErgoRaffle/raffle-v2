import { vi } from 'vitest';
import { Network, ErgoBox } from '@fleet-sdk/core';
import { TokenAmount } from '@fleet-sdk/core';
import { Request } from '../../lib/types';

export const sampleNodeURL = 'http://localhost:9053';
export const sampleNetworkType: Network = Network.Mainnet;

// Sample token amounts
const sampleToken1: TokenAmount<bigint> = {
  tokenId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
  amount: 1000n,
};

const sampleToken2: TokenAmount<bigint> = {
  tokenId: '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
  amount: 500n,
};

// Sample addresses
const sampleAddress = '9fSgUi6Z7kOnxq94voRFuJbDrZfStJn6f2q7oEwj4vJtQp6nR8M';

// Sample ergo trees
const sampleErgoTree =
  '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041';

// Mock callback functions
const mockOnSuffice = async () => {};
const mockGetConfirmedBoxes = async () => [];

// Sample ErgoBoxes
export const sampleErgoBoxes = {
  validBoxWithTokens: new ErgoBox({
    boxId: '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
    value: 1000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken1, sampleToken2],
    additionalRegisters: {},
    transactionId:
      '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
    index: 0,
  }),

  validBoxWithErgs: new ErgoBox({
    boxId: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    value: 5000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    index: 0,
  }),
};

// Sample mined boxes
export const sampleMinedBoxes = [
  new ErgoBox({
    boxId: 'mined-box-1',
    value: 2000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken1],
    additionalRegisters: {},
    transactionId: 'mined-tx-1',
    index: 0,
  }),
  new ErgoBox({
    boxId: 'mined-box-2',
    value: 3000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken2],
    additionalRegisters: {},
    transactionId: 'mined-tx-2',
    index: 0,
  }),
];

// Sample requests
export const sampleRequests = {
  validRequest: {
    address: sampleAddress,
    value: 1000000n,
    tokens: [sampleToken1],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,

  ergOnlyRequest: {
    address: sampleAddress,
    value: 5000000n,
    tokens: [],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,
};

// Mock TxPot instance
export const sampleTxPot = {
  getTxsByStatus: vi.fn().mockResolvedValue([]),
  txRepository: {},
  chains: [],
  validators: [],
  txTypeCallbacks: {},
};
