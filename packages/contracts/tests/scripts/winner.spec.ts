import { it, describe, expect } from 'vitest';
import { SConstant } from '@fleet-sdk/serializer';
import { TransactionBuilder, Box } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../testUtils';
import {
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - create giftTokenRepo input box
 *   - create winnerBoxes input box
 *   - create successRaffleBox input box
 * @returns vitest customized "it" object
 */
const createWinnerTest = (winnersCount: number = 1) => {
  // preparing mocked chain and other required things
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'winner',
    ) as ScriptNamesType[],
  );
  const { creator, someone } = boxFactory.createPartners({
    Creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000_000_000n }],
  });

  const giftTokenRepoBox = boxFactory.createGiftTokenRepoBoxMock(winnersCount);

  const winnerBoxes = boxFactory.createWinnersBoxMock(
    winnersCount,
    testUtils.TICKET_TOKEN_ID,
    undefined,
    undefined,
    1000n,
    testUtils.GIFT_TOKEN_ID,
  );

  const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
    testUtils.CREATION_FEE + 4n * testUtils.FEE,
    testUtils.LICENSE_TOKEN_ID,
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
    '0123456789012345',
    [],
    0n,
    BigInt(winnersCount),
    60n,
    0n,
    0n,
    testUtils.TICKET_TOKEN_ID,
    60n,
  );

  boxFactory.chain.setTip(200);

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    giftTokenRepoBox: giftTokenRepoBox,
    winnerBoxes: winnerBoxes,
    successRaffleBox: successRaffleBox,
  });
};

describe('winner', () => {
  const winnerTest = createWinnerTest(1);

  describe('Winner box gift token receipt', () => {
    /**
     * @target success erg-goal based gift token receipt
     * @scenario
     * - create winner output box
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success erg-goal based gift token receipt',
      ({ boxFactory, creator, winnerBoxes, giftTokenRepoBox }) => {
        const winnerBox = (winnerBoxes as Box[])[0];

        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnerBoxes as Box[])[0], giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        const result = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });

        // Check execution result
        expect(result).true;
      },
    );

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
      ({ boxFactory, creator, winnerBoxes }) => {
        const invalidTokenId = '1234'.repeat(16);

        const winnerBox = (winnerBoxes as Box[])[0];
        const giftTokenRepoBox = boxFactory.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          invalidTokenId,
        );

        // put invalid token to the winnerOutputBox
        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            // Set invalid gift token id
            invalidTokenId,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnerBoxes as Box[])[0], giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        // Check execution result
        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when incorrect count of gift-token write on the R6 of the output winner-box
     * @scenario
     * - create winner output box
     * - create output boxes by invalid data about gift-token count
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect count of gift-token write on the R6 of the output winner-box',
      ({ boxFactory, creator, winnerBoxes, giftTokenRepoBox }) => {
        const winnerBox = (winnerBoxes as Box[])[0];

        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
            undefined,
            // Set invalid gift count
            1n,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        // Check execution result
        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when incorrect deadline put in R4 of the output winner-box
     * @scenario
     * - create winner input box
     * - create output boxes by incorrect deadline info
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect deadline put in R4 of the output winner-box',
      ({ boxFactory, creator, winnerBoxes, giftTokenRepoBox }) => {
        const winnerBox = (winnerBoxes as Box[])[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        winnerR4[2] = 10n;
        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            // Set invalid deadline time
            winnerR4,
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        // Check execution result
        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target fail when two same winner-boxes placed as inputs
     * @scenario
     * - create two winner input boxes
     * - create output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two same winner-boxes placed as inputs',
      ({ boxFactory, creator }) => {
        const giftTokenRepoBox = boxFactory.createGiftTokenRepoBoxMock(2);
        const inputWinnerBoxes = boxFactory.createWinnersBoxMock(
          2,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          undefined,
          1000n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
        );
        const winnerBox1 = inputWinnerBoxes[0];
        const winnerBox2 = inputWinnerBoxes[1];

        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox1.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            testUtils.GIFT_TOKEN_ID,
          );

        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox1, giftTokenRepoBox, winnerBox2])
          .to([winnerOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        // Check execution result
        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );
  });

  describe('New gift creation', () => {
    /**
     * @target success erg-goal based new gift creation
     * @scenario
     * - create winner output box
     * - create output giftBox
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success erg-goal based new gift creation',
      ({ boxFactory, someoneWallet }) => {
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            undefined,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
          ) as Box[]
        )[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          winnerR4,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          1n,
        );
        const gift = boxFactory.createGiftOutputBox(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, ...someoneWallet.utxos.toArray()])
          .to([outWinner, gift])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        const result = boxFactory.chain.execute(transaction, {
          signers: [someoneWallet],
        });

        // Check execution result
        expect(result).true;
      },
    );

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
      ({ boxFactory, someoneWallet }) => {
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];
        // put extra gift-token to the winnerOutputBox
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          98n,
          2n,
        );

        const gift = boxFactory.createGiftOutputBox(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
          2n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
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
          boxFactory.chain.execute(transaction, { signers: [someoneWallet] }),
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
      ({ boxFactory, someoneWallet }) => {
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            undefined,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
          ) as Box[]
        )[0];
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          1n,
          1,
          // decrease value of output winner-box
          BigInt(winnerBox.value) - testUtils.FEE,
        );
        const gift = boxFactory.createGiftOutputBox(
          1,
          someoneWallet.address.toString(),
          // increase value of output gift-box
          testUtils.FEE * 11n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
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
          boxFactory.chain.execute(transaction, { signers: [someoneWallet] }),
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
      ({ boxFactory, someoneWallet }) => {
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            undefined,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
          ) as Box[]
        )[0];
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          1n,
        );
        const gift = boxFactory.createGiftOutputBox(
          // put incorrect index on the gift box
          2,
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
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
          boxFactory.chain.execute(transaction, { signers: [someoneWallet] }),
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
      ({ boxFactory, someoneWallet }) => {
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            undefined,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 100n,
              },
            ],
          ) as Box[]
        )[0];
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          99n,
          1n,
        );
        const gift = boxFactory.createGiftOutputBox(
          1,
          someoneWallet.address.toString(),
          // sets lower erg amount than is required
          testUtils.FEE * 1n,
          testUtils.GIFT_TOKEN_ID,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
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
          boxFactory.chain.execute(transaction, { signers: [someoneWallet] }),
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
      ({ boxFactory, successRaffleBox, creator }) => {
        const totalPrize = 60;

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: BigInt(totalPrize),
              },
            ],
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          0n,
          1,
          testUtils.TICKET_TOKEN_ID,
          BigInt(successRaffleBox.assets[1].amount),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
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
    winnerTest(
      'should success token-goal based winner-prize creation',
      ({ boxFactory, creator }) => {
        const totalPrize = 60;
        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          '0123456789012345',
          [],
          0n,
          1n,
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          testUtils.X_TOKEN_ID,
        );

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
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
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
          2,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should successfully create the prize for a token-goal raffle when the prize amount is 0
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
      'should successfully create the prize for a token-goal raffle when the prize amount is 0',
      ({ boxFactory, creator }) => {
        const totalPrize = 0;
        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          '0123456789012345',
          [],
          0n,
          1n,
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          testUtils.X_TOKEN_ID,
        );

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = winnerBox.assets;

        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
          2,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target fail when incorrect prize amount puts on the erg-goal prize box
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
      'should fail when incorrect prize amount puts on the erg-goal prize box',
      ({ boxFactory, successRaffleBox, creator }) => {
        const totalPrize = 60;
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: BigInt(totalPrize),
              },
            ],
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const incorrectPrizeAmount =
          (BigInt(totalPrize) * BigInt(winnerR4[1])) / 1000n - 1n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(incorrectPrizeAmount),
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(incorrectPrizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          undefined,
          1,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target fail when incorrect prize amount puts on the token-goal prize box
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
      'should fail when incorrect prize amount puts on the token-goal prize box',
      ({ boxFactory, someoneWallet, creator }) => {
        const totalPrize = 60;
        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          '0123456789012345',
          [],
          0n,
          1n,
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          testUtils.X_TOKEN_ID,
        );

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
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
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount),
          1,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
          successRaffleBox.assets[2]!.tokenId,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .sendChangeTo(someoneWallet.address)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
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
      ({ boxFactory, successRaffleBox, creator }) => {
        const totalPrize = 60;

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: BigInt(totalPrize),
              },
            ],
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          // Missing one token amount
          {
            tokenId: winnerBox.assets[1].tokenId,
            amount: BigInt(winnerBox.assets[1].amount) - 1n,
          },
        ];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          undefined,
          1,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            // Missing one token amount
            tokenId: winnerBox.assets[1].tokenId,
            amount: 1n,
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => boxFactory.chain.execute(transaction, {})).toThrowError();
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
      ({ boxFactory, successRaffleBox, creator }) => {
        const totalPrize = 60;

        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            1n,
            10000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: BigInt(totalPrize),
              },
            ],
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          0, // put invalid winner-index
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          undefined,
          1,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => boxFactory.chain.execute(transaction, {})).toThrowError();
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
      ({ boxFactory, someoneWallet, successRaffleBox, creator }) => {
        const totalPrize = 60;
        const winnerBox = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = [winnerBox.assets[0], winnerBox.assets[1]];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          undefined,
          1,
          // Used X-token instead of ticket token
          testUtils.X_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox, ...someoneWallet.utxos])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => boxFactory.chain.execute(transaction, {})).toThrowError();
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
      ({ boxFactory, someoneWallet, successRaffleBox, creator }) => {
        const totalPrize = 60;
        const inputWinnerBoxes = boxFactory.createWinnersBoxMock(
          2,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: BigInt(totalPrize),
            },
          ],
        ) as Box[];
        const winnerBox1 = inputWinnerBoxes[0];
        const winnerBox2 = inputWinnerBoxes[1];

        const winnerR4 = SConstant.from(winnerBox1.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = (BigInt(totalPrize) * BigInt(winnerR4[0])) / 1000n;
        const prizeBoxTokens = [winnerBox1.assets[0], winnerBox1.assets[1]];
        const winnerTicketIndex = testUtils.generateNextWinnerIndex(
          [0n],
          1,
          (
            SConstant.from(successRaffleBox.additionalRegisters.R5!)
              .data as Uint8Array[]
          )[0],
          1n,
        );
        const prizeBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          0n,
          prizeBoxTokens,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          testUtils.LICENSE_TOKEN_ID,
          'test seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [winnerTicketIndex],
          0n,
          1,
          BigInt(totalPrize),
          undefined,
          1,
          testUtils.TICKET_TOKEN_ID,
          successRaffleBox.assets[1].amount,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox1, winnerBox2])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() => boxFactory.chain.execute(transaction, {})).toThrowError();
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
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        const giftCount = 3n;
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];
        const gift = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(giftReturnTx)).true;
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
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        const giftCount = 3n;
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const gift = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.X_TOKEN_ID,
          1n,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            2n,
            1000n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const gift = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          // set invalid amount of gift token to this box
          BigInt(winner.assets[1].amount.toString()),
          1n,
        );

        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 1n,
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
      },
    );

    /**
     * @target fail erg-goal based return gift transaction with incorrect amount of gift token on the output winner box
     * @scenario
     * - create winner output box without gift token
     * - create redeemedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail erg-goal based return gift transaction with incorrect amount of gift token on the output winner box',
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
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
          ) as Box[]
        )[0];
        const gift = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          // put incorrect amount of gift token to the R5
          0n,
        );
        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        const giftCount = 3n;
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            10,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const gift = boxFactory.createGiftBoxMock(
          // set invalid winner-index to this box
          7,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          10n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift.value.toString()) - testUtils.FEE,
          gift.assets.slice(1),
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory, someoneWallet }) => {
        boxFactory.chain.setTip(2001);
        const giftCount = 3n;
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            3n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const gift1 = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        const gift2 = boxFactory.createGiftBoxMock(
          1,
          someoneWallet.address.toString(),
          testUtils.FEE * 2n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        // Create output boxes
        const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winner.additionalRegisters.R4!).data as bigint[],
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          BigInt(winner.assets[1].amount.toString()) + 1n,
          giftCount - 1n,
        );
        const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
          1_000_000_000n,
          0n,
          testUtils.FEE * 2n,
          1n,
          0n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        const giftGiverAddress = Buffer.from(
          SConstant.from(gift1.additionalRegisters.R4!).data as Uint8Array,
        ).toString();
        const redeemedGift = boxFactory.createCustomOutputBox(
          BigInt(gift1.value.toString()) + gift2.value - testUtils.FEE,
          [...gift1.assets.slice(1), ...gift2.assets],
          giftGiverAddress,
        );
        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([winner, gift1, gift2])
          .to([outWinner, redeemedGift])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory }) => {
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            0n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 10n,
              },
            ],
          ) as Box[]
        )[0];
        const redeemedGift = boxFactory.createGiftRedeemBoxMock(
          testUtils.FEE,
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        // create output boxes
        const redeemedGiftOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1,
          2,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(giftReturnTx)).true;
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
      ({ boxFactory }) => {
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            0n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const redeemGift = boxFactory.createGiftRedeemBoxMock(
          testUtils.FEE,
          1n,
          1_000n,
          1n,
          1n,
          // set other raffle ticket token id
          testUtils.X_TOKEN_ID,
          1n,
          undefined,
        );

        // create output boxes
        const redeemGiftOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1,
          2,
          testUtils.X_TOKEN_ID,
          1n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([redeemGift, winner])
          .to([redeemGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets)
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory }) => {
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            // set gift count greater than zero
            2n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const redeemedGift = boxFactory.createGiftRedeemBoxMock(
          testUtils.FEE,
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        // create output boxes
        const redeemedGiftOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(winner.value),
          1n,
          1_000n,
          1,
          2,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );

        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(winner.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
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
      ({ boxFactory, someoneWallet }) => {
        // Create input boxes
        const winner = (
          boxFactory.createWinnersBoxMock(
            1,
            testUtils.TICKET_TOKEN_ID,
            undefined,
            0n,
            0n,
            undefined,
            [
              {
                tokenId: testUtils.GIFT_TOKEN_ID,
                amount: 1n,
              },
            ],
          ) as Box[]
        )[0];
        const redeemedGift = boxFactory.createGiftRedeemBoxMock(
          testUtils.FEE,
          1n,
          1_000n,
          1n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          1n,
          undefined,
        );

        // create output boxes
        const redeemedGiftOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(winner.value) - testUtils.FEE,
          1n,
          1_000n,
          1,
          2,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
        );
        const extraOutputBox = boxFactory.createCustomOutputBox(
          testUtils.FEE,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1n,
            },
          ],
          someoneWallet.address.toString(),
        );

        const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
          .from([redeemedGift, winner])
          .to([redeemedGiftOutputBox, extraOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(giftReturnTx)).toThrowError();
      },
    );
  });
});
