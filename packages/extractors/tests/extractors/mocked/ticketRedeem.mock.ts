import { OutputBox } from '@rosen-bridge/scanner';

export const sampleTicketRedeemBoxes: OutputBox[] = [
  {
    boxId: '68cec515783f2e9bbb67604c551251a548232a718487fab4c3d46ffcddd47715',
    value: 1135000500n,
    ergoTree: '1906010101d17300',
    assets: [
      {
        tokenId:
          '716149d5c68e4ea1ea0529b60c7029797ffb26f3d401d44f9aadd4b090593e4e',
        amount: 1n,
      },
      {
        tokenId:
          'a96f4758c307ead7fbcfd1242827f9efa499c4fa74d37cd966ae54023c3357b5',
        amount: 999999999n,
      },
    ],
    creationHeight: 1629308,
    additionalRegisters: {
      R4: '110302e8078087a70e',
      R5: '0500',
    },
    transactionId:
      'f75a53a1f76189941cecfdff098f9b277558dd4c81942ced3654cce6da4980fc',
    index: 0,
  },
];

export const sampleTicketRedeemExtractedData = {
  boxId: sampleTicketRedeemBoxes[0].boxId,
  txId: sampleTicketRedeemBoxes[0].transactionId,
  raffleId: 'a96f4758c307ead7fbcfd1242827f9efa499c4fa74d37cd966ae54023c3357b5',
  redeemedTickets: 0n,
  totalSoldTicket: 1n,
  serialized:
    'tPeanQQZBgEBAdFzAPy4YwJxYUnVxo5OoeoFKbYMcCl5f/sm89QB1E+ardSwkFk+TgGpb0dY' +
    'wwfq1/vP0SQoJ/nvpJnE+nTTfNlmrlQCPDNXtf+T69wDAhEDAugHgIenDgUA91pTofdhiZQc' +
    '7P3/CY+bJ3VY3UyBlCztNlTM5tpJgPwA',
};
