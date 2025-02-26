import { InputExtension, OutputBox } from '@rosen-bridge/abstract-extractor';
import { SColl, SByte, SLong, SInt } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import {
  bigIntToUint8Array,
  creatorWallet,
  implementerWallet,
  serviceWallet,
} from '../../utils.mock';

export const sampleInactiveRaffleBoxes: OutputBox[] = [
  {
    boxId: 'fdd619b0dd5d651207ea1e770b5b1bf3e40563c7fdb660b0625de29abde0ae0c',
    transactionId: '01'.repeat(32),
    index: 1,
    value: 1000000n,
    ergoTree: '1906010101d17300',
    creationHeight: 100,
    assets: [
      {
        tokenId:
          '2222222222222222222222222222222222222222222222222222222222222222',
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: SColl(SLong, [
        200n, // WinnersPercentage,
        100n, // ServiceFeePercent,
        100n, // ImplementerFeePercent,
        100_000n, // TicketPrice,
        1_000_000n, // Goal,
        1_000n, // Deadline,
        15_000n, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(
          blake2b256(Buffer.from(serviceWallet.ergoTree.toString(), 'hex')),
        ),
        Array.from(
          blake2b256(Buffer.from(implementerWallet.ergoTree.toString(), 'hex')),
        ),
        Array.from(
          blake2b256(Buffer.from(creatorWallet.ergoTree.toString(), 'hex')),
        ),
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]).toHex(),
      R7: SColl(SColl(SByte), [
        Array.from(Buffer.from('3'.repeat(64), 'hex')),
        Array.from(
          blake2b256(
            Buffer.concat(
              [200n, 200n, 200n, 200n, 200n].map((n) => bigIntToUint8Array(n)),
            ),
          ),
        ),
      ]).toHex(),
      R8: SInt(5).toHex(),
    },
  },
];

export const sampleInactiveRaffleExtractedData = {
  boxId: sampleInactiveRaffleBoxes[0].boxId,
  txId: sampleInactiveRaffleBoxes[0].transactionId,
  serialized:
    'wIQ9GQYBAQHRcwBkASIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
    'AQURB5ADyAHIAcCaDICJetAPsOoBGgMgsyiS4NtDjteZCvL2Fhr1TQ7+2cWgkoCs732QLXNLM/' +
    'AgdB4lw40FQMbZocnIcAh7X0IaZt6MSmb6yE1cDfJZGHogXH9xiMrF43Y0Ndj/FhjuAMMPnqgU' +
    '064mYgVHFiAwCpIaAgRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uGgIgMzMzMzMzMzMzMzMzMz' +
    'MzMzMzMzMzMzMzMzMzMzMzMzMge8trSPEi5LKmV26w9zy4pvrbGAREDHFDs8o74DhqB5gECgEB' +
    'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
  raffleId: '7bcb6b48f122e4b2a6576eb0f73cb8a6fadb1804440c7143b3ca3be0386a0798',
  creatorErgoTree: creatorWallet.ergoTree.toString(),
  implementorErgoTree: implementerWallet.ergoTree.toString(),
  serviceErgoTree: serviceWallet.ergoTree.toString(),
  deadline: 1000,
  goal: 1000000n,
  implementerFeePercent: 100,
  serviceFeePercent: 100,
  ticketPrice: 100000n,
  txFee: 15000n,
  winnersPercent: 200,
  winnersPercentList: [200, 200, 200, 200, 200].toString(),
};

export const sampleInactiveRaffleExtensions: InputExtension[] = [
  {
    '0': SColl(SLong, [200n, 200n, 200n, 200n, 200n]).toHex(),
    '1': SColl(SColl(SByte), [
      Array.from(Buffer.from(implementerWallet.ergoTree.toString(), 'hex')),
      Array.from(Buffer.from(creatorWallet.ergoTree.toString(), 'hex')),
    ]).toHex(),
  },
  {},
];

export const sampleInactiveRaffleExtractedDataForEmptyExtension = {
  boxId: sampleInactiveRaffleBoxes[0].boxId,
  txId: sampleInactiveRaffleBoxes[0].transactionId,
  serialized:
    'wIQ9GQYBAQHRcwBkASIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
    'AQURB5ADyAHIAcCaDICJetAPsOoBGgMgsyiS4NtDjteZCvL2Fhr1TQ7+2cWgkoCs732QLXNLM/' +
    'AgdB4lw40FQMbZocnIcAh7X0IaZt6MSmb6yE1cDfJZGHogXH9xiMrF43Y0Ndj/FhjuAMMPnqgU' +
    '064mYgVHFiAwCpIaAgRUZXN0FFNvbWUgZGVzY3JpcHRpb25zLi4uGgIgMzMzMzMzMzMzMzMzMz' +
    'MzMzMzMzMzMzMzMzMzMzMzMzMge8trSPEi5LKmV26w9zy4pvrbGAREDHFDs8o74DhqB5gECgEB' +
    'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
  raffleId: '7bcb6b48f122e4b2a6576eb0f73cb8a6fadb1804440c7143b3ca3be0386a0798',
  creatorErgoTree: '',
  implementorErgoTree: '',
  serviceErgoTree: serviceWallet.ergoTree.toString(),
  deadline: 1000,
  goal: 1000000n,
  implementerFeePercent: 100,
  serviceFeePercent: 100,
  ticketPrice: 100000n,
  txFee: 15000n,
  winnersPercent: 200,
  winnersPercentList: '',
};
