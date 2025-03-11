export const sampleBoxesData = [
  {
    boxId: '4f444639b431ec30f6a4b96d6a42bb3489f422c98043c47670a84b0a3a495edd',
    txId: '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
    name: 'Test',
    description: 'Some descriptions...',
    pictures: [
      {
        orderIndex: 0,
        raffleId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        content: 'picture content 1',
      },
      {
        orderIndex: 1,
        raffleId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        content: 'picture content 2',
      },
      {
        orderIndex: 2,
        raffleId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        content: 'picture content 3',
      },
    ],
    serialized:
      'wMOTBxkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7AQEaBQRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uEXBpY3R1cmUgY29udGVudCAxEXBpY3R1cmUgY29udGVudCAyEXBpY3R1cmUgY29udGVudCAzNtvaID0hQ6UZV5Qdej+liHlZIchm/0B14+5umR8MYtUB',
  },
];

export const sampleDBData = {
  block: '0',
  boxId: '4f444639b431ec30f6a4b96d6a42bb3489f422c98043c47670a84b0a3a495edd',
  description: 'Some descriptions...',
  extractor: 'RaffleDetails',
  height: 1,
  name: 'Test',
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  serialized:
    'wMOTBxkGAQEB0XMArtBiAdKd6qXYCV/jCTCEVBKwk9K6dbSOMcJd/58FpnOWdzD7AQEaBQRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uEXBpY3R1cmUgY29udGVudCAxEXBpY3R1cmUgY29udGVudCAyEXBpY3R1cmUgY29udGVudCAzNtvaID0hQ6UZV5Qdej+liHlZIchm/0B14+5umR8MYtUB',
  spendBlock: null,
  spendHeight: null,
  txId: '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
};

export const sampleDBPicturesData = [
  {
    content: 'picture content 1',
    details: undefined,
    orderIndex: 0,
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  },
  {
    content: 'picture content 2',
    details: undefined,
    orderIndex: 1,
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  },
  {
    content: 'picture content 3',
    details: undefined,
    orderIndex: 2,
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  },
];

export const sampleUpdatedPicturesDBData = [
  {
    ...sampleDBPicturesData[0],
    content: 'updated picture content 1',
  },
  {
    ...sampleDBPicturesData[1],
    content: 'updated picture content 2',
  },
  {
    ...sampleDBPicturesData[2],
    content: 'updated picture content 3',
  },
];
