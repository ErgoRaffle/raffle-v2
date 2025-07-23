import { OutputBox } from '@rosen-bridge/scanner-interfaces';

export const sampleActiveRaffleBoxes: OutputBox[] = [
  {
    boxId: '80ee753a8e22eef579fe30f9fbee89d39d7ba87ee1c5158157e62cc898f9ac1c',
    value: 1105000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 1615918,
    assets: [
      {
        tokenId:
          '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
        amount: 1n,
      },
      {
        tokenId:
          'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
        amount: 999999998n,
      },
    ],
    additionalRegisters: {
      R4: '11079003c801c80180dac409d00fe6a0c5018087a70e',
      R5: '1a0320edb662d009b16812a2bd2ffd1b926b965d62040ade9241fdc4b88237a99dfebe20b894faef6f944647dac930d195680808a3fd7c660308196f2a0f4e94dc8c0fa820d217c8109e3bb5535c96d04875649efdb07b211b59bd0d1c62681baa8b8e0f11',
      R6: '0402',
      R7: '0500',
    },
    transactionId:
      '36dbda203d2143a51957941d7a3fa588795921c866ff4075e3ee6e991f0c62d5',
    index: 0,
  },
];

export const sampleActiveRaffleExtractedData = {
  boxId: sampleActiveRaffleBoxes[0].boxId,
  txId: sampleActiveRaffleBoxes[0].transactionId,
  serialized:
    'wOzzjgQZBgEBAdFzAK7QYgJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk+' +
    'TgHSneql2Alf4wkwhFQSsJPSunW0jjHCXf+fBaZzlncw+/6T69wDBBEHkAPIAcgB' +
    'gNrECdAP5qDFAYCHpw4aAyDttmLQCbFoEqK9L/0bkmuWXWIECt6SQf3EuII3qZ3+' +
    'viC4lPrvb5RGR9rJMNGVaAgIo/18ZgMIGW8qD06U3IwPqCDSF8gQnju1U1yW0Eh1' +
    'ZJ79sHshG1m9DRxiaBuqi44PEQQCBQA229ogPSFDpRlXlB16P6WIeVkhyGb/QHXj' +
    '7m6ZHwxi1QA=',
  raffleId: 'd29deaa5d8095fe30930845412b093d2ba75b48e31c25dff9f05a673967730fb',
  ergoTree: '1906010101d17300',
};
