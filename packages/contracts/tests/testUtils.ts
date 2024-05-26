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
import { SColl, SByte, SLong, SInt } from '@fleet-sdk/serializer';
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
export const TICKET_TOKEN_ID = '4'.repeat(64);
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
 * @param ownerAddress
 * @param partnerAddress
 * @param serviceFeePercent
 * @param implementerFeePercent
 * @param creationFee
 * @returns Service Box
 */
export const createServiceBoxMock = (
  ownerAddress: string,
  licenseTokenCount: bigint = LICENSE_TOKEN_COUNT,
  serviceFeePercent: bigint = 10n,
  implementerFeePercent: bigint = 10n,
  creationFee: bigint = 1_000_000_000n,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['service'],
      value: 11_000_000n,
      creationHeight: 4,
      assets: [
        raffleNFTToken,
        { tokenId: LICENSE_TOKEN_ID, amount: licenseTokenCount },
      ],
      additionalRegisters: {
        R4: SColl(SLong, [
          serviceFeePercent,
          implementerFeePercent,
          creationFee,
          FEE,
        ]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(ownerAddress, 'hex')),
        ]).toHex(),
      },
    }),
  );
};

/**
 * create output Service-Box
 * @param ownerAddress
 * @param licenseTokenCount
 * @param serviceFeePercent
 * @param implementerFeePercent
 * @param creationFee
 * @returns ServiceBox
 */
export const createServiceOutputBox = (
  ownerAddress: string,
  licenseTokenCount: bigint = 999999999n,
  serviceFeePercent: bigint = 10n,
  implementerFeePercent: bigint = 10n,
  creationFee: bigint = 1_000_000_000n,
) => {
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
        FEE,
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(ownerAddress, 'hex')),
      ]).toHex(),
    });
};

/**
 * create TicketRepo UTxO
 * @returns ErgoUnsignedInput
 */
export const createTicketRepoBoxMock = () => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['ticketRepo'],
      value: FEE,
      creationHeight: 5,
      assets: [
        {
          tokenId: TICKET_TOKEN_ID,
          amount: 1_000_000_000n,
        },
      ],
    }),
  );
};

/**
 * create output Ticket-Box
 * @returns TicketBox
 */
export const createTicketRepoOutputBox = () => {
  return new OutputBuilder(FEE, contractsAddresses['ticketRepo']).mintToken({
    amount: 1_000_000_000n,
    name: 'TicketRepoToken',
    decimals: 0,
  });
};

/**
 * create Inactive-Raffle UTxO
 * @param implementerPartnerAddress
 * @param creatorPartnerAddress
 * @param winnersCount
 * @param collectingToken if sets then raffle can only pay charity by this token instead of Erg
 * @param winnersPercents
 * @param serviceFeePercent
 * @param invalidWinnerHash
 * @param creationFee
 * @returns InactiveRaffleBox
 */
export const createInactiveRaffleBoxMock = (
  implementerPartnerAddress: string,
  creatorPartnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent: bigint = 10n,
  invalidWinnerHash?: string,
  creationFee: bigint = 1_000_000_000n,
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
    for (let i = 0; i < winnersCount; i++) {
      winnersPercents.push(1000n / winnersCount);
    }

  return new ErgoUnsignedInput(
    mockUTxO({
      value: 4n * FEE * winnersCount + creationFee,
      ergoTree: contractsAddresses['inactiveRaffle'],
      assets: tokens,
      additionalRegisters: {
        R4: SColl(SLong, [
          60n, // CharityPercentage,
          serviceFeePercent, // ServiceFeePercent,
          10n, // ImplementerFeePercent,
          10n, // TicketPrice,
          1000n, // Goal,
          0n, // DeadlineTimestamp,
          winnersCount, // WinnersCount,
          FEE, // TxFee
        ]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(creatorPartnerAddress, 'hex')),
          Array.from(Buffer.from(implementerPartnerAddress)),
          Array.from(Buffer.from(creatorPartnerAddress)),
        ]).toHex(),
        R6: SColl(SColl(SByte), [
          Array.from(Buffer.from('Test')),
          Array.from(Buffer.from('Some descriptions...')),
        ]).toHex(),
        R7:
          invalidWinnerHash ||
          SColl(SColl(SByte), [
            Array.from(Buffer.from(TICKET_TOKEN_ID, 'hex')),
            Array.from(
              blake2b256(
                Buffer.concat(
                  winnersPercents.map((n) => utils.bigIntToUint8Array(n)),
                ),
              ),
            ),
          ]).toHex(),
      },
    }),
  );
};

/**
 * create output Inactive-Raffle-box
 * @param implementerPartnerAddress
 * @param creatorPartnerAddress
 * @param winnersCount
 * @param collectingToken if sets then raffle can only pay charity by this token instead of Erg
 * @param winnersPercents
 * @param serviceFeePercent
 * @param invalidWinnerHash
 * @param creationFee
 * @param ticketToken
 * @returns InactiveRaffleBox
 */
export const createInactiveRaffleOutputBox = (
  implementerPartnerAddress: string,
  creatorPartnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent?: bigint,
  invalidWinnerHash?: string,
  creationFee: bigint = 1_000_000_000n,
  ticketToken: string = TICKET_TOKEN_ID,
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
    4n * FEE * winnersCount + creationFee,
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
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(creatorPartnerAddress, 'hex')),
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
          Array.from(Buffer.from(ticketToken, 'hex')),
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
 * Create output box of active-raffle
 * @param creatorPartnerAddress
 * @param implementerPartnerAddress
 * @param winnersCount
 * @param serviceFeePercent
 * @param collectingToken
 * @returns
 */
export const createActiveRaffleBoxMock = (
  creatorPartnerAddress: string,
  implementerPartnerAddress: string,
  winnersCount: bigint = 1n,
  serviceFeePercent: bigint = 10n,
  collectingToken?: TokenAmount<bigint>,
  creationFee: bigint = 1_000_000_000n,
  value?: bigint,
) => {
  value = value || FEE * winnersCount + creationFee - FEE;

  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: TICKET_TOKEN_ID,
      amount: 1_000_000_000n - 1n - winnersCount,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return mockUTxO({
    value: value,
    ergoTree: contractsAddresses['activeRaffle'],
    creationHeight: 5,
    assets: tokens,
    additionalRegisters: {
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(creatorPartnerAddress, 'hex')),
        Array.from(Buffer.from(implementerPartnerAddress)),
        Array.from(Buffer.from(creatorPartnerAddress)),
      ]).toHex(),
      R6: SColl(SLong, [0n]).toHex(),
    },
  });
};

/**
 * Create output box of active-raffle
 * @param creatorPartnerAddress
 * @param implementerPartnerAddress
 * @param winnersCount
 * @param serviceFeePercent
 * @param collectingToken
 * @returns
 */
export const createActiveRaffleOutputBox = (
  creatorPartnerAddress: string,
  implementerPartnerAddress: string,
  winnersCount: bigint = 1n,
  serviceFeePercent: bigint = 10n,
  collectingToken?: TokenAmount<bigint>,
  creationFee: bigint = 1_000_000_000n,
  value?: bigint,
) => {
  value = value || FEE * winnersCount + creationFee - FEE;

  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: TICKET_TOKEN_ID,
      amount: 1_000_000_000n - 1n - winnersCount,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return new OutputBuilder(value, contractsAddresses['activeRaffle'])
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(creatorPartnerAddress, 'hex')),
        Array.from(Buffer.from(implementerPartnerAddress)),
        Array.from(Buffer.from(creatorPartnerAddress)),
      ]),
      R6: SColl(SLong, [0n]).toHex(),
    });
};

/**
 * Create and return success-raffle input box
 * @param partnerAddress
 * @param winnersCount
 * @returns
 */
export const createSuccessRaffleBox = (
  partnerAddress: string,
  winnersCount: bigint = 1n,
) => {
  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
  ];

  return mockUTxO({
    ergoTree: contractsAddresses['successRaffle'],
    // To Do: Update value in later implementations
    value: winnersCount * FEE + (2n * FEE + 1_000_000_000n),
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
 * Create and return Raffle-details input box
 * @param ticket_token_id
 * @returns
 */
export const createRaffleDetailsBoxMock = (
  ticket_token_id: string = TICKET_TOKEN_ID,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['raffleDetails'],
      value: FEE,
      creationHeight: 6,
      additionalRegisters: {
        R4: SColl(SColl(SByte), [
          Array.from(Buffer.from('Test')),
          Array.from(Buffer.from('Some descriptions...')),
        ]).toHex(),
      },
      assets: [
        {
          amount: 1n,
          tokenId: ticket_token_id,
        },
      ],
    }),
  );
};

/**
 * Create raffle-details output box
 * @param ticket_token_id
 * @returns Output Box
 */
export const createRaffleDetailsOutputBox = (
  ticket_token_id: string = TICKET_TOKEN_ID,
) => {
  const detailsBox = new OutputBuilder(FEE, contractsAddresses['raffleDetails'])
    .setAdditionalRegisters({
      R4: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]).toHex(),
    })
    .addTokens([
      {
        amount: 1n,
        tokenId: ticket_token_id,
      },
    ]);

  return detailsBox;
};

/**
 * Create and return gift token repo input box
 * @param winnersCount
 * @param ticketId
 * @param giftTokenCount
 * @returns
 */
export const createGiftTokenRepoBoxMock = (
  winnersCount: number,
  ticketId: string = TICKET_TOKEN_ID,
  giftTokenCount: number = 1_000,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['giftTokenRepo'],
      value: FEE * BigInt(winnersCount),
      creationHeight: 7,
      additionalRegisters: {
        R4: SColl(SInt, [1]).toHex(),
        R5: SColl(SInt, [2]).toHex(),
        R6: SColl(SInt, [3]).toHex(),
        R7: SColl(SInt, [giftTokenCount, winnersCount, Number(FEE)]).toHex(),
        R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
      },
    }),
  );
};

/**
 * Create and return gift token repo output box
 * @param giftTokenCount
 * @param winnersCount
 * @param ticketId
 * @param mintingToken
 * @returns
 */
export const createGiftTokenRepoOutputBox = (
  giftTokenCount: number,
  winnersCount: number,
  ticketId: string = TICKET_TOKEN_ID,
  mintingToken: boolean = true,
  gitTokenCustomAmount?: bigint,
) => {
  const giftBox = new OutputBuilder(
    FEE * BigInt(winnersCount),
    contractsAddresses['giftTokenRepo'],
  ).setAdditionalRegisters({
    R4: SColl(SInt, [1]).toHex(),
    R5: SColl(SInt, [2]).toHex(),
    R6: SColl(SInt, [3]).toHex(),
    R7: SColl(SInt, [giftTokenCount, winnersCount, Number(FEE)]).toHex(),
    R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))),
  });
  if (mintingToken)
    giftBox.mintToken({
      amount:
        gitTokenCustomAmount || BigInt(giftTokenCount) * BigInt(winnersCount),
      name: 'RaffleGiftToken',
      decimals: 0,
    });

  return giftBox;
};

/**
 * create winners output boxes
 * @param winnersCount
 * @param inactiveRaffleBoxId
 * @returns
 */
export const createWinnersOutputBox = (
  winnersCount: bigint = 1n,
  inactiveRaffleBoxId: string,
) => {
  const winnersBoxes = [];
  for (let i = 0; i < winnersCount; i++)
    winnersBoxes.push(
      new OutputBuilder(2n * FEE, contractsAddresses['winner'])
        .setAdditionalRegisters({
          R4: SColl(SLong, [BigInt(i + 1), 1000n / winnersCount, 0n, FEE]),
          R5: SLong(0n),
          R6: SColl(SByte, Array.from(Buffer.from(inactiveRaffleBoxId, 'hex'))),
        })
        .addTokens([
          {
            tokenId: TICKET_TOKEN_ID,
            amount: 1n,
          },
        ]),
    );

  return winnersBoxes;
};

/**
 * Get content and print on the output pretty
 * @param content
 * @param prefix
 */
export const prettyPrintJson = (content: object, prefix: string = '') => {
  console.log(
    prefix,
    JSON.stringify(
      content,
      (k, v) => (typeof v == 'bigint' ? String(v) : v),
      4,
    ),
  );
};

export const contractsAddresses = initialContracts();
