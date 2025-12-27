export const sampleToken = {
  tokenId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
  amount: 10n,
};

export const sampleToken2 = {
  tokenId: '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd118',
  amount: 6n,
};

export const sampleTxId =
  '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117';

export const sampleErgoTree =
  '0008cd03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

export const sampleErgoBoxCandidate = {
  ergoTree: sampleErgoTree,
  creationHeight: 100,
  value: 1000000n,
  assets: [sampleToken],
  additionalRegisters: { R4: '0e' },
};

export const sampleSerializedTx = '3q2+7w==';

export const sampleDeserializeTransactionResult = {
  id: sampleTxId,
  inputs: [
    {
      boxId: '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd119',
      spendingProof: null,
    },
  ],
  dataInputs: [],
  outputs: [
    {
      boxId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd120',
      value: 3n,
      ergoTree: sampleErgoTree,
      creationHeight: 10,
      assets: [{ tokenId: sampleToken.tokenId, amount: 5n }],
      additionalRegisters: {},
      transactionId: sampleTxId,
      index: 0,
    },
    {
      boxId: '5ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd121',
      value: 4n,
      ergoTree: sampleErgoTree,
      creationHeight: 11,
      assets: [{ tokenId: sampleToken2.tokenId, amount: 6n }],
      additionalRegisters: {},
      transactionId: sampleTxId,
      index: 1,
    },
  ],
};
