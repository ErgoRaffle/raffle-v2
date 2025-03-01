import { OutputBox } from '@rosen-bridge/scanner';

export const sampleGiftRedeemBoxes: OutputBox[] = [
  {
    boxId: '79d5b77ff1e247d2394f200c7e05e9e7aee19ab9781b62b9d644c3a0b01c9ea1',
    value: 1150000500n,
    ergoTree: '1906010101d17300',
    assets: [
      {
        tokenId:
          '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
        amount: 1n,
      },
      {
        tokenId:
          'fe8393d4f042775947616dbf4558e41048430c24e44e348e4ff1b567f49f1420',
        amount: 999999999n,
      },
    ],
    creationHeight: 1629161,
    additionalRegisters: {
      R4: '110302e8078087a70e',
      R5: '0402',
      R6: '0404',
    },
    transactionId:
      '7ce9678d523284bab828efb0632e19f373b220786dab2a09575d60aa6f745a72',
    index: 0,
  },
];

export const sampleGiftRedeemExtractedData = {
  boxId: sampleGiftRedeemBoxes[0].boxId,
  txId: sampleGiftRedeemBoxes[0].transactionId,
  step: 2,
  raffleId: 'fe8393d4f042775947616dbf4558e41048430c24e44e348e4ff1b567f49f1420',
  serialized:
    '9LqupAQZBgEBAdFzAOm3YwJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk+TgH+g5PU' +
    '8EJ3WUdhbb9FWOQQSEMMJORONI5P8bVn9J8UIP+T69wDAxEDAugHgIenDgQCBAR86WeNUjKE' +
    'urgo77BjLhnzc7IgeG2rKglXXWCqb3RacgA=',
};
