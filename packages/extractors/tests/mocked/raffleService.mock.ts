import { OutputBox } from '@rosen-bridge/abstract-extractor';
import { SColl, SByte, SLong, SInt } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { MockChain } from '@fleet-sdk/mock-chain';

const chain = new MockChain(1);
export const serviceWallet = chain.addParty(
  '0008cd028a1d214ea0ddbae5a2304cd1f4870e6bd2b38e6b71caa0c943a9780a21c45cdb',
  'service',
);
export const implementerWallet = chain.addParty(
  '0008cd02f715df779699555ed7febbfb34b16e2844ad6040a7e455f3c3cbc6debed33f36',
  'implementer',
);
export const creatorWallet = chain.addParty(
  '0008cd02d9d15a5f83022a63614d1761f0f4bbd6bf5d01906c78b3f06cd02ede7ba76b2c',
  'creator',
);

function bigIntToUint8Array(num: bigint) {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
}

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

export const sampleInactiveRaffleBoxes: OutputBox[] = [
  {
    boxId: 'fdd619b0dd5d651207ea1e770b5b1bf3e40563c7fdb660b0625de29abde0ae0c',
    transactionId: '01'.repeat(32),
    index: 1,
    value: 1000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 100,
    assets: [
      {
        tokenId:
          '2222222222222222222222222222222222222222222222222222222222222222',
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: SColl(SLong, [
        200n, // WinnersPercentage,
        100n, // ServiceFeePercent,
        100n, // ImplementerFeePercent,
        100_000n, // TicketPrice,
        1_000_000n, // Goal,
        1_000n, // Deadline,
        15_000n, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(
          blake2b256(Buffer.from(serviceWallet.ergoTree.toString(), 'hex')),
        ),
        Array.from(
          blake2b256(Buffer.from(implementerWallet.ergoTree.toString(), 'hex')),
        ),
        Array.from(
          blake2b256(Buffer.from(creatorWallet.ergoTree.toString(), 'hex')),
        ),
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]).toHex(),
      R7: SColl(SColl(SByte), [
        Array.from(Buffer.from('3'.repeat(64), 'hex')),
        Array.from(
          blake2b256(
            Buffer.concat(
              [200n, 200n, 200n, 200n, 200n].map((n) => bigIntToUint8Array(n)),
            ),
          ),
        ),
      ]).toHex(),
      R8: SInt(5).toHex(),
    },
  },
];
