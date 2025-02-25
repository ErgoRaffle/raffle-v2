import { SByte, SColl } from '@fleet-sdk/serializer';
import { OutputBox } from '@rosen-bridge/scanner';

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

export const sampleRaffleDetailsExtractedData = {
  boxId: sampleRaffleDetailsBoxes[0].boxId,
  txId: sampleRaffleDetailsBoxes[0].transactionId,
  extractor: 'RaffleDetails',
  name: 'Test',
  description: 'Some descriptions...',
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wMOTBxkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7' +
    'AQEaBQRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uEXBpY3R1cmUgY29udGVudCAx' +
    'EXBpY3R1cmUgY29udGVudCAyEXBpY3R1cmUgY29udGVudCAzNtvaID0hQ6UZV5Qd' +
    'ej+liHlZIchm/0B14+5umR8MYtUB',
};
