import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { RaffleBoxType } from '../../../lib/entities/raffleBoxEntity';

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

export const sampleGiftTokenRepoExtractedData = {
  identifier: sampleGiftTokenRepo[0].boxId,
  txId: sampleGiftTokenRepo[0].transactionId,
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wMOTBxkGAQEB0XMArtBiAY9AqS8igJRS6gvIGTMV9sPau8ug3v5s2T+iRE/FZP8K0A8GEAECEAEEEAEGEQKgH4CHpw4OINKd6qXYCV' +
    '/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7EAICAjbb2iA9IUOlGVeUHXo/pYh5WSHIZv9AdePubpkfDGLVAg==',
  type: RaffleBoxType.GiftTokenRepo,
};
