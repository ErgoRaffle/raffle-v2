import {
  Box,
  Amount,
  ErgoUnsignedInput,
  OutputBuilder,
  SAFE_MIN_BOX_VALUE,
  TokenAmount,
  ErgoAddress,
} from '@fleet-sdk/core';
import {
  KeyedMockChainParty,
  MockChain,
  MockChainParty,
  BlockState,
  AssetMetadataMap,
  MockChainOptions,
  TransactionExecutionOptions,
  mockUTxO,
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
import * as constants from '../constants';
import { ContextVarsType } from '../lib/types';

import * as utils from '../lib/utils';
import { compileAll } from '../lib/utils';

export const FEE = constants.DEFAULT_FEE;
export const OWNER_NFT_ID = '1234'.repeat(16);
export const ORACLE_NFT_ID = '5678'.repeat(16);
export const RAFFLE_NFT_ID = '1'.repeat(64);
export const LICENSE_TOKEN_ID = '2'.repeat(64);
export const X_TOKEN_ID = '3'.repeat(64);
export const TICKET_TOKEN_ID = '4'.repeat(64);
export const GIFT_TOKEN_ID = '5'.repeat(64);
export const GIFT_TOKEN_COUNT = 2_000;
export const CREATION_FEE = 1_000_000_000n;
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
  return results;
};

/**
 * Compile all contracts and return
 * @param extraVarsValues
 * @returns all of contracts
 */
export const initialContracts = (): { [key: string]: string } => {
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
  scriptsVars['inactiveRaffle'] = {
    GIFT_TOKEN_COUNT: GIFT_TOKEN_COUNT,
  };
  scriptsVars['activeRaffle'] = {
    ORACLE_TOKEN_ID_B64: ORACLE_NFT_ID,
  };
  return compileAll(
    new Map(Object.entries(scriptsVars)) as unknown as ContextVarsType,
    true,
  );
};

/**
 * Create input Service-Box
 * @param ownerAddress
 * @param licenseTokenCount
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
  creationFee = CREATION_FEE,
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
  creationFee = CREATION_FEE,
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
export const createTicketRepoOutputBox = () => {
  return new OutputBuilder(FEE, contractsAddresses['ticketRepo']).mintToken({
    amount: 1_000_000_000n,
    name: 'TicketRepoToken',
    decimals: 0,
  });
};

/**
 * create Inactive-Raffle UTxO
 * @param ownerAddress
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
  creationFee: bigint = CREATION_FEE,
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
  if (collectingToken !== undefined) tokens.push(collectingToken);

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
  creationFee = CREATION_FEE,
  ticketToken: string = TICKET_TOKEN_ID,
  deadline: bigint = 100n,
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
  creationFee: bigint = CREATION_FEE,
  value?: bigint,
  deadline: bigint = 100n,
  totalSoldTicket: bigint = 0n,
  ergoTree: string = contractsAddresses['activeRaffle'],
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
 * Create active raffle box with registers
 * @param r4
 * @param r5
 * @param value
 * @param ticketTokenAmount
 * @param ticketTokenId
 * @param totalSoldTicket
 * @param collectingToken
 * @returns
 */
export const createActiveRaffleWithConstantRegisters = (
  r4: bigint[],
  r5: Uint8Array[],
  value: bigint,
  ticketTokenAmount: bigint,
  ticketTokenId: string = TICKET_TOKEN_ID,
  totalSoldTicket: bigint = 0n,
  collectingToken?: TokenAmount<bigint>,
) => {
  const tokens = [
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: ticketTokenId,
      amount: ticketTokenAmount,
    },
  ];
  if (collectingToken != null) tokens.push(collectingToken);

  return new OutputBuilder(value, contractsAddresses['activeRaffle'])
    .addTokens(tokens)
    .setAdditionalRegisters({
      R4: SColl(SLong, r4).toHex(),
      R5: SColl(
        SColl(SByte),
        r5.map((value) => Array.from(value)),
      ),
      R6: SLong(totalSoldTicket),
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
 * @returns
 */
export const createActiveRaffleOutputBox = (
  ownerAddress: string,
  creatorPartnerAddress: string,
  implementerPartnerAddress: string,
  winnersCount: bigint = 1n,
  serviceFeePercent: bigint = 10n,
  collectingToken?: TokenAmount<bigint>,
  creationFee = CREATION_FEE,
  value?: bigint,
  ticketTokenAmount?: bigint,
  ticketTokenId: string = TICKET_TOKEN_ID,
  totalSoldTicket: bigint = 0n,
  deadline: bigint = 100n,
) => {
  value = value || creationFee - FEE;

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

  return new OutputBuilder(value, contractsAddresses['activeRaffle'])
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
      R6: SLong(totalSoldTicket),
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
 * @param ticketTokenId
 * @returns
 */
export const createRaffleDetailsBoxMock = (
  ticketTokenId: string = TICKET_TOKEN_ID,
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
          tokenId: ticketTokenId,
        },
      ],
    }),
  );
};

/**
 * Create raffle-details output box
 * @param ticketTokenId
 * @returns Output Box
 */
export const createRaffleDetailsOutputBox = (
  ticketTokenId: string = TICKET_TOKEN_ID,
) => {
  return new OutputBuilder(FEE, contractsAddresses['raffleDetails'])
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
};

/**
 * Create and return gift token repo input box
 * @param winnersCount
 * @param step
 * @param value
 * @param giftAssetTokenCount
 * @param ticketId
 * @param giftTokenId
 * @returns
 */
export const createGiftTokenRepoBoxMock = (
  winnersCount: number,
  step: number = 1,
  value = FEE * BigInt(winnersCount),
  giftAssetTokenCount = BigInt(winnersCount * GIFT_TOKEN_COUNT),
  ticketId: string = TICKET_TOKEN_ID,
  giftTokenId = GIFT_TOKEN_ID,
) => {
  return new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: contractsAddresses['giftTokenRepo'],
      value,
      creationHeight: 7,
      additionalRegisters: {
        R4: SColl(SInt, [1]).toHex(),
        R5: SColl(SInt, [2]).toHex(),
        R6: SColl(SInt, [3]).toHex(),
        R7: SColl(SInt, [GIFT_TOKEN_COUNT, winnersCount, Number(FEE)]).toHex(),
        R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
        R9: SInt(step).toHex(),
      },
      assets:
        giftAssetTokenCount > 0
          ? [
              {
                tokenId: giftTokenId,
                amount: giftAssetTokenCount,
              },
            ]
          : [],
    }),
  );
};

/**
 * Create and return gift token repo output box
 * @param winnersCount
 * @param tokenInsertionType
 * @param step
 * @param value
 * @param giftAssetTokenCount
 * @param ticketId
 * @param giftTokenId
 * @param giftTokenCount
 * @returns
 */
export const createGiftTokenRepoOutputBox = (
  winnersCount: bigint,
  tokenInsertionType: null | 'mint' | 'add' = 'mint',
  step: number = 1,
  value = FEE * BigInt(winnersCount),
  giftAssetTokenCount = BigInt(GIFT_TOKEN_COUNT) * BigInt(winnersCount),
  ticketId: string = TICKET_TOKEN_ID,
  giftTokenId: string = GIFT_TOKEN_ID,
  giftTokenCount = GIFT_TOKEN_COUNT,
) => {
  const giftBox = new OutputBuilder(
    value,
    contractsAddresses['giftTokenRepo'],
  ).setAdditionalRegisters({
    R4: SColl(SInt, [1]).toHex(),
    R5: SColl(SInt, [2]).toHex(),
    R6: SColl(SInt, [3]).toHex(),
    R7: SColl(SInt, [
      giftTokenCount,
      Number(winnersCount),
      Number(FEE),
    ]).toHex(),
    R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
    R9: SInt(step).toHex(),
  });
  if (tokenInsertionType === 'mint')
    giftBox.mintToken({
      amount: BigInt(GIFT_TOKEN_COUNT) * BigInt(winnersCount),
      name: 'RaffleGiftToken',
      decimals: 0,
    });
  if (tokenInsertionType === 'add')
    giftBox.assets.add({
      amount: giftAssetTokenCount,
      tokenId: giftTokenId,
    });

  return giftBox;
};

/**
 * create winners output boxes
 * @param winnersCount
 * @param giftTokenId
 * @param ticketTokenId
 * @param ticketTokenAmount
 * @param giftCount
 * @param deadline
 * @param ergoTree
 * @returns
 */
export const createWinnersBoxMock = (
  winnersCount: bigint = 1n,
  giftTokenId: string = GIFT_TOKEN_ID,
  ticketTokenId: string = TICKET_TOKEN_ID,
  ticketTokenAmount: bigint = 1n,
  giftCount: bigint = 0n,
  deadline: bigint = 100n,
  ergoTree: string = contractsAddresses['winner'],
): Box[] => {
  const winnersBoxes = [];
  for (let i = 0; i < winnersCount; i++)
    winnersBoxes.push(
      mockUTxO({
        value: 3n * FEE,
        ergoTree: ergoTree,
        additionalRegisters: {
          R4: SColl(SLong, [
            BigInt(i + 1),
            1000n / winnersCount,
            deadline,
            FEE,
          ]).toHex(),
          R5: SLong(giftCount).toHex(),
          R6: SColl(SByte, Array.from(Buffer.from(giftTokenId, 'hex'))).toHex(),
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
 * @param giftTokenId
 * @param ticketTokenId
 * @param ticketTokenAmount
 * @param deadline
 * @returns
 */
export const createWinnersOutputBox = (
  winnersCount: bigint = 1n,
  giftTokenId: string,
  ticketTokenId: string = TICKET_TOKEN_ID,
  ticketTokenAmount: bigint = 1n,
  deadline = 100n,
) => {
  const itemsCount = winnersCount || 1;
  const winnersBoxes = [];
  for (let i = 0; i < itemsCount; i++) {
    winnersBoxes.push(
      createWinnerOutputBox(
        winnersCount,
        i + 1,
        giftTokenId,
        ticketTokenId,
        ticketTokenAmount,
        deadline,
      ),
    );
  }

  return winnersBoxes;
};

/**
 * Create gift output box
 * @param winnerIndex
 * @param giftTokenId
 * @param giftGiverWalletAddress
 * @param value
 * @param giftToken
 * @returns
 */
export const createGiftOutputBox = (
  winnerIndex: bigint,
  giftTokenId: string,
  giftGiverWalletAddress: string,
  value: bigint = 0n,
  giftToken?: TokenAmount<bigint>,
) => {
  const giftForWinnerOutputBox = new OutputBuilder(
    value,
    contractsAddresses['gift'],
  )
    .setAdditionalRegisters({
      R4: SColl(SByte, Array.from(Buffer.from(giftGiverWalletAddress))),
      R5: SLong(winnerIndex),
    })
    .addTokens({
      tokenId: giftTokenId,
      amount: 1n,
    });
  if (giftToken !== undefined) {
    giftForWinnerOutputBox.assets.add(giftToken);
  }
  return giftForWinnerOutputBox;
};

/**
 * Create ticket box
 * @param donatorWalletAddress
 * @param ticketCount
 * @param ticketTokenId
 * @param r5
 * @returns
 */
export const createTicketOutputBox = (
  donatorWalletAddress: string,
  ticketCount: bigint,
  ticketTokenId: string,
  r5: bigint[],
) => {
  const donateTicketOutputBox = new OutputBuilder(
    FEE * 2n,
    contractsAddresses['ticket'],
  );
  donateTicketOutputBox
    .setAdditionalRegisters({
      R4: SColl(SByte, Array.from(Buffer.from(donatorWalletAddress))),
      R5: SColl(SLong, r5).toHex(),
    })
    .addTokens({ tokenId: ticketTokenId, amount: ticketCount });
  return donateTicketOutputBox;
};

/**
 * Create gift redeem box
 * @param value
 * @param totalSoldTicket
 * @param ticketPrice
 * @param winnersCount
 * @param step
 * @param ticketTokenId
 * @param ticketTokenCount
 * @param collectingToken
 * @returns
 */
export const createGiftRedeemOutputBox = (
  value: bigint,
  totalSoldTicket: bigint,
  ticketPrice: bigint,
  winnersCount: bigint,
  step: bigint,
  ticketTokenId: string,
  ticketTokenCount: bigint,
  collectingToken?: TokenAmount<bigint>,
) => {
  const giftRedeemOutputBox = new OutputBuilder(
    value,
    contractsAddresses['giftRedeem'],
  );
  giftRedeemOutputBox.setAdditionalRegisters({
    R4: SColl(
      SLong,
      Array.from([totalSoldTicket, ticketPrice, winnersCount, FEE]),
    ),
    R5: SLong(step),
  });
  giftRedeemOutputBox.addTokens([
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: ticketTokenId,
      amount: ticketTokenCount,
    },
  ]);

  if (collectingToken !== undefined)
    giftRedeemOutputBox.addTokens([collectingToken]);

  return giftRedeemOutputBox;
};

/**
 * Create ticket redeem box
 * @param value
 * @param totalSoldTicket
 * @param ticketPrice
 * @param redeemedTickets
 * @param ticketTokenId
 * @param ticketTokenCount
 * @param collectingToken
 * @returns
 */
export const createTicketRedeemOutputBox = (
  value: bigint,
  totalSoldTicket: bigint,
  ticketPrice: bigint,
  redeemedTickets: bigint,
  ticketTokenId: string,
  ticketTokenCount: bigint,
  collectingToken?: TokenAmount<bigint>,
) => {
  const ticketRedeemOutputBox = new OutputBuilder(
    value,
    contractsAddresses['ticketRedeem'],
  );
  ticketRedeemOutputBox.setAdditionalRegisters({
    R4: SColl(SLong, Array.from([totalSoldTicket, ticketPrice, FEE])),
    R5: SLong(redeemedTickets).toHex(),
  });
  ticketRedeemOutputBox.addTokens([
    {
      tokenId: LICENSE_TOKEN_ID,
      amount: 1n,
    },
    {
      tokenId: ticketTokenId,
      amount: ticketTokenCount,
    },
  ]);

  if (collectingToken !== undefined)
    ticketRedeemOutputBox.assets.add(collectingToken);

  return ticketRedeemOutputBox;
};

/**
 * create single winner output box
 * @param r4
 * @param ticketTokenId
 * @param giftTokenId
 * @param giftTokenCount
 * @param giftCount
 */
export const createWinnerOutputBoxWithConstantRegisters = (
  r4: bigint[],
  ticketTokenId: string = TICKET_TOKEN_ID,
  giftTokenId: string = GIFT_TOKEN_ID,
  giftTokenCount = BigInt(GIFT_TOKEN_COUNT),
  giftCount = 0n,
) => {
  const winnerBox = new OutputBuilder(3n * FEE, contractsAddresses['winner'])
    .setAdditionalRegisters({
      R4: SColl(SLong, r4),
      R5: SLong(giftCount),
      R6: SColl(SByte, Array.from(Buffer.from(giftTokenId, 'hex'))),
    })
    .addTokens({
      tokenId: ticketTokenId,
      amount: 1n,
    });
  if (giftTokenCount)
    winnerBox.addTokens({ tokenId: giftTokenId, amount: giftTokenCount });
  return winnerBox;
};

/**
 * create single winner output box
 * @param winnersCount
 * @param step
 * @param giftTokenId
 * @param ticketTokenId
 * @param ticketTokenAmount
 * @param deadline
 * @param giftCount
 */
export const createWinnerOutputBox = (
  winnersCount: bigint = 1n,
  step: number = 1,
  giftTokenId: string = GIFT_TOKEN_ID,
  ticketTokenId: string = TICKET_TOKEN_ID,
  ticketTokenAmount: bigint = 1n,
  deadline = 100n,
  giftCount = 0n,
) => {
  return new OutputBuilder(3n * FEE, contractsAddresses['winner'])
    .setAdditionalRegisters({
      R4: SColl(SLong, [BigInt(step), 1000n / winnersCount, deadline, FEE]),
      R5: SLong(giftCount),
      R6: SColl(SByte, Array.from(Buffer.from(giftTokenId, 'hex'))),
    })
    .addTokens({
      tokenId: ticketTokenId,
      amount: ticketTokenAmount,
    });
};

export const createUserOutputBox = (
  value: bigint,
  tokens: TokenAmount<Amount>[],
  address: string,
) => {
  const userOutputBox = new OutputBuilder(
    value,
    ErgoAddress.fromBase58(address),
  );
  if (tokens.length > 0) userOutputBox.addTokens(tokens);
  return userOutputBox;
};

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
  #tip: BlockState;
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

  /**
   * Set mocked chain tip height to the specified height
   * @param height
   */
  setTip = (height: number) => {
    const state = ensureDefaults(undefined, {
      height: height,
      timestamp: new Date().getTime(),
      parameters: ensureDefaults(undefined, BLOCKCHAIN_PARAMETERS),
    });
    this.#tip = state;
    this.jumpTo(height);
  };

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

  /**
   * Sign the transaction and return the signing result and the transaction outputs
   * @param unsignedTransaction
   * @param options
   * @param baseCost
   * @returns
   */
  executeAndReturnOutputs = (
    unsignedTransaction: ErgoUnsignedTransaction,
    options?: TransactionExecutionOptions,
    baseCost?: number,
  ): executeAndReturnOutputsResult => {
    const keys = (options?.signers || this.#parties)
      .filter((p): p is KeyedMockChainParty => p instanceof KeyedMockChainParty)
      .map((p) => p.key);

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
