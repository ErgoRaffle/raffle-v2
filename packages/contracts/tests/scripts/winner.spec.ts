import * as fs from 'fs';
import * as path from 'node:path';

import { it, describe, expect } from 'vitest';
import { compile } from '@fleet-sdk/compiler';
import { SConstant } from '@fleet-sdk/serializer';
import { TokenAmount, TransactionBuilder, Box } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../testUtils';
import {
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile and override contracts
 *   - create giftTokenRepo input box
 *   - create activeRaffleBox input box
 *   - create winnerBoxes input box
 *   - create successRaffleBox input box
 * @returns vitest customized "it" object
 */
const createWinnerTest = (
  winnersCount: number = 1,
  collectingToken?: TokenAmount<bigint>,
) => {
  // prepare required scripts values
  const GIFT_SCRIPT_HASH_HEX = compile('{sigmaProp(SELF.value >= 0);}').toHex();
  const WINNER_PRIZE_SCRIPT_HASH_HEX = compile(
    '{sigmaProp(SELF.value >= 1);}',
  ).toHex();
  const SUCCESS_RAFFLE_SCRIPT_HASH_HEX = compile(
    '{sigmaProp(SELF.value >= 2);}',
  ).toHex();
  const GIFT_REDEEM_SCRIPT_HASH_HEX = compile(
    '{sigmaProp(SELF.value >= 3);}',
  ).toHex();
  const GIFT_TOKEN_REPO_HASH_HEX = compile(
    '{sigmaProp(SELF.value >= 4);}',
  ).toHex();
  const GIFT_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(GIFT_SCRIPT_HASH_HEX),
  ).toString('base64');
  const WINNER_PRIZE_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(WINNER_PRIZE_SCRIPT_HASH_HEX),
  ).toString('base64');
  const SUCCESS_RAFFLE_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(SUCCESS_RAFFLE_SCRIPT_HASH_HEX),
  ).toString('base64');
  const GIFT_REDEEM_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(GIFT_REDEEM_SCRIPT_HASH_HEX),
  ).toString('base64');

  let winnerScript = fs.readFileSync(
    path.join(constants.SCRIPT_DIR, `winner.es`),
    'utf8',
  );
  winnerScript = winnerScript.replace(
    'GIFT_SCRIPT_HASH_B64',
    GIFT_SCRIPT_HASH_B64,
  );
  winnerScript = winnerScript.replace(
    'WINNER_PRIZE_SCRIPT_HASH_B64',
    WINNER_PRIZE_SCRIPT_HASH_B64,
  );
  winnerScript = winnerScript.replace(
    'SUCCESS_RAFFLE_SCRIPT_HASH_B64',
    SUCCESS_RAFFLE_SCRIPT_HASH_B64,
  );
  winnerScript = winnerScript.replace(
    'GIFT_REDEEM_SCRIPT_HASH_B64',
    GIFT_REDEEM_SCRIPT_HASH_B64,
  );
  winnerScript = winnerScript.replace(
    'RAFFLE_LICENSE_B64',
    Buffer.from(testUtils.LICENSE_TOKEN_ID, 'hex').toString('base64'),
  );
  const WINNER_SCRIPT_HASH_HEX = compile(winnerScript).toHex();

  // preparing mocked chain and other required things
  const chain = new testUtils.RaffleMockChain({ height: 1000 });
  const { creator, someone } = testUtils.createPartners(chain, {
    Creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000_000_000n }],
  });

  const activeRaffleBox = testUtils.createActiveRaffleBoxMock(
    creator.address.toString(),
    creator.address.toString(),
    BigInt(winnersCount),
    undefined,
    collectingToken,
    undefined,
    undefined,
    undefined,
    undefined,
    constants.TRUE_SCRIPT_HEX,
  );

  const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
    winnersCount,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    GIFT_TOKEN_REPO_HASH_HEX,
  );

  const winnerBoxes = testUtils.createWinnersBoxMock(
    BigInt(winnersCount),
    testUtils.TICKET_TOKEN_ID,
    undefined,
    1n,
    1000n,
    testUtils.GIFT_TOKEN_ID,
    undefined,
    WINNER_SCRIPT_HASH_HEX,
  );

  const successRaffleBox = testUtils.createSuccessRaffleBoxMock(
    testUtils.CREATION_FEE + 4n * testUtils.FEE,
    testUtils.LICENSE_TOKEN_ID,
    '0123456789012345',
    '',
    60n,
    0n,
    0n,
    61n,
    testUtils.TICKET_TOKEN_ID,
    999_999_998n,
    undefined,
    SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
  );

  return it.extend({
    GIFT_SCRIPT_HASH_HEX: GIFT_SCRIPT_HASH_HEX,
    WINNER_PRIZE_SCRIPT_HASH_HEX: WINNER_PRIZE_SCRIPT_HASH_HEX,
    SUCCESS_RAFFLE_SCRIPT_HASH_HEX: SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
    GIFT_REDEEM_SCRIPT_HASH_HEX: GIFT_REDEEM_SCRIPT_HASH_HEX,
    WINNER_SCRIPT_HASH_HEX: WINNER_SCRIPT_HASH_HEX,
    GIFT_TOKEN_REPO_HASH_HEX: GIFT_TOKEN_REPO_HASH_HEX,

    chain: chain,
    someoneWallet: someone,
    creator: creator,
    activeRaffleBox: activeRaffleBox,
    giftTokenRepoBox: giftTokenRepoBox,
    winnerBoxes: winnerBoxes,
    successRaffleBox: successRaffleBox,
    contractsAddresses: testUtils.contractsAddresses,
  });
};

describe('winner', () => {
  const winnerTest = createWinnerTest(1);
  const tokenGoalWinnerTest = createWinnerTest(1, {
    tokenId: testUtils.X_TOKEN_ID,
    amount: 100n,
  });

  describe('Winner box gift token receipt', () => {
    /**
     * @target fail when move another token instead of real gift-token to the winner box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when move another token instead of real gift-token to the winner box',
      ({ chain, creator, winnerBoxes, GIFT_TOKEN_REPO_HASH_HEX }) => {
        // put invalid token to the winnerOutputBox
        const invalidTokenId = '1234'.repeat(16);
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          invalidTokenId,
          GIFT_TOKEN_REPO_HASH_HEX,
        );

        const winnerBox = (winnerBoxes as Box[])[0];

        const winnerOutputBox =
          testUtils.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            // Set invalid gift token id
            invalidTokenId,
            1n,
            0n,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([(winnerBoxes as Box[])[0], giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .burnTokens({
            tokenId: giftTokenRepoBox.assets[0].tokenId,
            amount: BigInt(giftTokenRepoBox.assets[0].amount) - 1n,
          })
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when incorrect count of gift-token write on the R6 of the input winner-box
     * @scenario
     * - create winner output box by invalid data about gift-token count
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect count of gift-token write on the R6 of the input winner-box',
      ({ WINNER_SCRIPT_HASH_HEX, chain, creator }) => {
        // put invalid count of gift-token to the input winners count
        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            undefined,
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerOutputBox =
          testUtils.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
            1n,
            // Set invalid gift count
            1n,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .burnTokens({
            tokenId: giftTokenRepoBox.assets[0].tokenId,
            amount: giftTokenRepoBox.assets[0].amount - 1n,
          })
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when incorrect deadline put in R4 of the input winner-box
     * @scenario
     * - create winner input box by incorrect deadline info
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect deadline put in R4 of the input winner-box',
      ({ WINNER_SCRIPT_HASH_HEX, chain, creator }) => {
        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            900n, // put invalid deadline to the input winners count
            testUtils.GIFT_TOKEN_ID,
            undefined,
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        winnerR4[2] = 10n;
        const winnerOutputBox =
          testUtils.createWinnerOutputBoxWithConstantRegisters(
            // Set invalid deadline time
            winnerR4,
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
            1n,
            3n,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .burnTokens({
            tokenId: giftTokenRepoBox.assets[0].tokenId,
            amount: giftTokenRepoBox.assets[0].amount - 1n,
          })
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when two same winner-boxes placed as inputs
     * @scenario
     * - create two winner input boxes
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two same winner-boxes placed as inputs',
      ({ WINNER_SCRIPT_HASH_HEX, chain, creator }) => {
        // put invalid count of gift-token to the input winners count
        const inputWinnerBoxes = testUtils.createWinnersBoxMock(
          2n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          3n,
          1000n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
          WINNER_SCRIPT_HASH_HEX,
        ) as Box[];
        const winnerBox1 = inputWinnerBoxes[0];
        const winnerBox2 = inputWinnerBoxes[1];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerOutputBox =
          testUtils.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox1.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
            1n,
            3n,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox1, giftTokenRepoBox, winnerBox2])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .burnTokens([
            {
              tokenId: giftTokenRepoBox.assets[0].tokenId,
              amount: giftTokenRepoBox.assets[0].amount - 1n,
            },
            winnerBox2.assets[0],
          ])
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );
  });

  describe('New gift creation', () => {
    /**
     * @target fail when two gift-tokens move to the output gift box
     * @scenario
     * - create winner output box by incorrect number of gift-tokens
     * - create output giftBox by two gift-tokens inside it
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two gift-tokens move to the output gift box',
      ({
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        chain.setTip(200);

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        // put extra gift-token to the winnerOutputBox
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          97n,
          3n,
        );

        const gift = testUtils.createGiftOutputBox(
          winnerR4[0],
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
          2n,
          GIFT_SCRIPT_HASH_HEX,
        );
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, ...someoneWallet.utxos.toArray()])
          .to([outWinner, gift])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [someoneWallet] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when value of input and output winner boxes is different
     * @scenario
     * - create winner output box by incorrect value
     * - create giftBox
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when value of input and output winner boxes is different',
      ({ WINNER_SCRIPT_HASH_HEX, chain, someoneWallet }) => {
        chain.setTip(200);

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          1n,
          3n,
          // decrease value of output winner-box
          BigInt(winnerBox.value) - testUtils.FEE,
        );
        const gift = testUtils.createGiftOutputBox(
          winnerR4[0],
          someoneWallet.address.toString(),
          // increase value of output gift-box
          testUtils.FEE * 11n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, ...someoneWallet.utxos.toArray()])
          .to([outWinner, gift])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [someoneWallet] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when winner-index on the register of gift box is incorrect
     * @scenario
     * - create winner output box
     * - create giftBox by invalid winner-index
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when winner-index on the register of gift box is incorrect',
      ({ WINNER_SCRIPT_HASH_HEX, chain, someoneWallet }) => {
        chain.setTip(200);

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          1n,
        );
        const gift = testUtils.createGiftOutputBox(
          // put incorrect index on the gift box
          winnerR4[0] + 1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, ...someoneWallet.utxos.toArray()])
          .to([outWinner, gift])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [someoneWallet] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when amount of erg on the gift box is not enough
     * @scenario
     * - create winner output box
     * - create giftBox by incorrect amount of erg value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'fail when amount of erg on the gift box is not enough',
      ({ WINNER_SCRIPT_HASH_HEX, chain, someoneWallet }) => {
        chain.setTip(200);

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          2n,
        );
        const gift = testUtils.createGiftOutputBox(
          winnerR4[0],
          someoneWallet.address.toString(),
          // sets lower erg amount than is required
          testUtils.FEE * 1n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, ...someoneWallet.utxos.toArray()])
          .to([outWinner, gift])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [someoneWallet] }),
        ).toThrowError();
      },
    );
  });

  describe('Winner prize creation', () => {
    /**
     * @target success erg-goal based winner-prize creation
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success erg-goal based winner-prize creation',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          0n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          undefined,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(chain.execute(transaction)).true;
      },
    );

    /**
     * @target success token-goal based winner-prize creation
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction must done successfully
     */
    tokenGoalWinnerTest(
      'should success token-goal based winner-prize creation',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
        chain,
      }) => {
        const totalPrize = 1;
        const successRaffleBox = testUtils.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          '0123456789012345',
          '',
          60n,
          0n,
          60n,
          61n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          '0'.repeat(64),
          SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
        );

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];

        prizeBoxTokens.push({
          tokenId: successRaffleBox.assets[2].tokenId,
          amount: prizeAmount,
        });

        successRaffleOutputBoxTokens.push({
          tokenId: successRaffleBox.assets[2]!.tokenId,
          amount:
            BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
        });
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n,
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          successRaffleBox.assets[2]!.tokenId,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(chain.execute(transaction)).true;
      },
    );

    /**
     * @target fail when incorrect value puts on the erg-goal prize box
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box by incorrect value
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect value puts on the erg-goal prize box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const incorrectPrizeAmount =
          (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n - 1n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(incorrectPrizeAmount),
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(incorrectPrizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          undefined,
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target fail when incorrect value puts on the token-goal prize box
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box by incorrect value
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    tokenGoalWinnerTest(
      'should fail when incorrect value puts on the token-goal prize box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const totalPrize = 1;
        const successRaffleBox = testUtils.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          '0123456789012345',
          '',
          60n,
          0n,
          60n,
          61n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          '0'.repeat(64),
          SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
        );

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount =
          (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n + 1n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];

        prizeBoxTokens.push({
          tokenId: successRaffleBox.assets[2].tokenId,
          amount: prizeAmount,
        });

        successRaffleOutputBoxTokens.push({
          tokenId: successRaffleBox.assets[2]!.tokenId,
          amount:
            BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
        });
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n,
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          successRaffleBox.assets[2]!.tokenId,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .sendChangeTo(someoneWallet.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target fail when the total assets aren't transferred from the winner's box to the prize box
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box by incorrect amount of gift assets
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      "should fails when the total assets aren't transferred from the winner's box to the prize box",
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          // Missing one token amount
          {
            tokenId: winnerBox.assets[1].tokenId,
            amount: BigInt(winnerBox.assets[1].amount) - 1n,
          },
        ];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          undefined,
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            tokenId: winnerBox.assets[1].tokenId,
            amount: 1n,
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => chain.execute(transaction, {})).toThrowError();
      },
    );

    /**
     * @target fail when an invalid winner box index is placed in the prize box
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box by invalid winner-index
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when an invalid winner box index is placed in the prize box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          0n, // put invalid winner-index
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          undefined,
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => chain.execute(transaction, {})).toThrowError();
      },
    );

    /**
     * @target fail when an invalid ticket token is placed in the successRaffle box
     * @scenario
     * - create winner input box
     * - create successRaffle input box
     * - create prize output box
     * - create successRaffle output box by invalid ticket token id
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when an invalid token is placed in the successRaffle box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          undefined,
          1n,
          testUtils.X_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox, ...someoneWallet.utxos])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens([
            {
              tokenId: successRaffleBox.assets[1].tokenId,
              amount: successRaffleBox.assets[1].amount,
            },
          ])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => chain.execute(transaction, {})).toThrowError();
      },
    );

    /**
     * @target fails when two duplicate winner boxes are used as input
     * @scenario
     * - create two winner input boxes
     * - create successRaffle input box
     * - create prize output box
     * - create successRaffle output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fails when two duplicate winner boxes are used as input',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const inputWinnerBoxes = testUtils.createWinnersBoxMock(
          2n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 100n,
            },
          ],
          WINNER_SCRIPT_HASH_HEX,
        ) as Box[];
        const winnerBox1 = inputWinnerBoxes[0];
        const winnerBox2 = inputWinnerBoxes[1];

        const winnerR4 = SConstant.from(winnerBox1.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n;
        const prizeBoxTokens = [winnerBox1.assets[0], winnerBox1.assets[1]];
        const prizeBox = testUtils.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          winnerR4[0],
          1n,
          1n,
          0n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
        );

        const successRaffleOutputBox = testUtils.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          testUtils.makeHashFromString([].toString()),
          1n,
          BigInt(totalPrize),
          undefined,
          1n,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox1, winnerBox2])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => chain.execute(transaction, {})).toThrowError();
      },
    );
  });

  describe('Gift redeem (for failed raffle)', () => {
    /**
     * @target success execution of return gift erg-goal transaction
     * @scenario
     * - create winner output box
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success execution of return gift erg-goal transaction',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(chain.execute(giftReturnTx)).true;
      },
    );

    /**
     * @target fail when the return gift erg-goal transaction uses an invalid ticket token in the giftRedeem box
     * @scenario
     * - create winner output box
     * - create redeemedGift output box by invalid ticket token
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when the return gift erg-goal transaction uses an invalid ticket token in the giftRedeem box',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          // Set invalid ticket token id
          testUtils.X_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail return gift erg-goal transaction by invalid number of gift token on the winner box
     * @scenario
     * - create winner output box by invalid number of gift token
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail return gift erg-goal transaction by invalid number of gift token on the winner box',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            // Set invalid giftToken
            5n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail erg-goal based return gift transaction without ticket token on the output winner box
     * @scenario
     * - create winner output box without ticket token
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal based return gift transaction without ticket token on the output winner box',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          undefined,
          // preventing to put giftToken to the output winner box
          0n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          [
            ...gift.assets.slice(1),
            // Add gift token to this box
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: BigInt(winner.assets[1].amount.toString()) + 1n,
            },
          ],
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail erg-goal return gift transaction by with invalid winner-index on the input gift box
     * @scenario
     * - create gift input box by invalid winner-index
     * - create winner output box
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal return gift transaction by with invalid winner-index on the input gift box',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift = testUtils.createGiftBoxMock(
          // set invalid winner-index to this box
          7n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail return gift erg-goal transaction by two gift boxes in the input
     * @scenario
     * - create gift input box by invalid winner-index
     * - create winner output box
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail return gift erg-goal transaction by two gift boxes in the input',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        GIFT_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const giftCount = 3n;

        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const gift1 = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        const gift2 = testUtils.createGiftBoxMock(
          1n,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
          GIFT_SCRIPT_HASH_HEX,
        );

        // Create output boxes
        const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = testUtils.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift1.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = testUtils.createCustomOutputBox(
          BigInt(gift1.value.toString()) + gift2.value - testUtils.FEE,
          [...gift1.assets.slice(1), ...gift2.assets],
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([winner, gift1, gift2])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );
  });

  describe('Winner box removal (for failed raffle)', () => {
    /**
     * @target success erg-goal winner removal transaction
     * @scenario
     * - create winner input box
     * - create giftRedeem input box
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be success
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success erg-goal winner removal transaction',
      ({ GIFT_REDEEM_SCRIPT_HASH_HEX, WINNER_SCRIPT_HASH_HEX, chain }) => {
        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            0n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const redeemedGift = testUtils.createGiftRedeemBoxMock(
          testUtils.FEE,
          0n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        // create output boxes
        const redeemedGiftOutputBox = testUtils.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(chain.execute(giftReturnTx)).true;
      },
    );

    /**
     * @target fail erg-goal based winner removal transaction by redeemGift box of another raffle
     * @scenario
     * - create winner input box
     * - create giftRedeem input box by invalid ticket token id
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal based winner removal transaction by redeemGift box of another raffle',
      ({ GIFT_REDEEM_SCRIPT_HASH_HEX, WINNER_SCRIPT_HASH_HEX, chain }) => {
        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const redeemGift = testUtils.createGiftRedeemBoxMock(
          testUtils.FEE,
          0n,
          1_000n,
          1n,
          1n,
          // set different ticket token id
          testUtils.X_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        // create output boxes
        const redeemGiftOutputBox = testUtils.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1n,
          1n,
          testUtils.X_TOKEN_ID,
          1n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([redeemGift, winner])
          .to([redeemGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail erg-goal based winner removal when gift-count is greater than zero
     * @scenario
     * - create winner input box by gift-count greater than zero
     * - create giftRedeem input box
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal based winner removal when gift-count is greater than zero',
      ({ GIFT_REDEEM_SCRIPT_HASH_HEX, WINNER_SCRIPT_HASH_HEX, chain }) => {
        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            // set gift count greater than zero
            2n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const redeemedGift = testUtils.createGiftRedeemBoxMock(
          testUtils.FEE,
          0n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        // create output boxes
        const redeemedGiftOutputBox = testUtils.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail erg-goal based winner removal when some gift-tokens move to another box
     * @scenario
     * - create winner input box
     * - create giftRedeem input box
     * - create giftRedeem output box
     * - create extraOutput box that contains some gift-tokens
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal based winner removal when some gift-tokens move to another box',
      ({
        GIFT_REDEEM_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        // Create input boxes
        const winner = (
          testUtils.createWinnersBoxMock(
            1n,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            0n,
            0n,
            testUtils.GIFT_TOKEN_ID,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
            WINNER_SCRIPT_HASH_HEX,
          ) as Box[]
        )[0];
        const redeemedGift = testUtils.createGiftRedeemBoxMock(
          testUtils.FEE,
          0n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
          GIFT_REDEEM_SCRIPT_HASH_HEX,
        );

        // create output boxes
        const redeemedGiftOutputBox = testUtils.createGiftRedeemOutputBox(
          BigInt(winner.value) - testUtils.FEE,
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );
        const extraOutputBox = testUtils.createCustomOutputBox(
          testUtils.FEE,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1n,
            },
          ],
          someoneWallet.address.toString(),
        );

        const giftReturnTx = new TransactionBuilder(chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox, extraOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(giftReturnTx)).toThrowError();
      },
    );
  });
});
