import { InputExtension, OutputBox } from '@rosen-bridge/abstract-extractor';
import { SColl, SByte, SLong } from '@fleet-sdk/core';
import { creatorWallet, implementerWallet } from '../../utils.mock';

export const sampleSuccessRaffleBoxes: OutputBox[] = [
  {
    boxId: '45f9478564cbdfe3078ccd6b34a5cc426635d715ca915c483c5b5414d6acb46b',
    value: 1845000000n,
    ergoTree: '1906010101d17300',
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
];

export const sampleSuccessRaffleExtractedData = {
  boxId: '45f9478564cbdfe3078ccd6b34a5cc426635d715ca915c483c5b5414d6acb46b',
  raffleId: '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
  selectedWinnersList: [200n, 200n, 200n, 200n, 200n].toString(),
  serialized:
    'wO7h7wYZBgEBAdFzALXQYgJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk' +
    '+TgHSneql2Alf4wkwhFQSsJPSunW0jjHCXf+fBaZzlncw+5uT69wDBREDgIjevgHIAYCHpw4EAg4g' +
    '0hfIEJ47tVNcltBIdWSe/bB7IRtZvQ0cYmgbqouODxEaAiAL+qo5DG+q/WonocanF5tsBJE77Hxjd' +
    'tm2mcGEffsI5CAOV1HAJuVDsuirLrBgmdqh0eXfR3ePd4f6q0XN8S/jqAQCojUpe5fem0fXWEbcpo' +
    '0Pe3Utgx8IEz6iEcUCtYamcN8A',
  step: 1,
  txId: 'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
};

export const sampleSuccessRaffleExtensions: InputExtension[] = [
  {
    '0': SColl(SLong, [200n, 200n, 200n, 200n, 200n]).toHex(),
    '1': SColl(SColl(SByte), [
      Array.from(Buffer.from(implementerWallet.ergoTree.toString(), 'hex')),
      Array.from(Buffer.from(creatorWallet.ergoTree.toString(), 'hex')),
    ]).toHex(),
  },
  {},
];

export const sampleSuccessRaffleExtractedDataForEmptyExtension = {
  ...sampleSuccessRaffleExtractedData,
  selectedWinnersList: '',
};
