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

export const sampleActiveRaffleBoxes: OutputBox[] = [
  {
    boxId: '80ee753a8e22eef579fe30f9fbee89d39d7ba87ee1c5158157e62cc898f9ac1c',
    value: 1105000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
        amount: 1n,
      },
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 999999998n,
      },
    ],
    additionalRegisters: {
      R4: '11079003c801c80180dac409d00fe6a0c5018087a70e',
      R5: '1a0320edb662d009b16812a2bd2ffd1b926b965d62040ade9241fdc4b88237a99dfebe20b894faef6f944647dac930d195680808a3fd7c660308196f2a0f4e94dc8c0fa820d217c8109e3bb5535c96d04875649efdb07b211b59bd0d1c62681baa8b8e0f11',
      R6: '0402',
      R7: '0500',
    },
    transactionId:
      '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    index: 0,
  },
];

export const sampleGiftTokenRepo: OutputBox[] = [
  {
    boxId: 'b2700f7673ca635c05a1835f91409f9d0b2d1bdc24a7539fefe64c734025b3bd',
    value: 15000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          '8f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
        amount: 2000n,
      },
    ],
    additionalRegisters: {
      R4: '100102',
      R5: '100104',
      R6: '100106',
      R7: '1102a01f8087a70e',
      R8: '0e20d29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
      R9: '10020202',
    },
    transactionId:
      '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    index: 2,
  },
];

export const sampleTicketRepo: OutputBox[] = [
  {
    boxId: '157fa1823781aab72939019ed39b6286b62b81a236efa7b5378e4436894be718',
    value: 15000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 1000000000n,
      },
    ],
    additionalRegisters: {
      R4: '0e0f5469636b65745265706f546f6b656e',
      R5: '0e00',
      R6: '0e0130',
    },
    transactionId:
      '10507382cec223dcd93d14c13009ddcbb3585d139a26ac9eb97a2b0be4c636d2',
    index: 1,
  },
];

export const sampleWinnerBoxes: OutputBox[] = [
  {
    boxId: 'f4ebd06c6795ab1eaa994cb272422c124f226c5c211b78a22e40d63ad561bd77',
    value: 60000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: '1103d00fe6a0c5018087a70e',
      R5: '0402',
      R6: '0500',
      R7: '0e208f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
    },
    transactionId:
      '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    index: 3,
  },
];

export const sampleRaffleDetailsBoxes: OutputBox[] = [
  {
    boxId: '4f444639b431ec30f6a4b96d6a42bb3489f422c98043c47670a84b0a3a495edd',
    value: 15000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
        Array.from(Buffer.from('picture content 1')),
        Array.from(Buffer.from('picture content 2')),
        Array.from(Buffer.from('picture content 3')),
      ]).toHex(),
    },
    transactionId:
      '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    index: 1,
  },
];

export const sampleGiftBoxes: OutputBox[] = [
  {
    boxId: '903b617432e1448c578459f7bec07184c733665cd8c2801cb7de83670823219f',
    value: 150000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          '8f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
        amount: 1n,
      },
      {
        tokenId:
          'a2f94479204476ab6ff8c5f461fda56ea1eedf82f4bb1da6581c3ad29e4a45ed',
        amount: 10n,
      },
    ],
    additionalRegisters: {
      R4: '0e200f318e1cd5860000282d016ef8b4ac1d06486b2e83be2777c86772b25886ecdc',
      R5: '0402',
      R6: '058087a70e',
    },
    transactionId:
      '2f146990a9e59bd604b2a6406a65ddb1134c6b81cc34406967ef9a3d8cb18ff3',
    index: 1,
  },
];

export const sampleTicketBoxes: OutputBox[] = [
  {
    boxId: '9fd19fa994e0b1ed5c21f85349d954ae94f33172cda58e5b6e4b6b65adfb92b9',
    value: 45000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 100n,
      },
    ],
    additionalRegisters: {
      R4: '0e205b1a88f00bc6013cc6506883b23aabba148346ca6fa64e4e3573592f4e3ad854',
      R5: '110400c80180dac409e6a0c501',
    },
    transactionId:
      'd961a4b661b3e6d9417add8b67d36288860b4e905abd47804a44272372d8a3f5',
    index: 1,
  },
];
