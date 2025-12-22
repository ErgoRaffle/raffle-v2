import { vi } from 'vitest';
import { TransactionEntity, TransactionStatus } from '@rosen-bridge/tx-pot';
import { DeserializeTx, DeserializedTx } from '../../lib';

export const sampleNodeURL = 'http://localhost:9053';

// Sample transaction entities for TxPot
export const sampleTransactionEntity: TransactionEntity = {
  txId: 'tx-id-1',
  chain: 'ergo',
  txType: 'test-tx',
  status: TransactionStatus.SIGNED,
  requiredSign: 1,
  lastCheck: 10010,
  lastStatusUpdate: '1685894400',
  failedInSign: false,
  signFailedCount: 0,
  serializedTx: 'serializedTx1',
};

export const sampleDeserializedTx = {
  id: '29f7f71b891c7ced9c6cb906cd8420d5e7cdb6181ebac329ddeeb05c8fb011e7',
  blockId: 'fbb9b245a0d3e08b335e740393647b2bd172e680bee669fdb61514b9b10a05d7',
  inclusionHeight: 1583190,
  timestamp: 1754307027404,
  index: 3,
  globalIndex: 3148574,
  numConfirmations: 5,
  inputs: [
    {
      boxId: '53fd83308882507e31aac4cc7a5708e24689db2f72be933b3dece6c224de1f97',
      spendingProof: {
        proofBytes:
          '121d4da1199f019fff81970c0bbf3e480080102741e25618bdbecf9fb2caa63395ce7dee29cc81bf24fed0b60a1271367cd7fd1654732f68',
        extension: {},
      },
    },
    {
      boxId: 'd61a8f4499ad88d05e9033f8a75bb44435bc0cf2e24b32b1610b61cdbccef95e',
      spendingProof: {
        proofBytes:
          'c6dc647205ff1cf86b4c7600bad317ded2912e3a34b05bf775bbe31ce0c3ebe3e742642dcbca60b13a1dc11ad765d5878738f17da4b11afb',
        extension: {},
      },
    },
  ],
  dataInputs: [],
  outputs: [
    {
      boxId: '3827d04efbf2b080a6acec2c51a3168c4f7803c817c8efc24baa2d501cddcbcd',
      transactionId:
        '29f7f71b891c7ced9c6cb906cd8420d5e7cdb6181ebac329ddeeb05c8fb011e7',
      blockId:
        'fbb9b245a0d3e08b335e740393647b2bd172e680bee669fdb61514b9b10a05d7',
      value: 6696354869n,
      index: 0,
      globalIndex: 14794764,
      creationHeight: 1583188,
      settlementHeight: 1583190,
      ergoTree:
        '0008cd02deb9e152b4e1c2d5f36271ac9b799f7a40abfcc08c599ead30ef9b9abb7c5c97',
      address: '9gD9khJaxi3SvcX9VVPQ3vnV3xUTonVQe3Fvg5X7cGGbXMRgd8i',
      assets: [],
      additionalRegisters: {},
      spentTransactionId: null,
      mainChain: true,
    },
    {
      boxId: '602b2d9621e071fd38e4c5aa95d78eb227176089b394f47ecbb67f113b5421bc',
      transactionId:
        '29f7f71b891c7ced9c6cb906cd8420d5e7cdb6181ebac329ddeeb05c8fb011e7',
      blockId:
        'fbb9b245a0d3e08b335e740393647b2bd172e680bee669fdb61514b9b10a05d7',
      value: 1000000n,
      index: 1,
      globalIndex: 14794765,
      creationHeight: 1583188,
      settlementHeight: 1583190,
      ergoTree:
        '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
      address:
        '2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe',
      assets: [],
      additionalRegisters: {},
      spentTransactionId:
        '9410538aa83cffcbc943604cb7ce8b312dd045d72fdc06d349d64b0a2b58a96f',
      mainChain: true,
    },
  ],
  size: 343,
};

// Sample unconfirmed transactions for Node API
export const sampleUnconfirmedTransactions = [
  {
    id: 'unconfirmed-tx-1',
    inputs: [{ boxId: 'mempool-input-1' }, { boxId: 'mempool-input-2' }],
    outputs: [
      {
        globalIndex: 49266592n,
        inclusionHeight: 1583171,
        address: '9h9HiDYF9DJRhzSFemH7vcsi5wb34wgc8dNfejSkdXNA4KAmAP5',
        spentTransactionId:
          '29f7f71b891c7ced9c6cb906cd8420d5e7cdb6181ebac329ddeeb05c8fb011e7',
        boxId:
          '53fd83308882507e31aac4cc7a5708e24689db2f72be933b3dece6c224de1f97',
        value: 5632400000n,
        ergoTree:
          '0008cd0359a6b621cd8a1b1e24f455804a7354189c3bba443df6587ad16e63cb3f76f05f',
        assets: [],
        creationHeight: 1583170,
        additionalRegisters: {},
        transactionId:
          'ccc0f5b3b4120600112cb6dddfcc6e2537ec0e2a00af1569dbb159d0bc41bf41',
        index: 6,
      },
    ],
  },
  {
    id: 'unconfirmed-tx-2',
    inputs: [{ boxId: 'mempool-input-3' }],
    outputs: [
      {
        globalIndex: 49266668n,
        inclusionHeight: 1583176,
        address: '9ebEJLH1oquADNcGq3D4uHfHT9N52iNhVnVfgqsE9L9ZihuocVk',
        spentTransactionId: null,
        boxId:
          '9de7ed1dc3ca850728916162b3a86e544dd341c3c62dd4718217d0355a019205',
        value: 2450065117n,
        ergoTree:
          '0008cd0209772de953aa635cf846678429837e327f366797d82160dbd3b0d4e348a6bbf9',
        assets: [],
        creationHeight: 1583175,
        additionalRegisters: {},
        transactionId:
          '78fd186d22ac6b24f44d686d303113f2869bbcff5f5eeae42ec05d412996545e',
        index: 0,
      },
    ],
  },
];

// Mock TxPot instance
export const sampleTxPot = {
  getTxsByStatus: vi.fn().mockImplementation((status: TransactionStatus) => {
    if (status === TransactionStatus.SIGNED) {
      return Promise.resolve([sampleTransactionEntity]);
    }
    return Promise.resolve([]);
  }),
};

// Mock Node API instance
export const sampleNodeAPI = {
  getUnconfirmedTransactions: vi.fn().mockImplementation(({ offset }) => {
    // Simulate pagination
    if (offset === 0) {
      return Promise.resolve(sampleUnconfirmedTransactions);
    } else {
      return Promise.resolve([]); // No more pages
    }
  }),
};

/**
 * Creates a mock TxPot transaction deserializer for tests.
 */
export const createMockDeserializeTx = () => {
  return vi
    .fn<DeserializeTx>()
    .mockReturnValue(sampleDeserializedTx as unknown as DeserializedTx);
};
