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
import {
  compileAll,
  defaultScriptsVariables,
  ContextVarsType,
} from '../lib/utils';

export const FEE = 15_000_000n;
export const OWNER_NFT_ID = '1234'.repeat(16);
export const RAFFLE_NFT_ID = '1'.repeat(64);
export const LICENSE_TOKEN_ID = '2'.repeat(64);
export const X_TOKEN_ID = '3'.repeat(64);
export const raffleNFTToken = { amount: 1n, tokenId: RAFFLE_NFT_ID };
export const licenseToken = { amount: 1000000000n, tokenId: LICENSE_TOKEN_ID };
export const xToken = { amount: 1000n, tokenId: X_TOKEN_ID };

/**
 * get an object by partner-name as keys and partner-balance as values
 * and return an object of partner-name as keys and partner-objects as values
 * @param chain
 * @param partners
 * @returns partner objects
 */
export function createPartners(
  chain: MockChain,
  partners: { [key: string]: bigint },
) {
  const results: { [key: string]: KeyedMockChainParty } = {};
  for (const partner_ of Object.keys(partners)) {
    const partner = chain.newParty(partner_);
    partner.addBalance({ nanoergs: partners[partner_] });
    results[partner_.toLowerCase()] = partner;
  }
  return results;
}

/**
 * Compile all contracts and return
 * @param ergoTree
 * @returns all of contracs
 */
export function initialContracts(ergoTree: string) {
  const scriptsVars = { ...defaultScriptsVariables };
  scriptsVars['service'] = {
    OWNER_NFT_B64: Buffer.from(OWNER_NFT_ID, 'hex').toString('base64'),
    INACTIVE_RAFFLE_SCRIPT_HASH_B64: Buffer.from(blake2b256(ergoTree)).toString(
      'base64',
    ),
    TICKET_REPO_SCRIPT_HASH_B64: Buffer.from(blake2b256(ergoTree)).toString(
      'base64',
    ),
    FEE: 15_000_000n,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };
  const contractsAddresses = compileAll(
    new Map(Object.entries(scriptsVars)) as ContextVarsType,
    true,
  );

  return contractsAddresses;
}

/**
 * Create input Service-Box
 * @param serviceContractAddress
 * @param partnerAddress
 * @returns Service Box
 */
export function createServiceBoxMock(
  serviceContractAddress: string,
  partnerAddress: string,
  licenseTokenCount: bigint = 1000000000n,
) {
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
        R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(partnerAddress)),
        ]).toHex(),
      },
    }),
  );
}

/**
 * create and return mocked Service-Box
 * @param chain
 * @param partyTreeHex
 * @returns ServiceContractParty
 */
export function initServiceContractParty(
  chain: MockChain,
  partyTreeHex: string,
) {
  const serviceContractParty = chain.addParty(partyTreeHex, 'Service Contract');
  serviceContractParty.addUTxOs([
    {
      boxId: '01'.repeat(32),
      transactionId: '12ab34cd'.repeat(8),
      index: 0,
      ergoTree: 'a0ec11'.repeat(203),
      creationHeight: 1,
      value: 1_500_000n,
      assets: [
        {
          // serviceNft
          tokenId: RAFFLE_NFT_ID,
          amount: 1n,
        },
        {
          // raffleLicense
          tokenId: LICENSE_TOKEN_ID,
          amount: 1_000_000_000n,
        },
      ],
      additionalRegisters: {},
    },
  ]);
  return serviceContractParty;
}

/**
 * create output Service-Box
 * @param serviceContractPartyErgoTree
 * @param partnerAddress
 * @returns ServiceBox
 */
export function createServiceOuputBox(
  serviceContractPartyErgoTree: string,
  partnerAddress: string,
  licenseTokenCount: bigint = 999999999n,
  serviceFeePercent?: bigint,
  implementerFeePercent?: bigint,
  creationFee?: bigint,
) {
  serviceFeePercent = serviceFeePercent || 10n;
  implementerFeePercent = implementerFeePercent || 0n;
  creationFee = creationFee || 1_000_000_000n;
  return new OutputBuilder(15_000_000n, serviceContractPartyErgoTree)
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
        Array.from(Buffer.from(partnerAddress)),
      ]).toHex(),
    });
}

/**
 * create output Ticket-Box
 * @param ticketRepoOutputBoxErgoTree
 * @returns TicketBox
 */
export function createTicketRepoOutputBox(ticketRepoOutputBoxErgoTree: string) {
  return new OutputBuilder(15_000_000n, ticketRepoOutputBoxErgoTree).mintToken({
    amount: 1000000000n,
    name: 'TiketRepoToken',
    decimals: 0,
  });
}

/**
 * create output Inactive-Raffle-box
 * @param rosenPartnerAddress
 * @param creatorPartnerAddress
 * @param serviceBoxId
 * @param winnersCount
 * @param charityToken if sets then raffle can only pay charity by this token instead of Ergo
 * @returns InactiveRaffleBox
 */
export function createInactiveRaffleOutputBox(
  rosenPartnerAddress: string,
  creatorPartnerAddress: string,
  serviceBoxId: string,
  winnersCount: bigint = 1n,
  charityToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent?: bigint,
  invalidWinnerHash?: string,
) {
  const tokens = [
    {
      // raffleLicense
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
  ];
  if (charityToken != null) tokens.push(charityToken);

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
    rosenPartnerAddress,
  )
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        70n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        0n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        0n, // TotalSoldTicket,
        winnersCount, // WinnersCount,
        1_000_000_000n, // CreationFee
      ]),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(rosenPartnerAddress)),
        Array.from(Buffer.from('')),
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
}

export function createActiveRaffleBox(
  contractTreeAddress: string,
  partnerAddress: string,
  winnersCount: bigint = 1n,
  charityToken?: TokenAmount<bigint>,
) {
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
  if (charityToken != null) tokens.push(charityToken);

  return mockUTxO({
    ergoTree: contractTreeAddress,
    value:
      winnersCount * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n),
    creationHeight: 5,
    assets: tokens,
    additionalRegisters: {
      R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(partnerAddress)),
      ]).toHex(),
    },
  });
}
