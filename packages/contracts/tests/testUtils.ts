import {
  ErgoUnsignedInput,
  OutputBuilder,
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

export const FEE = 15000000n;
export const RAFFLE_NFT_ID = '1'.repeat(64);
export const LICENSE_TOKEN_ID = '2'.repeat(64);
export const raffleNFTToken = { amount: 1n, tokenId: RAFFLE_NFT_ID };
export const licenseToken = { amount: 1000000000n, tokenId: LICENSE_TOKEN_ID };

export function generateMockedThings(
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

export function initialServiceContract(ergoTree: string) {
  const scriptsVars = { ...defaultScriptsVariables };
  scriptsVars['service'] = {
    OWNER_NFT_B64: '',
    INACTIVE_RAFFLE_SCRIPT_HASH_B64: Buffer.from(blake2b256(ergoTree)).toString(
      'base64',
    ),
    TICKET_REPO_SCRIPT_HASH_B64: Buffer.from(blake2b256(ergoTree)).toString(
      'base64',
    ),
    FEE: 15000000n,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };
  const contractsAddresses = compileAll(
    new Map(Object.entries(scriptsVars)) as ContextVarsType,
    true,
  );

  return contractsAddresses;
}

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
      value: '1500000',
      assets: [
        {
          // serviceNft
          tokenId: RAFFLE_NFT_ID,
          amount: '1',
        },
        {
          // raffleLicense
          tokenId: LICENSE_TOKEN_ID,
          amount: '1000000000',
        },
      ],
      additionalRegisters: {},
    },
  ]);
  return serviceContractParty;
}

export function createServiceBox(
  serviceContractAddress: string,
  partnerAddress: string,
) {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: serviceContractAddress,
      value: 11000000n,
      creationHeight: 4,
      assets: [raffleNFTToken, licenseToken],
      additionalRegisters: {
        R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(partnerAddress)),
        ]).toHex(),
      },
    }),
  );
}

export function createServiceOuputBox(
  serviceContractPartyErgoTree: string,
  partnerAddress: string,
) {
  return new OutputBuilder('15000000', serviceContractPartyErgoTree)
    .addTokens([
      raffleNFTToken,
      {
        amount: 999999999n,
        tokenId: LICENSE_TOKEN_ID,
      },
    ])
    .setAdditionalRegisters({
      R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(partnerAddress)),
      ]).toHex(),
    });
}

export function createTicketRepoOutputBox(ticketRepoOutputBoxErgoTree: string) {
  return new OutputBuilder(15000000n, ticketRepoOutputBoxErgoTree).mintToken({
    amount: 1000000000n,
    name: 'TiketRepoToken',
    decimals: 0,
  });
}

export function createInactiveRaffleOutputBox(
  rosenPartnerAddress: string,
  creatorPartnerAddress: string,
  serviceBoxId: string,
) {
  return new OutputBuilder(
    (
      5n * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n)
    ).toString(),
    rosenPartnerAddress,
  )
    .addTokens([
      {
        // raffleLicense
        tokenId: LICENSE_TOKEN_ID,
        amount: '1',
      },
    ])
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        70n, // CharityPercentage,
        10n, // ServiceFeePercent,
        0n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        0n, // TotalSoldTicket,
        5n, // WinnersCount,
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
      R7: SColl(SColl(SByte), [
        Array.from(Buffer.from(serviceBoxId, 'hex')),
        Array.from(
          // blake2b256(SColl(SLong, [200n, 200n, 200n, 200n, 200n]).toBytes())
          blake2b256(
            Buffer.concat(
              [200n, 200n, 200n, 200n, 200n].map((n) =>
                utils.bigIntToUint8Array(n),
              ),
            ),
          ),
        ),
      ]).toHex(),
    });
}
