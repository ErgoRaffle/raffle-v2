import { serializeBox } from '@fleet-sdk/serializer';

export const sampleDynamicBoxes = [
  {
    boxId: '9d78111e1f390b6cafc73c74a8fc9c187b74b3c834ac3ce18d005160bbde5971',
    transactionId:
      '45cc0f20f1443f06edede2e5a4a86abd22f94d54d77d904ababfc26b795b85ef',
    value: 2000000n,
    index: 3,
    creationHeight: 1571281,
    ergoTree:
      '0008cd022314266ef1c89c818b6b451eb25dd9643191e0ea93f9593a4c3cc4e20366864f',
    assets: [
      {
        tokenId:
          'dede2cf5c1a2966453ffec198a9b97b53d281e548903a905519b3525d59cdc3c',
        amount: 1889n,
      },
    ],
    additionalRegisters: {},
  },
];

export const sampleDynamicExtractedData = {
  boxId: sampleDynamicBoxes[0].boxId,
  txId: sampleDynamicBoxes[0].transactionId,
  address: '9enWZ4fCvhw7pukG94oMMVvNXW3ZMWHNJABe9hRciKPfGTSA2z1',
  serialized: Buffer.from(
    serializeBox(sampleDynamicBoxes[0]).toBytes(),
  ).toString('base64'),
};

export const sampleDynamicAddress =
  '9enWZ4fCvhw7pukG94oMMVvNXW3ZMWHNJABe9hRciKPfGTSA2z1';

export const sampleInvalidAddress =
  '9hTzWFBxRLV3SDSUkqf7N9ySVfy4MCMEvfqLNgkEx9ngmeBrNiy';
