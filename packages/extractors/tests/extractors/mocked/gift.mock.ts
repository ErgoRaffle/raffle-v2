import { OutputBox } from '@rosen-bridge/scanner-interfaces';

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

export const sampleGiftExtractedData = {
  boxId: sampleGiftBoxes[0].boxId,
  txId: sampleGiftBoxes[0].transactionId,
  winnerIndex: 1,
  donatorErgoTree:
    '0f318e1cd5860000282d016ef8b4ac1d06486b2e83be2777c86772b25886ecdc',
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'gKPDRxkGAQEB0XMArtBiAo9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8K' +
    'AaL5RHkgRHarb/jF9GH9pW6h7t+C9LsdplgcOtKeSkXtCgMOIA8xjhzVhgAAKC0B' +
    'bvi0rB0GSGsug74nd8hncrJYhuzcBAIFgIenDi8UaZCp5ZvWBLKmQGpl3bETTGuB' +
    'zDRAaWfvmj2MsY/zAQ==',
};
