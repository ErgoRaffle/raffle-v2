import { OutputBox } from '@rosen-bridge/scanner';

export const sampleWinnerPrizeBoxes: OutputBox[] = [
  {
    boxId: '20d0f44bb1b1a1d7c9125cf7443b372efecb3bc7c34e02b8250bba275dc58a3f',
    value: 245000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615925,
    assets: [
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 1n,
      },
      {
        tokenId:
          '8f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
        amount: 1999n,
      },
    ],
    additionalRegisters: {
      R4: '110320028087a70e',
      R5: '0402',
      R6: '0500',
    },
    transactionId:
      '26dd538adbeded62e657035c6cc01b51fb65413ff87e0cbc5670b6f222505f62',
    index: 1,
  },
];

export const sampleWinnerPrizeExtractedData = {
  boxId: sampleWinnerPrizeBoxes[0].boxId,
  txId: sampleWinnerPrizeBoxes[0].transactionId,
  winnerTicketIndex: 16,
  winnerIndex: 1,
  unwrappedGiftCount: 0,
  giftCount: 1,
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wM7pdBkGAQEB0XMAtdBiAtKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7' +
    'AY9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8Kzw8DEQMgAoCHpw4EAgUA' +
    'Jt1Titvt7WLmVwNcbMAbUftlQT/4fgy8VnC28iJQX2IB',
};
