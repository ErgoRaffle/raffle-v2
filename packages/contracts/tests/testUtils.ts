import {
  SAFE_MIN_BOX_VALUE,
  Box,
  Amount,
  ErgoUnsignedInput,
  OutputBuilder,
  TokenAmount,
  AdditionalRegistersInput,
  ErgoTree,
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
import {
  SColl,
  SByte,
  SLong,
  SInt,
  SConstant,
  decode,
} from '@fleet-sdk/serializer';
import { blake2b256, bigintBE, hex, utf8 } from '@fleet-sdk/crypto';
import type { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import type { ErgoHDKey } from '@fleet-sdk/wallet';
import { ProverBuilder$ } from 'sigmastate-js/main';
import * as constants from '../constants';
import { ContextVarsType, ScriptNamesType } from '../lib/types';

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
 * Compile all contracts and return
 * @returns all of contracts
 */
export const initialContracts = (
  trueScripts: ScriptNamesType[] = [],
): { [key: string]: string } => {
  const scriptsVars = { ...constants.defaultScriptsVariables };
  const defaultLicenseTokenId = Buffer.from(LICENSE_TOKEN_ID, 'hex').toString(
    'base64',
  );
  const defaultRaffleNftId = Buffer.from(RAFFLE_NFT_ID, 'hex').toString(
    'base64',
  );
  const defaultOracleTokenId = Buffer.from(ORACLE_NFT_ID, 'hex').toString(
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
    ORACLE_TOKEN_ID_B64: defaultOracleTokenId,
  };
  scriptsVars['successRaffle'] = {
    SERVICE_NFT_B64: defaultRaffleNftId,
  };
  scriptsVars['raffleDetails'] = {
    RAFFLE_LICENSE_B64: defaultLicenseTokenId,
  };
  return compileAll(
    new Map(Object.entries(scriptsVars)) as unknown as ContextVarsType,
    true,
    trueScripts,
  );
};

export class RaffleBoxFactory {
  chain: RaffleMockChain;
  trueScripts: ScriptNamesType[];
  contractsAddresses: { [key: string]: string };

  constructor(chain: RaffleMockChain, trueScripts: ScriptNamesType[] = []) {
    this.trueScripts = trueScripts;
    this.chain = chain;
    this.contractsAddresses = initialContracts(trueScripts);
  }

  /**
   * get an object by partner-name as keys and partner-balance as values
   * and return an object of partner-name as keys and partner-objects as values
   * @param partners
   * @returns partner objects
   */
  createPartners(partners: { [key: string]: bigint }) {
    const results: { [key: string]: KeyedMockChainParty } = {};
    for (const partner_ of Object.keys(partners)) {
      const partner = this.chain.newParty(partner_);
      partner.addBalance({ nanoergs: partners[partner_] });
      results[partner_.toLowerCase()] = partner;
    }
    return results;
  }

  /**
   * Create input Service-Box
   * @param ownerAddress
   * @param licenseTokenCount
   * @param serviceFeePercent
   * @param implementerFeePercent
   * @param creationFee
   * @returns Service Box
   */
  createServiceBoxMock(
    ownerAddress: string,
    licenseTokenCount: bigint = LICENSE_TOKEN_COUNT,
    serviceFeePercent: bigint = 10n,
    implementerFeePercent: bigint = 10n,
    creationFee = CREATION_FEE,
  ) {
    return new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: this.contractsAddresses['service'],
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
  }

  /**
   * create output Service-Box
   * @param ownerAddress
   * @param licenseTokenCount
   * @param serviceFeePercent
   * @param implementerFeePercent
   * @param creationFee
   * @returns ServiceBox
   */
  createServiceOutputBox(
    ownerAddress: string,
    licenseTokenCount: bigint = 999999999n,
    serviceFeePercent: bigint = 10n,
    implementerFeePercent: bigint = 10n,
    creationFee = CREATION_FEE,
  ) {
    return new OutputBuilder(15_000_000n, this.contractsAddresses['service'])
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
  }

  /**
   * create TicketRepo UTxO
   * @returns ErgoUnsignedInput
   */
  createTicketRepoBoxMock() {
    return new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: this.contractsAddresses['ticketRepo'],
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
  }

  /**
   * create output Ticket-Box
   * @returns TicketBox
   */
  createTicketRepoOutputBox() {
    return new OutputBuilder(
      FEE,
      this.contractsAddresses['ticketRepo'],
    ).mintToken({
      amount: 1_000_000_000n,
      name: 'TicketRepoToken',
      decimals: 0,
    });
  }

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
   * @returns InactiveRaffleBox
   */
  createInactiveRaffleBoxMock(
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
  ) {
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
        value: 5n * FEE + 4n * FEE * winnersCount + creationFee,
        ergoTree: this.contractsAddresses['inactiveRaffle'],
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
  }

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
   * @param ticketPrice
   * @returns InactiveRaffleBox
   */
  createInactiveRaffleOutputBox(
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
    ticketPrice: bigint = 10n,
  ) {
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
      5n * FEE + 4n * FEE * winnersCount + creationFee,
      this.contractsAddresses['inactiveRaffle'],
    )
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          60n, // CharityPercentage,
          serviceFeePercent, // ServiceFeePercent,
          10n, // ImplementerFeePercent,
          ticketPrice, // TicketPrice,
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
  }

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
   * @returns
   */
  createActiveRaffleBoxMock(
    creatorPartnerAddress: string,
    implementerPartnerAddress: string,
    winnersCount: bigint = 1n,
    serviceFeePercent: bigint = 10n,
    collectingToken?: TokenAmount<bigint>,
    creationFee: bigint = CREATION_FEE,
    value?: bigint,
    deadline: bigint = 100n,
    totalSoldTicket: bigint = 0n,
  ) {
    value = value || creationFee + 4n * FEE;

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
      ergoTree: this.contractsAddresses['activeRaffle'],
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
        R6: SLong(totalSoldTicket).toHex(),
      },
    });
  }

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
  createActiveRaffleWithConstantRegisters(
    r4: bigint[],
    r5: Uint8Array[],
    value: bigint,
    ticketTokenAmount: bigint,
    ticketTokenId: string = TICKET_TOKEN_ID,
    totalSoldTicket: bigint = 0n,
    collectingToken?: TokenAmount<bigint>,
  ) {
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

    return new OutputBuilder(value, this.contractsAddresses['activeRaffle'])
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, r4).toHex(),
        R5: SColl(
          SColl(SByte),
          r5.map((value) => Array.from(value)),
        ),
        R6: SLong(totalSoldTicket).toHex(),
      });
  }

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
  createActiveRaffleOutputBox(
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
  ) {
    value = value || creationFee + 4n * FEE;

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

    return new OutputBuilder(value, this.contractsAddresses['activeRaffle'])
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
        R6: SLong(totalSoldTicket).toHex(),
      });
  }

  /**
   * Create and return success-raffle input box
   * @param boxValue
   * @param licenseTokenId
   * @param seed
   * @param selectedWinnersListHash
   * @param winnersCount
   * @param totalPrize
   * @param prizeValue
   * @param step
   * @param ticketTokenId
   * @param ticketTokenAmount
   * @param collectingTokenId
   * @returns
   */
  createSuccessRaffleBoxMock(
    boxValue: bigint,
    licenseTokenId: string,
    seed: string,
    selectedWinnersListHash: string,
    winnersCount: bigint = 1n,
    totalPrize: bigint = 1n,
    prizeValue: bigint = 0n,
    step: bigint = 0n,
    ticketTokenId: string = TICKET_TOKEN_ID,
    ticketTokenAmount: bigint = 1n,
    collectingTokenId?: string,
  ) {
    return mockUTxO({
      value: boxValue,
      ergoTree: this.contractsAddresses['successRaffle'],
      assets: [
        { tokenId: licenseTokenId, amount: 1n },
        {
          tokenId: ticketTokenId,
          amount: ticketTokenAmount,
        },
        ...(collectingTokenId !== undefined
          ? [
              {
                tokenId: collectingTokenId,
                // One extra collecting token added to this box
                amount: prizeValue,
              },
            ]
          : []),
      ],
      additionalRegisters: {
        R4: SColl(SLong, [
          BigInt(winnersCount),
          FEE,
          BigInt(totalPrize),
        ]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(seed)),
          Array.from(Buffer.from(selectedWinnersListHash)),
        ]).toHex(),
        R6: SLong(step).toHex(),
      },
    });
  }

  /**
   * Create and return success-raffle input box
   * @param boxValue
   * @param licenseTokenId
   * @param seed
   * @param selectedWinnersList
   * @param winnersCount
   * @param totalPrize
   * @param prizeValue
   * @param step
   * @param ticketTokenId
   * @param ticketTokenAmount
   * @param collectingTokenId
   * @param ergoTree
   * @returns
   */
  createSuccessRaffleBox = (
    boxValue: bigint,
    licenseTokenId: string,
    seed: string,
    selectedWinnersList: bigint[],
    totalSoldTickets: bigint,
    winnersCount: bigint = 1n,
    totalPrize: bigint = 1n,
    prizeValue: bigint = 0n,
    step: bigint = 1n,
    ticketTokenId: string = TICKET_TOKEN_ID,
    ticketTokenAmount: bigint = 1n,
    collectingTokenId?: string,
  ) => {
    return new OutputBuilder(boxValue, this.contractsAddresses['successRaffle'])
      .addTokens([
        { tokenId: licenseTokenId, amount: 1n },
        {
          tokenId: ticketTokenId,
          amount: ticketTokenAmount,
        },
        ...(collectingTokenId !== undefined
          ? [
              {
                tokenId: collectingTokenId,
                amount: prizeValue,
              },
            ]
          : []),
      ])
      .setAdditionalRegisters({
        R4: SColl(SLong, [winnersCount, totalPrize, totalSoldTickets]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(seed, 'hex')),
          Array.from(
            blake2b256(
              Buffer.concat(
                selectedWinnersList.map((n) => utils.bigIntToUint8Array(n)),
              ),
            ),
          ),
        ]).toHex(),
        R6: SLong(step),
      });
  };

  /**
   * Create output winnerPrize box
   * @param value
   * @param winnerIndex
   * @param ticketIndex
   * @param giftCount
   * @param unwrappedGiftCount
   * @param tokens
   * @returns
   */
  createWinnerPrizeOutputBox(
    value: bigint,
    winnerIndex: bigint,
    ticketIndex: bigint,
    giftCount: bigint,
    unwrappedGiftCount: bigint,
    tokens: TokenAmount<bigint>[] | TokenAmount<Amount>[],
  ) {
    return new OutputBuilder(value, this.contractsAddresses['winnerPrize'])
      .addTokens(tokens)
      .setAdditionalRegisters({
        R4: SColl(SLong, [
          BigInt(ticketIndex),
          winnerIndex,
          BigInt(giftCount),
          FEE,
        ]).toHex(),
        R5: SLong(unwrappedGiftCount),
      });
  }

  /**
   * Create mocked oracle-box
   * @param value
   * @param nftTokenId
   * @returns
   */
  createMockedOracleUTxO = (
    value: bigint,
    nftTokenId: string = ORACLE_NFT_ID,
    creationHeight: number = 2005,
  ) => {
    return new ErgoUnsignedInput(
      mockUTxO({
        value: value,
        ergoTree: constants.TRUE_SCRIPT_HEX,
        assets: [
          {
            tokenId: nftTokenId,
            amount: 1n,
          },
        ],
        creationHeight: creationHeight,
      }),
    );
  };

  /**
   * Create and return Raffle-details input box
   * @param ticketTokenId
   * @returns
   */
  createRaffleDetailsBoxMock(ticketTokenId: string = TICKET_TOKEN_ID) {
    return new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: this.contractsAddresses['raffleDetails'],
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
  }

  /**
   * Create raffle-details output box
   * @param ticketTokenId
   * @returns Output Box
   */
  createRaffleDetailsOutputBox(ticketTokenId: string = TICKET_TOKEN_ID) {
    return new OutputBuilder(FEE, this.contractsAddresses['raffleDetails'])
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
  }

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
  createGiftTokenRepoBoxMock(
    winnersCount: number,
    step: number = 1,
    value = FEE * BigInt(winnersCount),
    giftAssetTokenCount = BigInt(winnersCount * GIFT_TOKEN_COUNT),
    ticketId: string = TICKET_TOKEN_ID,
    giftTokenId = GIFT_TOKEN_ID,
  ) {
    return new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: this.contractsAddresses['giftTokenRepo'],
        value: value,
        creationHeight: 7,
        additionalRegisters: {
          R4: SColl(SInt, [1]).toHex(),
          R5: SColl(SInt, [2]).toHex(),
          R6: SColl(SInt, [3]).toHex(),
          R7: SColl(SInt, [
            GIFT_TOKEN_COUNT,
            winnersCount,
            Number(FEE),
          ]).toHex(),
          R8: SColl(SByte, Array.from(Buffer.from(ticketId, 'hex'))).toHex(),
          R9: SInt(step).toHex(),
        },
        assets: [
          ...(giftAssetTokenCount > 0
            ? [
                {
                  tokenId: giftTokenId,
                  amount: giftAssetTokenCount,
                },
              ]
            : []),
        ],
      }),
    );
  }

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
  createGiftTokenRepoOutputBox(
    winnersCount: bigint,
    tokenInsertionType: null | 'mint' | 'add' = 'mint',
    step: number = 1,
    value = FEE * BigInt(winnersCount),
    giftAssetTokenCount = BigInt(GIFT_TOKEN_COUNT) * BigInt(winnersCount),
    ticketId: string = TICKET_TOKEN_ID,
    giftTokenId: string = GIFT_TOKEN_ID,
    giftTokenCount = GIFT_TOKEN_COUNT,
  ) {
    const giftBox = new OutputBuilder(
      value,
      this.contractsAddresses['giftTokenRepo'],
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
  }

  /**
   * create winners output boxes
   * @param winnersCount
   * @param ticketTokenId
   * @param ticketTokenAmount
   * @param giftCount
   * @param deadline
   * @param giftTokenId
   * @param extraTokens
   * @returns
   */
  createWinnersBoxMock(
    winnersCount: bigint = 1n,
    ticketTokenId: string = TICKET_TOKEN_ID,
    ticketTokenAmount: bigint = 1n,
    giftCount: bigint = 0n,
    deadline: bigint = 100n,
    giftTokenId?: string,
    extraTokens?: TokenAmount<bigint>[],
  ): Box[] {
    const winnersBoxes: Box[] = [];
    for (let i = 0; i < winnersCount; i++)
      winnersBoxes.push(
        mockUTxO({
          value: 3n * FEE,
          ergoTree: this.contractsAddresses['winner'],
          additionalRegisters: {
            R4: SColl(SLong, [
              BigInt(i + 1),
              1000n / winnersCount,
              deadline,
              FEE,
            ]).toHex(),
            R5: SLong(giftCount).toHex(),
            R6:
              giftTokenId !== undefined
                ? SColl(
                    SByte,
                    Array.from(Buffer.from(giftTokenId, 'hex')),
                  ).toHex()
                : undefined,
          },
          assets: [
            {
              tokenId: ticketTokenId,
              amount: ticketTokenAmount,
            },
            ...(extraTokens || []),
          ],
        }),
      );

    return winnersBoxes;
  }

  /**
   * create winners output boxes
   * @param winnersCount
   * @param giftTokenId
   * @param ticketTokenId
   * @param ticketTokenAmount
   * @param deadline
   * @param giftCount
   * @param extraTokens
   * @returns
   */
  createWinnersOutputBox(
    winnersCount: bigint = 1n,
    giftTokenId: string,
    ticketTokenId: string = TICKET_TOKEN_ID,
    ticketTokenAmount: bigint = 1n,
    deadline = 100n,
    giftCount = 0n,
    extraTokens?: TokenAmount<bigint> | TokenAmount<Amount>,
  ) {
    const itemsCount = winnersCount || 1;
    const winnersBoxes = [];
    for (let i = 0; i < itemsCount; i++) {
      winnersBoxes.push(
        this.createWinnerOutputBox(
          winnersCount,
          i + 1,
          giftTokenId,
          ticketTokenId,
          ticketTokenAmount,
          deadline,
          giftCount,
          extraTokens,
        ),
      );
    }

    return winnersBoxes;
  }

  /**
   * Create gift output box
   * @param winnerIndex
   * @param giftGiverWalletAddress
   * @param value
   * @param giftToken
   * @returns
   */
  createGiftBoxMock(
    winnerIndex: bigint,
    giftGiverWalletAddress: string,
    value: bigint = 0n,
    giftToken?: TokenAmount<bigint>,
  ) {
    const giftForWinnerOutputBox = mockUTxO({
      value: value,
      ergoTree: this.contractsAddresses['gift'],
      additionalRegisters: {
        R4: SColl(
          SByte,
          Array.from(Buffer.from(giftGiverWalletAddress)),
        ).toHex(),
        R5: SLong(winnerIndex).toHex(),
      },
    });
    if (giftToken !== undefined) {
      giftForWinnerOutputBox.assets.push(giftToken);
    }
    return giftForWinnerOutputBox;
  }

  /**
   * Create gift input box
   * @param winnerIndex
   * @param giftGiverWalletAddress
   * @param value
   * @param giftTokenId
   * @param giftTokenAmount
   * @returns
   */
  createGiftOutputBox(
    winnerIndex: bigint,
    giftGiverWalletAddress: string,
    value: bigint = 0n,
    giftTokenId?: string,
    giftTokenAmount: bigint = 1n,
  ) {
    const giftForWinnerOutputBox = new OutputBuilder(
      value,
      this.contractsAddresses['gift'],
    ).setAdditionalRegisters({
      R4: SColl(SByte, Array.from(Buffer.from(giftGiverWalletAddress))),
      R5: SLong(winnerIndex),
    });
    if (giftTokenId !== undefined) {
      giftForWinnerOutputBox.assets.add({
        tokenId: giftTokenId,
        amount: giftTokenAmount,
      });
    }
    return giftForWinnerOutputBox;
  }

  /**
   * Create ticket box
   * @param donatorWalletAddress
   * @param ticketCount
   * @param ticketTokenId
   * @param r5
   * @returns
   */
  createTicketOutputBox(
    donatorWalletAddress: string,
    ticketCount: bigint,
    ticketTokenId: string,
    r5: bigint[],
  ) {
    const donateTicketOutputBox = new OutputBuilder(
      FEE * 2n,
      this.contractsAddresses['ticket'],
    );
    donateTicketOutputBox
      .setAdditionalRegisters({
        R4: SColl(SByte, Array.from(Buffer.from(donatorWalletAddress))),
        R5: SColl(SLong, r5).toHex(),
      })
      .addTokens({ tokenId: ticketTokenId, amount: ticketCount });
    return donateTicketOutputBox;
  }

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
  createGiftRedeemOutputBox(
    value: bigint,
    totalSoldTicket: bigint,
    ticketPrice: bigint,
    winnersCount: bigint,
    step: bigint,
    ticketTokenId: string,
    ticketTokenCount: bigint,
    collectingToken?: TokenAmount<bigint>,
  ) {
    const giftRedeemOutputBox = new OutputBuilder(
      value,
      this.contractsAddresses['giftRedeem'],
    );
    giftRedeemOutputBox.setAdditionalRegisters({
      R4: SColl(
        SLong,
        Array.from([totalSoldTicket, ticketPrice, winnersCount, FEE]),
      ),
      R5: SLong(step).toHex(),
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
  }

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
  createTicketRedeemOutputBox(
    value: bigint,
    totalSoldTicket: bigint,
    ticketPrice: bigint,
    redeemedTickets: bigint,
    ticketTokenId: string,
    ticketTokenCount: bigint,
    collectingToken?: TokenAmount<bigint>,
  ) {
    const ticketRedeemOutputBox = new OutputBuilder(
      value,
      this.contractsAddresses['ticketRedeem'],
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
  }

  /**
   * create single winner output box
   * @param r4
   * @param ticketTokenId
   * @param giftTokenId
   * @param giftTokenCount
   * @param giftCount
   */
  createWinnerOutputBoxWithConstantRegisters(
    r4: bigint[],
    ticketTokenId: string = TICKET_TOKEN_ID,
    giftTokenId: string = GIFT_TOKEN_ID,
    giftTokenCount = BigInt(GIFT_TOKEN_COUNT),
    giftCount = 0n,
  ) {
    const winnerBox = new OutputBuilder(
      3n * FEE,
      this.contractsAddresses['winner'],
    )
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
  }

  /**
   * create single winner output box
   * @param winnersCount
   * @param step
   * @param giftTokenId
   * @param ticketTokenId
   * @param ticketTokenAmount
   * @param deadline
   * @param giftCount
   * @param extraTokens
   */
  createWinnerOutputBox(
    winnersCount: bigint = 1n,
    step: number = 1,
    giftTokenId: string = GIFT_TOKEN_ID,
    ticketTokenId: string = TICKET_TOKEN_ID,
    ticketTokenAmount: bigint = 1n,
    deadline = 100n,
    giftCount = 0n,
    extraTokens?: TokenAmount<bigint> | TokenAmount<Amount>,
  ) {
    const winnerBox = new OutputBuilder(
      3n * FEE,
      this.contractsAddresses['winner'],
    )
      .setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(step), 1000n / winnersCount, deadline, FEE]),
        R5: SLong(giftCount),
        R6: SColl(SByte, Array.from(Buffer.from(giftTokenId, 'hex'))),
      })
      .addTokens({
        tokenId: ticketTokenId,
        amount: ticketTokenAmount,
      });
    if (extraTokens !== undefined) {
      winnerBox.assets.add(extraTokens);
    }

    return winnerBox;
  }

  /**
   * Create user output-box
   * @param value
   * @param tokens
   * @param address
   * @param additionalRegisters
   * @returns
   */
  createCustomOutputBox(
    value: bigint,
    tokens: TokenAmount<Amount>[],
    address: string | ErgoTree,
    additionalRegisters?: AdditionalRegistersInput,
  ) {
    const outputBox = new OutputBuilder(value, address);
    outputBox.setAdditionalRegisters(additionalRegisters!);
    if (tokens.length > 0) outputBox.addTokens(tokens);
    return outputBox;
  }
}

/**
 * Get content and print on the output pretty
 * @param content
 * @param prefix
 * @param briefErgoTree
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

/**
 *
 * @param winnerIndexList
 * @param step
 * @param seed
 * @param ticketsCount
 * @returns
 */
export const generateNextWinnerIndex = (
  winnerIndexList: bigint[],
  step: number,
  seed: Uint8Array,
  ticketCount: bigint,
) => {
  const bigintSeed = uint8ArrayToSignedBigInt(seed.slice(0, 16));
  const range = ticketCount - BigInt(step) + 1n;
  const rawWinnerIndex = ((bigintSeed % range) + range) % range;

  let shift = 0n,
    oldShift = 0n;
  do {
    oldShift = shift;
    shift = BigInt(
      winnerIndexList.filter((value) => {
        return value <= rawWinnerIndex + shift;
      }).length,
    );
  } while (oldShift !== shift);

  return rawWinnerIndex + shift;
};

/**
 * Convert uint8Array to signed bigint
 * @param buffer
 * @returns signed bigint
 */
const uint8ArrayToSignedBigInt = (buffer: Uint8Array): bigint => {
  const hexStr = Buffer.from(buffer).toString('hex');
  const bigIntValue = BigInt('0x' + hexStr);
  const bitLength = BigInt(hexStr.length * 4); // Each hex digit represents 4 bits
  const maxValue = BigInt(1) << bitLength; // 2^bitLength

  // Check if the number should be negative (if MSB is set)
  if (bigIntValue >= maxValue >> BigInt(1)) {
    return bigIntValue - maxValue;
  }

  return bigIntValue;
};

/**
 * Make hash of string
 * @param content
 * @returns
 */
export const makeHashFromString = (content: string) => {
  return SColl(
    SByte,
    Array.from(blake2b256(Buffer.from(content, 'hex'))),
  ).toHex();
};

/**
 * customized array class for holding ticket-boxes by special actions
 */
export class Tickets extends Array {
  public selectByWinnerIndex = (boxIndex: bigint) => {
    return this.filter((value, index) => {
      const ticketR5 = SConstant.from(this[index].additionalRegisters.R5!)
        .data as bigint[];
      return ticketR5[0] <= boxIndex && ticketR5[1] > boxIndex;
    })[0];
  };
}

/**
 * Special chain customized for raffle tests
 */
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
  setTip(height: number) {
    const state = ensureDefaults(undefined, {
      height: height,
      timestamp: new Date().getTime(),
      parameters: ensureDefaults(undefined, BLOCKCHAIN_PARAMETERS),
    });
    this.#tip = state;
    this.jumpTo(height);
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

  /**
   * Sign the transaction and return the signing result and the transaction outputs
   * @param unsignedTransaction
   * @param options
   * @param baseCost
   * @returns
   */
  executeAndReturnOutputs(
    unsignedTransaction: ErgoUnsignedTransaction,
    options?: TransactionExecutionOptions,
    baseCost?: number,
  ): executeAndReturnOutputsResult {
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
  }

  /**
   * set metadata of transaction
   * @param transaction
   */
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

/**
 * create changeBox using input and output boxes
 * @param inputs
 * @param outputs
 * @param fee
 * @param address
 */
const createChangeBox = (
  inputs: Array<OutputBox>,
  outputs: Array<OutputBuilder>,
  fee: bigint,
  address: string,
): OutputBuilder => {
  const tokens: Map<string, bigint> = new Map();
  let value: bigint = -fee;
  inputs.forEach((input) => {
    value += BigInt(input.value);
    input.assets.forEach((asset) => {
      const oldValue = tokens.get(asset.tokenId) ?? 0n;
      tokens.set(asset.tokenId, BigInt(asset.amount.toString()) + oldValue);
    });
  });
  outputs.forEach((output) => {
    value -= BigInt(output.value);
    output.assets.toArray().forEach((asset) => {
      const oldValue = tokens.get(asset.tokenId) ?? 0n;
      tokens.set(asset.tokenId, -BigInt(asset.amount.toString()) + oldValue);
    });
  });
  const outputBox = new OutputBuilder(value, address);
  for (const [tokenId, tokenAmount] of tokens.entries()) {
    if (tokenAmount > 0n) {
      outputBox.addTokens({ tokenId, amount: tokenAmount });
    }
  }
  return outputBox;
};

export { createChangeBox };
