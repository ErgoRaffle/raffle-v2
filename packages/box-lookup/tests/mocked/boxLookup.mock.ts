import { DataSource } from 'typeorm';
import {
  TransactionEntity,
  TransactionStatus,
  migrations,
} from '@rosen-bridge/tx-pot';
import {
  ErgoTree,
  ErgoUnsignedInput,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { serializeTransaction } from '@fleet-sdk/serializer';
import { ErgoHDKey, Prover } from '@fleet-sdk/wallet';

const ownerMnemonic =
  'seek staff often window cotton jump damp rate paddle dune before eagle ozone riot stamp';
const sampleKey = (await ErgoHDKey.fromMnemonic(ownerMnemonic)).deriveChild(0);
const prover = new Prover();

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

export const SampleTxs: ReturnType<typeof prover.signTransaction>[] = [];
export const SampleTransactionEntities: TransactionEntity[] = [];
for (let i = 0; i < 10; i++) {
  const utxo = new ErgoUnsignedInput(
    mockUTxO({
      value: 147n,
      ergoTree:
        '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
      creationHeight: 9149,
      assets: [
        {
          tokenId:
            '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
          amount: 1000n,
        },
      ],
      additionalRegisters: {
        R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
      },
      transactionId:
        '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      index: 0,
    }),
  );

  utxo.setContextExtension({
    '1': 'a2aed72ff1b139f35d1ad2938cb44c9848a34d4dcfd6d8ab717ebde40a7304f2541cf628ffc8b5c496e6161eba3f169c6dd440704b1719e0',
  });

  const sampleTx = prover.signTransaction(
    new TransactionBuilder(0)
      .from([utxo])
      .to([
        new OutputBuilder(
          147n,
          new ErgoTree(
            '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
          ),
        )
          .addTokens([
            {
              tokenId:
                '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
              amount: 1000n,
            },
          ])
          .setAdditionalRegisters({
            R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
          }),
      ])
      .build()
      .toEIP12Object(),
    [sampleKey],
  );
  SampleTxs.push(sampleTx);
  const sampleSerializedTx = Buffer.from(
    serializeTransaction(sampleTx).toBytes(),
  ).toString('base64');

  let status = TransactionStatus.APPROVED;
  if (i == 0) status = TransactionStatus.SIGNED;
  else if (i == 1) status = TransactionStatus.SENT;
  else if (i == 2) status = TransactionStatus.COMPLETED;

  SampleTransactionEntities.push({
    txId: `tx-id-${i + 1}`,
    chain: 'ergo',
    txType: 'tx-A',
    status: status,
    requiredSign: 1,
    lastCheck: 10010,
    lastStatusUpdate: '1685894400',
    failedInSign: false,
    signFailedCount: 0,
    serializedTx: sampleSerializedTx,
  });
}
