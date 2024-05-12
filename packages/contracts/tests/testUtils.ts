import {
  ErgoUnsignedInput,
  OutputBuilder,
  TokenAmount,
  SAFE_MIN_BOX_VALUE,
} from '@fleet-sdk/core';
import {
  MockChain,
  mockUTxO,
  KeyedMockChainParty,
} from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as utils from '../lib/utils';
import { compileAll } from '../lib/utils';
import { ContextVarsType } from '../lib/types';
import * as constants from '../constants';

export const FEE = constants.DEFAULT_FEE;
export const OWNER_NFT_ID = '1234'.repeat(16);
export const RAFFLE_NFT_ID = '1'.repeat(64);
export const LICENSE_TOKEN_ID = '2'.repeat(64);
export const X_TOKEN_ID = '3'.repeat(64);
export const raffleNFTToken = { amount: 1n, tokenId: RAFFLE_NFT_ID };
export const licenseToken = {
  amount: 1_000_000_000n,
  tokenId: LICENSE_TOKEN_ID,
};
export const xToken = { amount: 1000n, tokenId: X_TOKEN_ID };
export const LICENSE_TOKEN_COUNT = 1_000_000_000n;
export const CREATOR_DEFAULT_BALANCE = 10_000_000_000n;
export const ROSEN_DEFAULT_BALANCE = 10_000_000_000n;

/**
 * get an object by partner-name as keys and partner-balance as values
 * and return an object of partner-name as keys and partner-objects as values
 * @param chain
 * @param partners
 * @returns partner objects
 */
export const createPartners = (
  chain: MockChain,
  partners: { [key: string]: bigint },
) => {
  const results: { [key: string]: KeyedMockChainParty } = {};
  for (const partner_ of Object.keys(partners)) {
    const partner = chain.newParty(partner_);
    partner.addBalance({ nanoergs: partners[partner_] });
    results[partner_.toLowerCase()] = partner;
  }
  return results;
};

/**
 * Compile all contracts and return
 * @returns all of contracts
 */
export const initialContracts = (): { [key: string]: string } => {
  const scriptsVars = { ...constants.defaultScriptsVariables };
  scriptsVars['service'] = {
    OWNER_NFT_B64: Buffer.from(OWNER_NFT_ID, 'hex').toString('base64'),
    FEE: constants.DEFAULT_FEE,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };
  const finalContractsAddresses = compileAll(
    new Map(Object.entries(scriptsVars)) as unknown as ContextVarsType,
    true,
  );

  return finalContractsAddresses;
};

/**
 * Create input Service-Box
 * @param serviceContractAddress
 * @param partnerAddress
 * @returns Service Box
 */
export const createServiceBoxMock = (
  serviceContractAddress: string,
  licenseTokenCount: bigint = LICENSE_TOKEN_COUNT,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: serviceContractAddress,
      value: 11_000_000n,
      creationHeight: 4,
      assets: [
        raffleNFTToken,
        { tokenId: LICENSE_TOKEN_ID, amount: licenseTokenCount },
      ],
      additionalRegisters: {
        R4: SColl(SLong, [10n, 10n, 1_000_000_000n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(serviceContractAddress, 'hex')),
        ]).toHex(),
      },
    }),
  );
};

/**
 * create output Service-Box
 * @param licenseTokenCount
 * @param serviceFeePercent
 * @param implementerFeePercent
 * @param creationFee
 * @returns ServiceBox
 */
export const createServiceOutputBox = (
  licenseTokenCount: bigint = 999999999n,
  serviceFeePercent?: bigint,
  implementerFeePercent?: bigint,
  creationFee?: bigint,
) => {
  serviceFeePercent = serviceFeePercent || 10n;
  implementerFeePercent = implementerFeePercent || 10n;
  creationFee = creationFee || 1_000_000_000n;
  return new OutputBuilder(15_000_000n, contractsAddresses['service'])
    .addTokens([
      raffleNFTToken,
      {
        tokenId: LICENSE_TOKEN_ID,
        amount: licenseTokenCount,
      },
    ])
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        serviceFeePercent,
        implementerFeePercent,
        creationFee,
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(contractsAddresses['service'], 'hex')),
      ]).toHex(),
    });
};

/**
 * create output Ticket-Box
 * @returns TicketBox
 */
export const createTicketRepoOutputBox = () => {
  return new OutputBuilder(
    15_000_000n,
    contractsAddresses['ticketRepo'],
  ).mintToken({
    amount: 1_000_000_000n,
    name: 'TicketRepoToken',
    decimals: 0,
  });
};

/**
 * create output Inactive-Raffle-box
 * @param implementerPartnerAddress
 * @param creatorPartnerAddress
 * @param serviceBoxId
 * @param winnersCount
 * @param collectingToken if sets then raffle can only pay charity by this token instead of Erg
 * @param winnersPercents
 * @param serviceFeePercent
 * @param invalidWinnerHash
 * @returns InactiveRaffleBox
 */
export const createInactiveRaffleOutputBox = (
  implementerPartnerAddress: string,
  creatorPartnerAddress: string,
  serviceBoxId: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent?: bigint,
  invalidWinnerHash?: string,
) => {
  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  winnersPercents = winnersPercents || [];
  if (winnersPercents.length === 0)
    for (let i = 0; i < winnersCount; i++)
      winnersPercents.push(1000n / winnersCount);

  serviceFeePercent = serviceFeePercent || 10n;

  return new OutputBuilder(
    (
      winnersCount * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n)
    ).toString(),
    contractsAddresses['inactiveRaffle'],
  )
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        0n, // TotalSoldTicket,
        winnersCount, // WinnersCount,
        1_000_000_000n, // CreationFee
      ]),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(contractsAddresses['service'], 'hex')),
        Array.from(Buffer.from(implementerPartnerAddress)),
        Array.from(Buffer.from(creatorPartnerAddress)),
      ]),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]),
      R7:
        invalidWinnerHash ||
        SColl(SColl(SByte), [
          Array.from(Buffer.from(serviceBoxId, 'hex')),
          Array.from(
            blake2b256(
              Buffer.concat(
                winnersPercents.map((n) => utils.bigIntToUint8Array(n)),
              ),
            ),
          ),
        ]).toHex(),
    });
};

/**
 * Create and return active-raffle box
 * @param partnerAddress
 * @param winnersCount
 * @param collectingToken
 * @returns
 */
export const createActiveRaffleBox = (
  partnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
) => {
  const winnersPercents = [];
  for (let i = 0; i < winnersCount; i++)
    winnersPercents.push(1000n / winnersCount);

  const tokens = [
    raffleNFTToken,
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return mockUTxO({
    ergoTree: contractsAddresses['activeRaffle'],
    value:
      winnersCount * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n),
    creationHeight: 5,
    assets: tokens,
    additionalRegisters: {
      R4: SColl(SLong, [10n, 10n, 1_000_000_000n]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(partnerAddress)),
      ]).toHex(),
    },
  });
};

/**
 * Create and return success-raffle box
 * @param partnerAddress
 * @param winnersCount
 * @param collectingToken
 * @returns
 */
export const createSuccessRaffleBox = (
  partnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
) => {
  const winnersPercents = [];
  for (let i = 0; i < winnersCount; i++)
    winnersPercents.push(1000n / winnersCount);

  const tokens = [
    raffleNFTToken,
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return mockUTxO({
    ergoTree: contractsAddresses['successRaffle'],
    value:
      winnersCount * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n),
    creationHeight: 5,
    assets: tokens,
    additionalRegisters: {
      R4: SColl(SLong, [10n, 10n, 1_000_000_000n]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(partnerAddress)),
      ]).toHex(),
    },
  });
};

export const contractsAddresses = initialContracts();
