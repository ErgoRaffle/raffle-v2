import { vi } from 'vitest';
import { Request } from '../../lib/types';
import { OutputBox, Asset } from '../../lib';
import { DeserializeTx } from '../../lib/dataProvider';

export const sampleNodeURL = 'http://localhost:9053';

// Sample token amounts
const sampleToken1: Asset = {
  tokenId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
  amount: 1000n,
};

const sampleToken2: Asset = {
  tokenId: '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
  amount: 500n,
};

// Sample ergo trees
const sampleErgoTree =
  '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041';

// Mock callback functions
const mockOnSuffice = async () => {};
const mockGetConfirmedBoxes = async () => [];

// Sample ErgoBoxes
export const sampleErgoBoxes = {
  validBoxWithTokens: {
    boxId: '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
    value: 1000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken1, sampleToken2],
    additionalRegisters: {},
    transactionId:
      '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
    index: 0,
  } as OutputBox,

  validBoxWithErgs: {
    boxId: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    value: 5000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [],
    additionalRegisters: {},
    transactionId:
      '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    index: 0,
  } as OutputBox,
};

// Sample mined boxes
export const sampleMinedBoxes = [
  {
    boxId: 'mined-box-1',
    value: 2000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken1],
    additionalRegisters: {},
    transactionId: 'mined-tx-1',
    index: 0,
  } as OutputBox,
  {
    boxId: 'mined-box-2',
    value: 3000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: [sampleToken2],
    additionalRegisters: {},
    transactionId: 'mined-tx-2',
    index: 0,
  } as OutputBox,
];

// Sample requests
export const sampleRequests = {
  validRequest: {
    ergoTree: sampleErgoTree,
    value: 1000000n,
    tokens: [sampleToken1],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,

  ergOnlyRequest: {
    ergoTree: sampleErgoTree,
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

/**
 * A simple no-op deserializer used for tests that don't care about txpot content.
 */
export const noopDeserializeTx: DeserializeTx = () => ({
  id: 'tx',
  inputs: [],
  outputs: [],
});
