import { Transaction, OutputBox } from '@rosen-bridge/scanner-interfaces';

export const sampleSafePayBoxes: OutputBox[] = [
  {
    boxId: 'fed50fd5a30a2b1cdc5cb4d830a013df367b837b6b8ca34fe35f343f4ee6dd4c',
    value: 130000000n,
    ergoTree: '1906010101d17300',
    assets: [],
    creationHeight: 1605612,
    additionalRegisters: {
      R4: '0e20edb662d009b16812a2bd2ffd1b926b965d62040ade9241fdc4b88237a99dfebe',
      R5: '058087a70e',
    },
    transactionId:
      '3af52df1cf054d285163a5f5b8b22e7b0579fa68835d2be8bf7a9d8aa7c4b32b',
    index: 1,
  },
];

export const sampleSafePayExtractedData = {
  boxId: sampleSafePayBoxes[0].boxId,
  txId: sampleSafePayBoxes[0].transactionId,
  txType: 'unknown',
  raffleId: 'unknown',
  serialized:
    'gMn+PRkGAQEB0XMA7P9hAAIOIO22YtAJsWgSor0v/RuSa5ZdYgQK3pJB/cS4gj' +
    'epnf6+BYCHpw469S3xzwVNKFFjpfW4si57BXn6aINdK+i/ep2Kp8SzKwE=',
};

export const sampleSafePayTxs: { tx: Transaction; txType: string }[] = [
  // success transactions
  {
    txType: 'Success',
    tx: {
      id: 'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
      inputs: [
        {
          boxId:
            '2b51655ef71308751641999437263640584a0c22aa2bb68f5da75c40bea20762',
        },
        {
          boxId:
            '4f444639b431ec30f6a4b96d6a42bb3489f422c98043c47670a84b0a3a495edd',
        },
      ],
      dataInputs: [
        {
          boxId:
            '0bfaaa390c6faafd6a27a1c6a7179b6c04913bec7c6376d9b699c1847dfb08e4',
        },
      ],
      outputs: [
        {
          boxId:
            '45f9478564cbdfe3078ccd6b34a5cc426635d715ca915c483c5b5414d6acb46b',
          value: 1845000000n,
          ergoTree: '1908010404d191a37300',
          assets: [
            {
              tokenId:
                '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
              amount: 1n,
            },
            {
              tokenId:
                'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
              amount: 999999899n,
            },
          ],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '11038088debe01c8018087a70e',
            R5: '0402',
            R6: '0e20d217c8109e3bb5535c96d04875649efdb07b211b59bd0d1c62681baa8b8e0f11',
            R7: '1a02200bfaaa390c6faafd6a27a1c6a7179b6c04913bec7c6376d9b699c1847dfb08e4200e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
            R8: '0402',
          },
          transactionId:
            'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
          index: 0,
        },
        {
          boxId:
            'cafbdf98033224043bf9f49198cc3b058fa77daff2410726cdb0b7496b7cb937',
          value: 130000000n,
          ergoTree: '1906010101d17300',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '0e20edb662d009b16812a2bd2ffd1b926b965d62040ade9241fdc4b88237a99dfebe',
            R5: '058087a70e',
          },
          transactionId:
            'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
          index: 1,
        },
        {
          boxId:
            'fb9f82bcd9681285042fb6b8158ca77dec7f161da620211edfc5d8e5654934a1',
          value: 130000000n,
          ergoTree: '1906010101d17300',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '0e20b894faef6f944647dac930d195680808a3fd7c660308196f2a0f4e94dc8c0fa8',
            R5: '058087a70e',
          },
          transactionId:
            'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
          index: 2,
        },
        {
          boxId:
            'df9d0492268eaf98dd1ca856a80cf2e74c866abaf4fa19c29ba15913a3161a29',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {},
          transactionId:
            'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
          index: 3,
        },
      ],
    },
  },
  {
    txType: 'GiftUnwrap',
    tx: {
      id: '698fe794f58e4a6f1fea1857bf2ad3924ed41edcabf1eaf6cda8930a63de5a8c',
      inputs: [
        {
          boxId:
            '20d0f44bb1b1a1d7c9125cf7443b372efecb3bc7c34e02b8250bba275dc58a3f',
        },
        {
          boxId:
            '903b617432e1448c578459f7bec07184c733665cd8c2801cb7de83670823219f',
        },
      ],
      dataInputs: [
        {
          boxId:
            '9fd19fa994e0b1ed5c21f85349d954ae94f33172cda58e5b6e4b6b65adfb92b9',
        },
      ],
      outputs: [
        {
          boxId:
            '6d8fb6cb85f0538c20c65be2e594f9bd30dfac7ad20607c46729769290251a6e',
          value: 245000000n,
          ergoTree: '1908010406d191a37300',
          assets: [
            {
              tokenId:
                'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
              amount: 1n,
            },
            {
              tokenId:
                '8f40a92f22809452ea0bc8193315f6c3dabbcba0defe6cd93fa2444fc564ff0a',
              amount: 2000n,
            },
          ],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '110320028087a70e',
            R5: '0402',
            R6: '0502',
          },
          transactionId:
            '698fe794f58e4a6f1fea1857bf2ad3924ed41edcabf1eaf6cda8930a63de5a8c',
          index: 0,
        },
        {
          boxId:
            '939520249eda2e6f0c2b0e438aadac389a19772bcc5a90bc731325c687c51a5e',
          value: 135000000n,
          ergoTree: '1906010101d17300',
          assets: [
            {
              tokenId:
                'a2f94479204476ab6ff8c5f461fda56ea1eedf82f4bb1da6581c3ad29e4a45ed',
              amount: 10n,
            },
          ],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '0e205b1a88f00bc6013cc6506883b23aabba148346ca6fa64e4e3573592f4e3ad854',
            R5: '058087a70e',
          },
          transactionId:
            '698fe794f58e4a6f1fea1857bf2ad3924ed41edcabf1eaf6cda8930a63de5a8c',
          index: 1,
        },
        {
          boxId:
            '60ca29d29ccf1030719aed45a7f53a6bafed461e26948fb21191d381c28b2f23',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {},
          transactionId:
            '698fe794f58e4a6f1fea1857bf2ad3924ed41edcabf1eaf6cda8930a63de5a8c',
          index: 2,
        },
      ],
    },
  },
  {
    txType: 'FinalPrize',
    tx: {
      id: 'e95db744c82a3bf9d9965ae630144460af1dab0175b1bb52bd6824101fb41498',
      inputs: [
        {
          boxId:
            '6d8fb6cb85f0538c20c65be2e594f9bd30dfac7ad20607c46729769290251a6e',
        },
      ],
      dataInputs: [
        {
          boxId:
            '9fd19fa994e0b1ed5c21f85349d954ae94f33172cda58e5b6e4b6b65adfb92b9',
        },
      ],
      outputs: [
        {
          boxId:
            '4e017aa7ea63d3481baf381584af5b91a626e98e70be66f5f6f906c72312d480',
          value: 230000000n,
          ergoTree: '1906010101d17300',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '0e205b1a88f00bc6013cc6506883b23aabba148346ca6fa64e4e3573592f4e3ad854',
            R5: '058087a70e',
          },
          transactionId:
            'e95db744c82a3bf9d9965ae630144460af1dab0175b1bb52bd6824101fb41498',
          index: 0,
        },
        {
          boxId:
            '34434c8af607e5576309b6ad5acbb4bd3231136ec46e14b2fffc5272014ca407',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {},
          transactionId:
            'e95db744c82a3bf9d9965ae630144460af1dab0175b1bb52bd6824101fb41498',
          index: 1,
        },
      ],
    },
  },
  // fail transactions
  {
    txType: 'GiftReturn',
    tx: {
      id: 'bce5ee4d20b5952b5541c9713a689efc8cb15f277462589c6481622b891a5e21',
      inputs: [
        {
          boxId:
            '64c47f5110e4a022921434f6554a4590e90972db9665e17686b795a1ef19f0ce',
        },
        {
          boxId:
            '2ddb49c2fcd04a367206671c4520eee88785a8805ff6f3363b6ed60873bf7ccb',
        },
      ],
      dataInputs: [
        {
          boxId:
            'cc24f5385c00f8997c40e8044331ac148e9fd83ec79285fcfc50d9fb84f8c6fa',
        },
      ],
      outputs: [
        {
          boxId:
            'bc88e2dfcb35d768846641cbf91c2ba51a5a0911cb8a589e5ab899022376c87f',
          value: 60000000n,
          ergoTree: '1908010408d191a37300',
          assets: [
            {
              tokenId:
                '03d8b4ffd5d41b9ce481426d85faadad02bc33abebd333613bf193cd8f74aff3',
              amount: 1n,
            },
            {
              tokenId:
                'c1ee69c89109e4783e624d0635e9c38457332162c7d7f56c54ba492aa53a14a1',
              amount: 2000n,
            },
          ],
          creationHeight: 1629138,
          additionalRegisters: {
            R4: '1103d00fa2efc6018087a70e',
            R5: '0402',
            R6: '0500',
            R7: '0e20c1ee69c89109e4783e624d0635e9c38457332162c7d7f56c54ba492aa53a14a1',
          },
          transactionId:
            'bce5ee4d20b5952b5541c9713a689efc8cb15f277462589c6481622b891a5e21',
          index: 0,
        },
        {
          boxId:
            '9c6612bf80d5e7205a4a36fee5b30cf2c5571bd9d7b068a2413dc7c837fae1ca',
          value: 135000000n,
          ergoTree: '1906010101d17300',
          assets: [
            {
              tokenId:
                'a2f94479204476ab6ff8c5f461fda56ea1eedf82f4bb1da6581c3ad29e4a45ed',
              amount: 10n,
            },
          ],
          creationHeight: 1629138,
          additionalRegisters: {
            R4: '0e200f318e1cd5860000282d016ef8b4ac1d06486b2e83be2777c86772b25886ecdc',
            R5: '058087a70e',
          },
          transactionId:
            'bce5ee4d20b5952b5541c9713a689efc8cb15f277462589c6481622b891a5e21',
          index: 1,
        },
        {
          boxId:
            'e1a8d838e79f6e2505ff5511a1376009cd81d624a027bf94d22fdcb158a3f71c',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1629138,
          additionalRegisters: {},
          transactionId:
            'bce5ee4d20b5952b5541c9713a689efc8cb15f277462589c6481622b891a5e21',
          index: 2,
        },
      ],
    },
  },
  {
    txType: 'TicketRedeem',
    tx: {
      id: '61cc7297d52c477760e89b6f2c579bf82c4920f507bc77d8ad09fa439b737241',
      inputs: [
        {
          boxId:
            '7ab1b5b718c45f435d4ce34b734a3f2b434a6453648eed2c4e820a01d6e14406',
        },
        {
          boxId:
            'd62f162cd24cc7250718a610f6603888436d39652fff95e4e5bae4e80aefda9d',
        },
      ],
      dataInputs: [
        {
          boxId:
            'c8ab58bed0a5edbcae7f99fa7a1446f77da8b23b302dc937fb5b5d21d34026c1',
        },
      ],
      outputs: [
        {
          boxId:
            '3f25b3556d114d9db3fd75960fc3145c61748c33af59cff6485954f4e4324d95',
          value: 60000000n,
          ergoTree: '190801040ad191a37300',
          assets: [
            {
              tokenId:
                'a5a0c2c9596cc11ff55fb7881d28de99f39502c5eecf78e957ca067899ac3aa4',
              amount: 1n,
            },
            {
              tokenId:
                'd84c2f5d5aa9ca81e2a28421152e8bc4355529e587e0d66bb987e8271870d3a8',
              amount: 2000n,
            },
          ],
          creationHeight: 1629147,
          additionalRegisters: {
            R4: '1103d00fb4efc6018087a70e',
            R5: '0402',
            R6: '0500',
            R7: '0e20d84c2f5d5aa9ca81e2a28421152e8bc4355529e587e0d66bb987e8271870d3a8',
          },
          transactionId:
            '61cc7297d52c477760e89b6f2c579bf82c4920f507bc77d8ad09fa439b737241',
          index: 0,
        },
        {
          boxId:
            'f63283d3d9afe2d317c7699e6085408830fe873c30c98654b2d98d6b4f18eba0',
          value: 135000000n,
          ergoTree: '1906010101d17300',
          assets: [
            {
              tokenId:
                'a2f94479204476ab6ff8c5f461fda56ea1eedf82f4bb1da6581c3ad29e4a45ed',
              amount: 10n,
            },
          ],
          creationHeight: 1629147,
          additionalRegisters: {
            R4: '0e200f318e1cd5860000282d016ef8b4ac1d06486b2e83be2777c86772b25886ecdc',
            R5: '058087a70e',
          },
          transactionId:
            '61cc7297d52c477760e89b6f2c579bf82c4920f507bc77d8ad09fa439b737241',
          index: 1,
        },
        {
          boxId:
            'fdd920089f8b2903f8bc9fa5ce2777279d88e6713af19048f43721d760b67c5d',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1629147,
          additionalRegisters: {},
          transactionId:
            '61cc7297d52c477760e89b6f2c579bf82c4920f507bc77d8ad09fa439b737241',
          index: 2,
        },
      ],
    },
  },
  // license-redeem transactions
  {
    txType: 'LicenseRedeem',
    tx: {
      id: '555614c992258924cdb9ae6da4e6d548b7a0b2a0e9d0d26f3b8adde8d2643471',
      inputs: [
        {
          boxId:
            'ad7bebbf4cb2ff5387873ff24e4dbc36df6eac4bb3d053125e6d66383c1f9c01',
        },
        {
          boxId:
            '4a07171a18c118a493270febf33332428fe6cbca25d3df97e8d682daedd26d44',
        },
      ],
      dataInputs: [],
      outputs: [
        {
          boxId:
            'df8e2d16421a383f666eb3919fff77f8c8449225169f3aae5982ae4f3d9b325d',
          value: 15000000n,
          ergoTree: '1908010402d191a37300',
          assets: [
            {
              tokenId:
                '4cbc5951921c424368a14ca32b3f8dc1b9ccd63126a407c04a326e2c8ffe57f1',
              amount: 1n,
            },
            {
              tokenId:
                '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
              amount: 999999999n,
            },
          ],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '1104c801c80180a8d6b9078087a70e',
            R5: '0e20edb662d009b16812a2bd2ffd1b926b965d62040ade9241fdc4b88237a99dfebe',
          },
          transactionId:
            '555614c992258924cdb9ae6da4e6d548b7a0b2a0e9d0d26f3b8adde8d2643471',
          index: 0,
        },
        {
          boxId:
            'e0915b3567c837eb457f45fb169a9e74e04657b21a99d1c4e86c74de3a8b8fc3',
          value: 1630000000n,
          ergoTree: '1906010101d17300',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {
            R4: '0e20d217c8109e3bb5535c96d04875649efdb07b211b59bd0d1c62681baa8b8e0f11',
            R5: '058087a70e',
          },
          transactionId:
            '555614c992258924cdb9ae6da4e6d548b7a0b2a0e9d0d26f3b8adde8d2643471',
          index: 1,
        },
        {
          boxId:
            'c022531d307c5b0bd768b480088d7c990f42f0ae711f08e8078a161d723592d4',
          value: 15000000n,
          ergoTree:
            '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304',
          assets: [],
          creationHeight: 1615925,
          additionalRegisters: {},
          transactionId:
            '555614c992258924cdb9ae6da4e6d548b7a0b2a0e9d0d26f3b8adde8d2643471',
          index: 2,
        },
      ],
    },
  },
];
