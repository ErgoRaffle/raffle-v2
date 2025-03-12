import { OutputBox } from '@rosen-bridge/scanner-interfaces';

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

export const sampleTicketRepoExtractedData = {
  boxId: sampleTicketRepo[0].boxId,
  txId: sampleTicketRepo[0].transactionId,
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wMOTBxkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7gJTr3AMDDg9UaWNrZXRSZXBvVG9r' +
    'ZW4OAA4BMBBQc4LOwiPc2T0UwTAJ3cuzWF0Tmiasnrl6KwvkxjbSAQ==',
};
