import { OutputBox } from '@rosen-bridge/scanner';

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

export const sampleTicketExtractedData = {
  boxId: sampleTicketBoxes[0].boxId,
  txId: sampleTicketBoxes[0].transactionId,
  extractor: 'Ticket',
  rangeStart: 0n,
  rangeEnd: 100n,
  donatorErgoTree:
    '0e205b1a88f00bc6013cc6506883b23aabba148346ca6fa64e4e3573592f4e3ad854',
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wMq6FRkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7' +
    'ZAIOIFsaiPALxgE8xlBog7I6q7oUg0bKb6ZOTjVzWS9OOthUEQQAyAGA2sQJ5qDF' +
    'AdlhpLZhs+bZQXrdi2fTYoiGC06QWr1HgEpEJyNy2KP1AQ==',
};
