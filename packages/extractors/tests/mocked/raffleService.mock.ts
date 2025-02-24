import { OutputBox } from '@rosen-bridge/abstract-extractor';

export const sampleRaffleServiceBoxes: OutputBox[] = [
  {
    boxId: 'b530a35bcea35f3fff4bf630a9b4932537723c0a9dbf0775884ed5493743c5cb',
    transactionId: '01'.repeat(32),
    index: 1,
    value: 1000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 100,
    assets: [
      {
        tokenId:
          '1111111111111111111111111111111111111111111111111111111111111111',
        amount: 1n,
      },
      {
        tokenId:
          '2222222222222222222222222222222222222222222222222222222222222222',
        amount: 1000000n,
      },
    ],
    additionalRegisters: {
      R4: '1104c801c801c00ce0a712',
      R5: '0e201fdea60c0fafb8a32524db8f4019db67b12a62c49f4b95c14b78902de2ecd4bc',
    },
  },
];
