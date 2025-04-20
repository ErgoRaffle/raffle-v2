import { DataSource } from 'typeorm';
import {
  TransactionEntity,
  TransactionStatus,
  migrations,
} from '@rosen-bridge/tx-pot';

export const unconfirmedTxList = [
  {
    id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
    inputs: [
      {
        boxId: '0'.repeat(64),
        spendingProof: {
          proofBytes:
            '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          extension: {
            '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
          },
        },
      },
    ],
    dataInputs: [],
    outputs: [
      {
        boxId:
          '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
        value: 147,
        ergoTree:
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        creationHeight: 9149,
        assets: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            amount: 1000,
          },
        ],
        additionalRegisters: {
          R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
        },
        transactionId:
          '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
        index: 0,
      },
    ],
    size: 0,
  },
];

export const mockDataSource = async () => {
  const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [TransactionEntity],
    migrations: [...migrations.sqlite],
    synchronize: false,
    logging: false,
  });

  await testDataSource.initialize();
  await testDataSource.runMigrations();

  return testDataSource;
};

export const SampleTransactionEntities: TransactionEntity[] = [
  {
    txId: 'tx-id-1',
    chain: 'chain-1',
    txType: 'tx-A',
    status: TransactionStatus.APPROVED,
    requiredSign: 1,
    lastCheck: 10010,
    lastStatusUpdate: '1685894400',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '1'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
  },
  {
    txId: 'tx-id-2',
    chain: 'chain-1',
    txType: 'tx-A',
    status: TransactionStatus.INVALID,
    requiredSign: 1,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '2'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
  },
  {
    txId: 'tx-id-3',
    chain: 'chain-2',
    txType: 'tx-A',
    status: TransactionStatus.IN_SIGN,
    requiredSign: 2,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: true,
    signFailedCount: 1,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '3'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
    extra: 'extra-1',
  },
  {
    txId: 'tx-id-4',
    chain: 'chain-1',
    txType: 'tx-B',
    status: TransactionStatus.SIGNED,
    requiredSign: 0,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: true,
    signFailedCount: 1,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '4'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
    extra: 'extra-2',
  },
  {
    txId: 'tx-id-5',
    chain: 'chain-2',
    txType: 'tx-B',
    status: TransactionStatus.IN_SIGN,
    requiredSign: 0,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '5'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
  },
  {
    txId: 'tx-id-6',
    chain: 'chain-2',
    txType: 'tx-B',
    status: TransactionStatus.SENT,
    requiredSign: 0,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '6'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
  },
  {
    txId: 'tx-id-7',
    chain: 'chain-2',
    txType: 'tx-B',
    status: TransactionStatus.COMPLETED,
    requiredSign: 0,
    lastCheck: 0,
    lastStatusUpdate: '1685894220',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: JSON.stringify({
      id: '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      inputs: [
        {
          boxId: '7'.repeat(64),
          spendingProof: {
            proofBytes:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd1173ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            extension: {
              '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
            },
          },
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          value: 147,
          ergoTree:
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          creationHeight: 9149,
          assets: [
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000,
            },
          ],
          additionalRegisters: {
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          },
          transactionId:
            '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          index: 0,
        },
      ],
      size: 0,
    }),
  },
];
