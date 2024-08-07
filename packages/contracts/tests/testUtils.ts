import {
  Box,
  Amount,
  ErgoUnsignedInput,
  OutputBuilder,
  TokenAmount,
  SAFE_MIN_BOX_VALUE,
} from '@fleet-sdk/core';
import {
  MockChain,
  MockChainParty,
  BlockState,
  AssetMetadataMap,
  MockChainOptions,
  TransactionExecutionOptions,
  mockUTxO,
  KeyedMockChainParty,
  ExecutionParameters,
  mockBlockchainStateContext,
  BLOCKCHAIN_PARAMETERS,
} from '@fleet-sdk/mock-chain';
import { first, ensureDefaults, Network } from '@fleet-sdk/common';
import { SColl, SByte, SLong, SInt, decode } from '@fleet-sdk/serializer';
import { blake2b256, bigintBE, hex, utf8 } from '@fleet-sdk/crypto';
import type { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import type { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';

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
export const GIFT_TOKEN_ID = '5'.repeat(64);
export const raffleNFTToken = { amount: 1n, tokenId: RAFFLE_NFT_ID };
export const licenseToken = {
  amount: 1_000_000_000n,
  tokenId: LICENSE_TOKEN_ID,
};
export const xToken = { amount: 1000n, tokenId: X_TOKEN_ID };
export const LICENSE_TOKEN_COUNT = 1_000_000_000n;
export const CREATOR_DEFAULT_BALANCE = 500_000_000_000n;
export const UNKNOWN_WALLET_DEFAULT_BALANCE = 10_000_000_000n;

const safeUtf8Encode = (v: unknown) =>
  v instanceof Uint8Array ? utf8.encode(v) : undefined;

type RaffleTransactionExecutionResult = {
  success: boolean;
  tx: {
    dataInputs: object[];
    id: string;
    inputs: object[];
    outputs: object[];
  } | null;
  reason?: string;
};

export type OutputBox = Box<Amount>;

type executeAndReturnOutputsResult = {
  success: boolean;
  outputs: OutputBox[];
};

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
  console.log('=============++>', Object.keys(results))
  return results;
};

/**
 * Compile all contracts and return
 * @param extraVarsValues
 * @returns all of contracts
 */
export const initialContracts = (
  extraVarsValues: { [k: string]: { [k2: string]: string } } = {},
): { [key: string]: string } => {
  const scriptsVars = { ...constants.defaultScriptsVariables };
  const defaultLicenseTokenId = Buffer.from(LICENSE_TOKEN_ID, 'hex').toString(
    'base64',
  );

  scriptsVars['service'] = {
    OWNER_NFT_B64: Buffer.from(OWNER_NFT_ID, 'hex').toString('base64'),
    FEE: constants.DEFAULT_FEE,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };
  scriptsVars['ticketRepo'] = {
    RAFFLE_LICENSE_B64: defaultLicenseTokenId,
  };
  scriptsVars['winner'] = {
    RAFFLE_LICENSE_B64: defaultLicenseTokenId,
  };
  for (const scriptKeyName of Object.keys(extraVarsValues)) {
    for (const extraKey of Object.keys(extraVarsValues[scriptKeyName])) {
      scriptsVars[scriptKeyName][extraKey] =
        extraVarsValues[scriptKeyName][extraKey];
    }
  }
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
  ergoTree: string = contractsAddresses['service'],
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: ergoTree,
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
        R5: SColl(SByte, Array.from(Buffer.from(ownerAddress))).toHex(),
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
  ergoTree: string = contractsAddresses['service'],
) => {
  return new OutputBuilder(15_000_000n, ergoTree)
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
      R5: SColl(SByte, Array.from(Buffer.from(ownerAddress))).toHex(),
    });
};

/**
 * create TicketRepo UTxO
 * @returns ErgoUnsignedInput
 */
export const createTicketRepoBoxMock = (
  ergoTree: string = contractsAddresses['ticketRepo'],
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: ergoTree,
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
export const createTicketRepoOutputBox = (
  ergoTree: string = contractsAddresses['ticketRepo'],
) => {
  return new OutputBuilder(FEE, ergoTree).mintToken({
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
 * @param ticketTokenId
 * @param deadline
 * @param ergoTree
 * @returns InactiveRaffleBox
 */
export const createInactiveRaffleBoxMock = (
  ownerAddress: string,
  implementerPartnerAddress: string,
  creatorPartnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent: bigint = 10n,
  invalidWinnerHash?: string,
  creationFee: bigint = 1_000_000_000n,
  ticketTokenId: string = TICKET_TOKEN_ID,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['inactiveRaffle'],
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
      ergoTree: ergoTree,
      assets: tokens,
      additionalRegisters: {
        R4: SColl(SLong, [
          60n, // CharityPercentage,
          serviceFeePercent, // ServiceFeePercent,
          10n, // ImplementerFeePercent,
          10n, // TicketPrice,
          1000n, // Goal,
          deadline, // DeadlineTimestamp,
          winnersCount, // WinnersCount,
          FEE, // TxFee
        ]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(blake2b256(Buffer.from(ownerAddress))),
          Array.from(blake2b256(Buffer.from(implementerPartnerAddress))),
          Array.from(blake2b256(Buffer.from(creatorPartnerAddress))),
        ]).toHex(),
        R6: SColl(SColl(SByte), [
          Array.from(Buffer.from('Test')),
          Array.from(Buffer.from('Some descriptions...')),
        ]).toHex(),
        R7:
          invalidWinnerHash ||
          SColl(SColl(SByte), [
            Array.from(Buffer.from(ticketTokenId, 'hex')),
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
 * @param ownerAddress
 * @param implementerPartnerAddress
 * @param creatorPartnerAddress
 * @param winnersCount
 * @param collectingToken if sets then raffle can only pay charity by this token instead of Erg
 * @param winnersPercents
 * @param serviceFeePercent
 * @param invalidWinnerHash
 * @param creationFee
 * @param ticketToken
 * @param deadline
 * @param ergoTree
 * @returns InactiveRaffleBox
 */
export const createInactiveRaffleOutputBox = (
  ownerAddress: string,
  implementerPartnerAddress: string,
  creatorPartnerAddress: string,
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
  winnersPercents?: bigint[],
  serviceFeePercent: bigint = 10n,
  invalidWinnerHash?: string,
  creationFee: bigint = 1_000_000_000n,
  ticketToken: string = TICKET_TOKEN_ID,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['inactiveRaffle'],
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

  return new OutputBuilder(4n * FEE * winnersCount + creationFee, ergoTree)
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        deadline, // DeadlineTimestamp,
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]),
      R5: SColl(SColl(SByte), [
        Array.from(blake2b256(Buffer.from(ownerAddress))),
        Array.from(blake2b256(Buffer.from(implementerPartnerAddress))),
        Array.from(blake2b256(Buffer.from(creatorPartnerAddress))),
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
 * @param creationFee
 * @param value
 * @param deadline
 * @param totalSoldTicket
 * @param ergoTree
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
  deadline: bigint = 100n,
  totalSoldTicket: bigint = 0n,
  ergoTree: string = contractsAddresses['activeRaffle']
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
    ergoTree: ergoTree,
    creationHeight: 5,
    assets: tokens,
    additionalRegisters: {
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        deadline, // DeadlineTimestamp,
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(creatorPartnerAddress, 'hex')),
        Array.from(Buffer.from(implementerPartnerAddress)),
        Array.from(Buffer.from(creatorPartnerAddress)),
      ]).toHex(),
      R6: SColl(SLong, [totalSoldTicket]).toHex(),
    },
  });
};

/**
 * Create output box of active-raffle
 * @param ownerAddress
 * @param creatorPartnerAddress
 * @param implementerPartnerAddress
 * @param winnersCount
 * @param serviceFeePercent
 * @param collectingToken
 * @param creationFee
 * @param value
 * @param ticketTokenAmount
 * @param ticketTokenId
 * @param totalSoldTicket
 * @param deadline
 * @param ergoTree
 * @returns
 */
export const createActiveRaffleOutputBox = (
  ownerAddress: string,
  creatorPartnerAddress: string,
  implementerPartnerAddress: string,
  winnersCount: bigint = 1n,
  serviceFeePercent: bigint = 10n,
  collectingToken?: TokenAmount<bigint>,
  creationFee: bigint = 1_000_000_000n,
  value?: bigint,
  ticketTokenAmount?: bigint,
  ticketTokenId: string = TICKET_TOKEN_ID,
  totalSoldTicket: bigint = 0n,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['activeRaffle'],
) => {
  value = value || FEE * winnersCount + creationFee - FEE;

  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: ticketTokenId,
      amount: ticketTokenAmount || 1_000_000_000n - 1n - winnersCount,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return new OutputBuilder(value, ergoTree)
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        60n, // CharityPercentage,
        serviceFeePercent, // ServiceFeePercent,
        10n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        deadline, // DeadlineTimestamp,
        winnersCount, // WinnersCount,
        FEE, // TxFee
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(blake2b256(Buffer.from(ownerAddress))),
        Array.from(blake2b256(Buffer.from(implementerPartnerAddress))),
        Array.from(blake2b256(Buffer.from(creatorPartnerAddress))),
      ]),
      R6: SColl(SLong, [totalSoldTicket]).toHex(),
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
  ticketTokenId: string = TICKET_TOKEN_ID,
  ergoTree: string = contractsAddresses['raffleDetails'],
) => {
  const detailsBox = new OutputBuilder(FEE, ergoTree)
    .setAdditionalRegisters({
      R4: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]).toHex(),
    })
    .addTokens([
      {
        amount: 1n,
        tokenId: ticketTokenId,
      },
    ]);

  return detailsBox;
};

/**
 * Create and return gift token repo input box
 * @param winnersCount
 * @param ticketId
 * @param giftTokenId
 * @param giftTokenCount
 * @param value
 * @param step
 * @param giftAssetTokenCount
 * @returns
 */
export const createGiftTokenRepoBoxMock = (
  winnersCount: number,
  ticketId: string = TICKET_TOKEN_ID,
  giftTokenId: string,
  giftTokenCount: number = 1,
  value?: bigint,
  step: number = 1,
  giftAssetTokenCount?: number,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['giftTokenRepo'],
      value: value === undefined ? FEE * BigInt(winnersCount) : value,
      creationHeight: 7,
      additionalRegisters: {
        R4: SColl(SInt, [1]).toHex(),
        R5: SColl(SInt, [2]).toHex(),
        R6: SColl(SInt, [3]).toHex(),
        R7: SColl(SInt, [giftTokenCount, winnersCount, Number(FEE)]).toHex(),
        R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
        R9: SInt(step).toHex(),
      },
      assets:
        giftAssetTokenCount !== undefined || giftTokenCount > 0
          ? [
              {
                tokenId: giftTokenId,
                amount: BigInt(
                  giftAssetTokenCount !== undefined
                    ? giftAssetTokenCount
                    : giftTokenCount,
                ),
              },
            ]
          : [],
    }),
  );
};

/**
 * Create and return gift token repo output box
 * @param giftTokenCount
 * @param winnersCount
 * @param ticketId
 * @param mintingToken
 * @param giftAssetTokenCount
 * @param value
 * @param step
 * @returns
 */
export const createGiftTokenRepoOutputBox = (
  giftTokenCount: number,
  winnersCount: number,
  ticketId: string = TICKET_TOKEN_ID,
  tokenInsertionType: undefined | 'mint' | 'add' = 'mint',
  giftAssetTokenCount?: bigint,
  value?: bigint,
  step: number = 1,
  giftTokenId: string = GIFT_TOKEN_ID,
  ergoTree: string = contractsAddresses['giftTokenRepo'],
) => {
  const giftBox = new OutputBuilder(
    value === undefined ? FEE * BigInt(winnersCount) : value,
    ergoTree,
  ).setAdditionalRegisters({
    R4: SColl(SInt, [1]).toHex(),
    R5: SColl(SInt, [2]).toHex(),
    R6: SColl(SInt, [3]).toHex(),
    R7: SColl(SInt, [giftTokenCount, winnersCount, Number(FEE)]).toHex(),
    R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
    R9: SInt(step).toHex(),
  });
  if (tokenInsertionType === 'mint')
    giftBox.mintToken({
      amount:
        giftAssetTokenCount || BigInt(giftTokenCount) * BigInt(winnersCount),
      name: 'RaffleGiftToken',
      decimals: 0,
    });
  if (tokenInsertionType === 'add')
    giftBox.assets.add({
      amount:
        giftAssetTokenCount || BigInt(giftTokenCount) * BigInt(winnersCount),
      tokenId: giftTokenId,
    });

  return giftBox;
};

/**
 * create winners output boxes
 * @param winnersCount
 * @param inactiveRaffleBoxId
 * @param ticketTokenId
 * @param ticketTokenAmount
 * @param giftCount
 * @param deadline
 * @param ergoTree
 * @returns
 */
export const createWinnersBoxMock = (
  winnersCount: bigint = 1n,
  inactiveRaffleBoxId: string,
  ticketTokenId: string = TICKET_TOKEN_ID,
  ticketTokenAmount: bigint = 1n,
  giftCount: bigint = 1n,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['winner'],
): Box[] => {
  const winnersBoxes = [];
  for (let i = 0; i < winnersCount; i++)
    winnersBoxes.push(
      mockUTxO({
        value: 2n * 15000000n,
        ergoTree: ergoTree,
        additionalRegisters: {
          R4: SColl(SLong, [
            BigInt(i + 1),
            1000n / winnersCount,
            deadline,
            FEE,
          ]).toHex(),
          R5: SLong(giftCount).toHex(),
          R6: SColl(
            SByte,
            Array.from(Buffer.from(inactiveRaffleBoxId, 'hex')),
          ).toHex(),
        },
        assets: [
          {
            tokenId: ticketTokenId,
            amount: ticketTokenAmount,
          },
        ],
      }),
    );

  return winnersBoxes;
};

/**
 * create winners output boxes
 * @param winnersCount
 * @param inactiveRaffleBoxId
 * @param ticketTokenId
 * @param ticketTokenAmount
 * @param giftCount
 * @param deadline
 * @param ergoTree
 * @returns
 */
export const createWinnersOutputBox = (
  winnersCount: bigint = 1n,
  inactiveRaffleBoxId: string,
  ticketTokenId: string = TICKET_TOKEN_ID,
  ticketTokenAmount: bigint = 1n,
  giftCount: bigint = 0n,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['winner'],
) => {
  const itemsCount = winnersCount || 1;
  const winnersBoxes = [];
  for (let i = 0; i < itemsCount; i++) {
    winnersBoxes.push(
      new OutputBuilder(2n * FEE, ergoTree)
        .setAdditionalRegisters({
          R4: SColl(SLong, [BigInt(i + 1), 1000n / winnersCount, deadline, FEE]),
          R5: SLong(giftCount),
          R6: SColl(SByte, Array.from(Buffer.from(inactiveRaffleBoxId, 'hex'))),
        })
        .addTokens({
          tokenId: ticketTokenId,
          amount: ticketTokenAmount,
        }),
    );
  }

  return winnersBoxes;
};


export const createGiftForWinnerOutputBox = (
	winnerIndex: number,
	giftTokenId: string,
	giftGiverWalletAddress: string,
	giftValue: bigint = 0n,
	giftToken?: TokenAmount<bigint>,
	ergoTree: string = contractsAddresses['gift']
) => {
	const giftBoxValue = FEE;
	const giftForWinnerOutputBox =  new OutputBuilder(SAFE_MIN_BOX_VALUE + giftBoxValue + giftValue, ergoTree)
		.setAdditionalRegisters({
			R4: SColl(SByte, Array.from(Buffer.from(giftGiverWalletAddress, 'hex'))),
			R5: SInt(winnerIndex),
		})
		.addTokens({
			tokenId: giftTokenId,
			amount: 1n,
		});
	if(giftToken !== undefined) {
		giftForWinnerOutputBox.assets.add(giftToken);
	}
	return giftForWinnerOutputBox;
}

export const createDonateTicketOutputBox = (
	donatorWalletAddress: string,
	ergoTree: string = contractsAddresses['ticket'],
) => {
	const donateTicketOutputBox = new OutputBuilder(FEE, ergoTree);
	donateTicketOutputBox.setAdditionalRegisters({
		R4: SColl(SByte, Array.from(Buffer.from(donatorWalletAddress, 'hex'))),
		R5: SColl(SLong, [0n, 0n, 0n]).toHex()
	});
	return donateTicketOutputBox
}

export const createGiftRedeemOutputBox = (
  creationFee: bigint,
  totalSoldTicket: bigint,
  ticketPrice: bigint,
  winnersCount: bigint,
  step: bigint,
  ticketTokenId: string,
  ticketTokenCount: bigint,
  ergoTree: string = contractsAddresses['giftRedeem']
) => {
  const giftRedeemOutputBox = new OutputBuilder(FEE * winnersCount + creationFee - FEE, ergoTree);
  giftRedeemOutputBox.setAdditionalRegisters({
    R4: SColl(SLong, Array.from([totalSoldTicket, ticketPrice, winnersCount, FEE])),
		R5: SLong(step).toHex()
	});
  giftRedeemOutputBox.addTokens([
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n
    },
    {
      tokenId: ticketTokenId,
      amount: ticketTokenCount
    }
  ])
  return giftRedeemOutputBox;
}

/**
 * Get content and print on the output pretty
 * @param content
 * @param prefix
 */
export const prettyPrintJson = (
  content: object,
  prefix: string = '',
  briefErgoTree: boolean = true,
) => {
  console.log(
    prefix,
    JSON.stringify(
      content,
      (k, v) => {
        if ((briefErgoTree && k == '_ergoTree') || k == 'ergoTree')
          return '...';
        return typeof v == 'bigint' ? String(v) : v;
      },
      4,
    ),
  );
};

export class RaffleMockChain extends MockChain {
  readonly #parties: MockChainParty[];
  readonly #tip: BlockState;
  readonly #base: BlockState;
  #metadataMap: AssetMetadataMap;

  constructor();
  constructor(height?: number);
  constructor(options?: MockChainOptions);
  constructor(heightOrOptions?: number | MockChainOptions) {
    const options =
      !heightOrOptions || typeof heightOrOptions === 'number'
        ? { height: heightOrOptions ?? 0 }
        : heightOrOptions;

    const state = ensureDefaults(options, {
      height: 0,
      timestamp: new Date().getTime(),
      parameters: ensureDefaults(options.parameters, BLOCKCHAIN_PARAMETERS),
    });

    super();

    this.#tip = state;
    this.#base = { ...state };
    this.#parties = [];
    this.#metadataMap = new Map();
  }

  #executeAndReturnTx = (
    unsigned: ErgoUnsignedTransaction,
    keys: ErgoHDKey[],
    parameters?: ExecutionParameters,
  ): RaffleTransactionExecutionResult => {
    for (const key of keys) {
      if (!key.hasPrivateKey()) {
        throw new Error(
          `ErgoHDKey '${hex.encode(key.publicKey)}' must have a private key.`,
        );
      }
    }

    const eip12Tx = unsigned.toEIP12Object();
    const params = ensureDefaults(parameters, {
      context: mockBlockchainStateContext(),
      parameters: BLOCKCHAIN_PARAMETERS,
      network: Network.Mainnet,
      baseCost: 0,
    });

    try {
      const builder = ProverBuilder$.create(params.parameters, params.network);
      for (const key of keys) {
        builder.withDLogSecret(bigintBE.encode(key.privateKey as Uint8Array));
      }
      const prover = builder.build();

      const reducedTx = prover.reduce(
        params.context,
        eip12Tx,
        eip12Tx.inputs,
        eip12Tx.dataInputs,
        unsigned.burning.tokens,
        params.baseCost,
      );

      const tx = prover.signReduced(reducedTx, undefined);

      return { success: true, tx: tx };
    } catch (e) {
      return { success: false, reason: (e as Error).message, tx: null };
    }
  };

  executeAndReturnOutputs = (
    unsignedTransaction: ErgoUnsignedTransaction,
    options?: TransactionExecutionOptions,
    baseCost?: number,
  ): executeAndReturnOutputsResult => {
    const keys = (options?.signers || this.#parties)
      .filter((p): p is KeyedMockChainParty => p instanceof KeyedMockChainParty)
      .map((p) => p.key);

    console.log('************)+>', this.height);

    const context = mockBlockchainStateContext({
      headers: {
        quantity: 10,
        fromHeight: this.#tip.height,
        fromTimestamp: this.#tip.timestamp,
      },
    });

    const result = this.#executeAndReturnTx(unsignedTransaction, keys, {
      context,
      baseCost,
      parameters: this.#tip.parameters,
    });

    if (!result.success) {
      if (options?.throw !== false) throw new Error(result.reason);
      return { success: false, outputs: [] };
    }

    const { inputs, outputs } = unsignedTransaction.toPlainObject();
    for (const party of this.#parties) {
      for (let i = inputs.length - 1; i >= 0; i--) {
        if (party.utxos.exists(inputs[i].boxId)) {
          party.utxos.remove(inputs[i].boxId);
        }
      }

      for (let i = outputs.length - 1; i >= 0; i--) {
        if (party.ergoTree === outputs[i].ergoTree) {
          party.utxos.add(outputs[i]);
          outputs.splice(i, 1);
        }
      }
    }

    this.#pushMetadata(unsignedTransaction);

    this.newBlock();

    return { success: true, outputs: result.tx!.outputs as OutputBox[] };
  };

  #pushMetadata(transaction: ErgoUnsignedTransaction) {
    const firstInputId = first(transaction.inputs).boxId;
    const box = transaction.outputs.find((output) =>
      output.assets.some((asset) => asset.tokenId === firstInputId),
    );
    if (!box) return;

    const name = decode(box.additionalRegisters.R4, safeUtf8Encode);
    const decimals = decode(box.additionalRegisters.R6, safeUtf8Encode);
    if (name) {
      this.#metadataMap.set(firstInputId, {
        name,
        decimals: decimals ? Number.parseInt(decimals) : undefined,
      });
    }
  }
}

export const contractsAddresses = initialContracts();
