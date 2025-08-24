import { ErgoBox, Network, TokenAmount } from '@fleet-sdk/core';
import { Request } from '../../lib/types';

export const sampleNetworkType: Network = Network.Mainnet;

// Sample token amounts
export const sampleToken1: TokenAmount<bigint> = {
  tokenId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
  amount: 1000n,
};

export const sampleToken2: TokenAmount<bigint> = {
  tokenId: '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
  amount: 500n,
};

// Sample addresses
const sampleAddress = '9hTzWFBxRLV3SDSUkqf7N9ySVfy4MCMEvfqLNgkEx9ngmeBrNiy';

// Sample ergo trees
const sampleErgoTree =
  '0008cd03841e932c6447d2d576eb39e024940599ead12f5a2563b275cabe0b93baf9e47a';
const differentErgoTree =
  '0008cd025eb059a733e86d9a235daf6e40fc18b27c975da27a2ec00791c336930c8b55de';

// Mock callback functions
const mockOnSuffice = async () => {};
const mockGetConfirmedBoxes = async () => [];
const emptyTokens: TokenAmount<bigint>[] = [];

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
  } as ErgoBox,

  validBoxWithErgs: {
    boxId: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    value: 5000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: emptyTokens,
    additionalRegisters: {},
    transactionId:
      '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
    index: 0,
  } as ErgoBox,

  boxWithDifferentAddress: {
    boxId: '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd119',
    value: 1000000n,
    ergoTree: differentErgoTree,
    creationHeight: 9149,
    assets: [sampleToken1],
    additionalRegisters: {},
    transactionId:
      '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd119',
    index: 0,
  } as ErgoBox,

  boxWithoutTokens: {
    boxId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd120',
    value: 1000000n,
    ergoTree: sampleErgoTree,
    creationHeight: 9149,
    assets: emptyTokens,
    additionalRegisters: {},
    transactionId:
      '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd120',
    index: 0,
  } as ErgoBox,
};

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

  highErgRequest: {
    address: sampleAddress,
    value: 10000000n, // Higher than available ergs
    tokens: [sampleToken1],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,

  highTokenRequest: {
    address: sampleAddress,
    value: 1000000n,
    tokens: [
      {
        tokenId: sampleToken1.tokenId,
        amount: 2000n, // Higher than available tokens
      },
    ],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,

  noValueRequest: {
    address: sampleAddress,
    value: undefined,
    tokens: [sampleToken1],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,

  noRequrirementRequest: {
    address: sampleAddress,
    value: undefined,
    tokens: [],
    onSuffice: mockOnSuffice,
    getConfirmedBoxes: mockGetConfirmedBoxes,
  } as Request,
};
