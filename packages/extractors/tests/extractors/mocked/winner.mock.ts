import { OutputBox } from '@rosen-bridge/scanner-interfaces';

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

export const sampleWinnerExtractedData = {
  identifier: sampleWinnerBoxes[0].boxId,
  txId: sampleWinnerBoxes[0].transactionId,
  index: 1,
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  rewardPercent: 1000,
  serialized:
    'gI7OHBkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdz' +
    'D7AQQRA9AP5qDFAYCHpw4EAgUADiCPQKkvIoCUUuoLyBkzFfbD2rvLoN7+bNk/okRPxWT/Cjbb2i' +
    'A9IUOlGVeUHXo/pYh5WSHIZv9AdePubpkfDGLVAw==',
};
