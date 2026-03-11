import { InputExtension, OutputBox } from '@rosen-bridge/scanner-interfaces';

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
  {
    boxId: '4a07171a18c118a493270febf33332428fe6cbca25d3df97e8d682daedd26d44',
    value: 1645000000n,
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
      R7: '1a02205ccd8efcb3a0f6bfde728beb2a4765aefd5f41ccb997efe3e69b1268c1032cf420ad1d1be2a8c4035c50b20a4fc0125d3ebd4390bd9380261b45da3265d5c50400',
      R8: '0404',
    },
    transactionId:
      '26dd538adbeded62e657035c6cc01b51fb65413ff87e0cbc5670b6f222505f62',
    index: 0,
  },
];

export const sampleSuccessRaffleExtractedData = [
  {
    identifier:
      '45f9478564cbdfe3078ccd6b34a5cc426635d715ca915c483c5b5414d6acb46b',
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
    selectedWinnersList: [].toString(),
    serialized:
      'wO7h7wYZBgEBAdFzALXQYgJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk' +
      '+TgHSneql2Alf4wkwhFQSsJPSunW0jjHCXf+fBaZzlncw+5uT69wDBREDgIjevgHIAYCHpw4EAg4g' +
      '0hfIEJ47tVNcltBIdWSe/bB7IRtZvQ0cYmgbqouODxEaAiAL+qo5DG+q/WonocanF5tsBJE77Hxjd' +
      'tm2mcGEffsI5CAOV1HAJuVDsuirLrBgmdqh0eXfR3ePd4f6q0XN8S/jqAQCojUpe5fem0fXWEbcpo' +
      '0Pe3Utgx8IEz6iEcUCtYamcN8A',
    step: 1,
    txId: 'a235297b97de9b47d75846dca68d0f7b752d831f08133ea211c502b586a670df',
  },
  {
    identifier:
      '4a07171a18c118a493270febf33332428fe6cbca25d3df97e8d682daedd26d44',
    raffleId:
      'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
    selectedWinnersList: [16n].toString(),
    serialized:
      'wOqykAYZBgEBAdFzALXQYgJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk+TgHSneql2Alf4wkwhFQSsJPSunW0jjHCXf+fBaZzlncw+5uT69wDBREDgIjevgHIAYCHpw4EAg4g0hfIEJ47tVNcltBIdWSe/bB7IRtZvQ0cYmgbqouODxEaAiBczY78s6D2v95yi+sqR2Wu/V9BzLmX7+PmmxJowQMs9CCtHRviqMQDXFCyCk/AEl0+vUOQvZOAJhtF2jJl1cUEAAQEJt1Titvt7WLmVwNcbMAbUftlQT/4fgy8VnC28iJQX2IA',
    step: 2,
    txId: '26dd538adbeded62e657035c6cc01b51fb65413ff87e0cbc5670b6f222505f62',
  },
];

export const sampleSuccessRaffleExtensions: InputExtension[] = [
  {
    '0': '1100',
    '1': '0520',
  },
  {},
];
