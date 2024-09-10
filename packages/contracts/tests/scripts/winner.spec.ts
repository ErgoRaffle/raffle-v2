import * as fs from 'fs';
import * as path from 'node:path';

import { it, describe, expect } from 'vitest';
import { compile } from '@fleet-sdk/compiler'
import { SColl, SLong, SByte, SConstant } from '@fleet-sdk/serializer';
import { MockChain } from '@fleet-sdk/mock-chain';
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
 *   - compile contracts
 *   - create giftTokenRepo input box
 *   - create activeRaffleBox input box
 *   - create giftTokenRepoBox input box
 *   - create successRaffleBox input box
 * @returns vitest customized "it" object
 */
function createWinnerTest(
  winnersCount: number = 1,
  giftsCount: number = 1,
  useXTokenForGift: boolean = false,
  collectingToken?: TokenAmount<bigint>,
) {
  // prepare required scripts values
  const GIFT_SCRIPT_HASH_HEX = compile('{sigmaProp(SELF.value >= 0);}').toHex();
  const WINNER_PRIZE_SCRIPT_HASH_HEX = compile('{sigmaProp(SELF.value >= 1);}').toHex();
  const SUCCESS_RAFFLE_SCRIPT_HASH_HEX = compile('{sigmaProp(SELF.value >= 2);}').toHex();
  const GIFT_REDEEM_SCRIPT_HASH_HEX = compile('{sigmaProp(SELF.value >= 3);}').toHex();
  const GIFT_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(GIFT_SCRIPT_HASH_HEX)
  ).toString('base64');
  const WINNER_PRIZE_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(WINNER_PRIZE_SCRIPT_HASH_HEX)
  ).toString('base64');
  const SUCCESS_RAFFLE_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(SUCCESS_RAFFLE_SCRIPT_HASH_HEX)
  ).toString('base64');
  const GIFT_REDEEM_SCRIPT_HASH_B64 = Buffer.from(
    blake2b256(GIFT_REDEEM_SCRIPT_HASH_HEX)
  ).toString('base64');

  let winnerScript = fs.readFileSync(
    path.join(constants.SCRIPT_DIR, `winner.es`),
    'utf8',
  );
  winnerScript = winnerScript.replace('GIFT_SCRIPT_HASH_B64', GIFT_SCRIPT_HASH_B64)
  winnerScript = winnerScript.replace('WINNER_PRIZE_SCRIPT_HASH_B64', WINNER_PRIZE_SCRIPT_HASH_B64)
  winnerScript = winnerScript.replace('SUCCESS_RAFFLE_SCRIPT_HASH_B64', SUCCESS_RAFFLE_SCRIPT_HASH_B64)
  winnerScript = winnerScript.replace('GIFT_REDEEM_SCRIPT_HASH_B64', GIFT_REDEEM_SCRIPT_HASH_B64)
  winnerScript = winnerScript.replace(
    'RAFFLE_LICENSE_B64',
    Buffer.from(testUtils.LICENSE_TOKEN_ID, 'hex').toString(
      'base64',
    )
  )
  const WINNER_SCRIPT_HASH_HEX = compile(
    winnerScript
  ).toHex();

  // preparing mocked chain and other required things
  const chain = new MockChain({ height: 1000 });
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
    undefined,
    constants.TRUE_SCRIPT_HEX,
  );

  const winnerBoxes = testUtils.createWinnersBoxMock(
    BigInt(winnersCount),
    testUtils.TICKET_TOKEN_ID,
    undefined,
    1n,
    0n,
    testUtils.GIFT_TOKEN_ID,
    undefined,
    WINNER_SCRIPT_HASH_HEX
  );

  const giftBoxes = [];
  for(let i = 0; i < giftsCount; i += 1) {
    giftBoxes.push(
      testUtils.createGiftBoxMock(
        BigInt(i),
        someone.address.toString(),
        testUtils.FEE * 2n,
        useXTokenForGift ? {
          tokenId: testUtils.X_TOKEN_ID,
          amount: 100n
        } : undefined,
        GIFT_SCRIPT_HASH_HEX
      )
    );
  }

  const successRaffleBox = testUtils.createSuccessRaffleBoxMock(
    activeRaffleBox,
    60n,
    BigInt(winnersCount),
    undefined,
    undefined,
    undefined,
    SUCCESS_RAFFLE_SCRIPT_HASH_HEX
  );

  return it.extend({
    GIFT_SCRIPT_HASH_HEX: GIFT_SCRIPT_HASH_HEX,
    WINNER_PRIZE_SCRIPT_HASH_HEX: WINNER_PRIZE_SCRIPT_HASH_HEX,
    SUCCESS_RAFFLE_SCRIPT_HASH_HEX: SUCCESS_RAFFLE_SCRIPT_HASH_HEX,
    GIFT_REDEEM_SCRIPT_HASH_HEX: GIFT_REDEEM_SCRIPT_HASH_HEX,
    WINNER_SCRIPT_HASH_HEX: WINNER_SCRIPT_HASH_HEX,

    chain: chain,
    someoneWallet: someone,
    creator: creator,
    activeRaffleBox: activeRaffleBox,
    giftTokenRepoBox: giftTokenRepoBox,
    giftBoxes: giftBoxes,
    winnerBoxes: winnerBoxes,
    // giftRedeem: undefined,
    successRaffleBox: successRaffleBox,
    contractsAddresses: testUtils.contractsAddresses,
  });
}

describe('winner', () => {
  const winnerTest = createWinnerTest(1, 1, true);
  const tokenGoalWinnerTest = createWinnerTest(1, 1, true, {tokenId: testUtils.X_TOKEN_ID, amount: 100n});

  describe('Winner box gift token receipt', () => {
    /**
     * @target fail when move another token instead of real gift-token to the winner box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when move another token instead of real gift-token to the winner box',
      ({
        chain,
        creator,
        winnerBoxes,
      }) => {
        // put invalid token to the winnerOutputBox
        const invalidTokenId = '1234'.repeat(16);
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [{
            tokenId: invalidTokenId,
            amount: 1n
          }],
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerBox = (winnerBoxes as Box[])[0];

        const winnerOutputBox = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            ...winnerBox.assets,
            {
              tokenId: invalidTokenId,
              amount: 1n
            }
          ],
          winnerBox.ergoTree.toString(),
          winnerBox.additionalRegisters
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([(winnerBoxes as Box[])[0], giftTokenRepoBox])
          .to([winnerOutputBox, ])
          .payFee(testUtils.FEE)
          .burnTokens(giftTokenRepoBox.assets[0])
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      }
    );

    /**
     * @target fail when incorrect count of gift-token write on the R6 of the input winner-box
     * @scenario
     * - create winner output box by invalid data about gift-token count
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect count of gift-token write on the R6 of the input winner-box',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        creator,
      }) => {
        // put invalid count of gift-token to the input winners count
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          3n,
          0n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerOutputBox = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            ...winnerBox.assets,
            {
              tokenId: giftTokenRepoBox.assets[0].tokenId,
              amount: 1n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: winnerBox.additionalRegisters.R4,
            R5: SLong(1n),
            R6: winnerBox.additionalRegisters.R6,
          }
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox, ])
          .payFee(testUtils.FEE)
          .burnTokens({
            tokenId: giftTokenRepoBox.assets[0].tokenId,
            amount: giftTokenRepoBox.assets[0].amount - 1n
          })
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      }
    );

    /**
     * @target fail when incorrect deadline put in R4 of the input winner-box
     * @scenario
     * - create winner input box by invalid deadline
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when incorrect deadline put in R4 of the input winner-box',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        creator,
      }) => {
        // put invalid deadline to the input winners count
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          3n,
          1000n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
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
        const winnerOutputBox = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            ...winnerBox.assets,
            {
              tokenId: giftTokenRepoBox.assets[0].tokenId,
              amount: 1n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: SColl(SLong, winnerR4).toHex(),
            R5: winnerBox.additionalRegisters.R5,
            R6: winnerBox.additionalRegisters.R6,
          }
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox, giftTokenRepoBox])
          .to([winnerOutputBox, ])
          .payFee(testUtils.FEE)
          .burnTokens({
            tokenId: giftTokenRepoBox.assets[0].tokenId,
            amount: giftTokenRepoBox.assets[0].amount - 1n
          })
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      }
    );

    /**
     * @target fail when two same winner-box pass as input boxes
     * @scenario
     * - create winner input box by invalid deadline
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two same winner-box pass as input boxes',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        creator,
      }) => {
        // put invalid count of gift-token to the input winners count
        const winnerBox1 = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          3n,
          1000n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const winnerBox2 = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          3n,
          1000n,
          testUtils.GIFT_TOKEN_ID,
          undefined,
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const giftTokenRepoBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );

        const winnerOutputBox = testUtils.createCustomOutputBox(
          BigInt(winnerBox1.value),
          [
            ...winnerBox1.assets,
            {
              tokenId: giftTokenRepoBox.assets[0].tokenId,
              amount: 1n
            }
          ],
          winnerBox1.ergoTree.toString(),
          winnerBox1.additionalRegisters
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from([winnerBox1, giftTokenRepoBox, winnerBox2])
          .to([winnerOutputBox, ])
          .payFee(testUtils.FEE)
          .burnTokens([
            {
              tokenId: giftTokenRepoBox.assets[0].tokenId,
              amount: giftTokenRepoBox.assets[0].amount - 1n
            },
            winnerBox2.assets[0]
          ])
          .sendChangeTo(creator.address)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      }
    );
  });

  describe('New gift creation', () => {
    /**
     * @target fail when two gift-tokens move to the output gift box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two gift-tokens move to the output gift box',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        // put extra gift-token to the winnerOutputBox
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
        const outWinner = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            winnerBox.assets[0],
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 97n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: winnerBox.additionalRegisters.R4,
            R5: SLong(2n),
            R6: winnerBox.additionalRegisters.R6,
          }
        );
        const gift = testUtils.createGiftOutputBox(
          winnerR4[0],
          someoneWallet.address.toString(),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
          3n
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
      }
    );

    /**
     * @target fail when value of input and output winner boxes is different
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when value of input and output winner boxes is different',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
        .data as bigint[];
        const outWinner = testUtils.createCustomOutputBox(
          // decrease value of output winner-box
          BigInt(winnerBox.value) - testUtils.FEE,
          [
            winnerBox.assets[0],
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 99n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: winnerBox.additionalRegisters.R4,
            R5: SLong(2n),
            R6: winnerBox.additionalRegisters.R6,
          }
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
      }
    );

    /**
     * @target fail when winner-index on the gift box is incorrect
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when winner-index on the gift box is incorrect',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
        .data as bigint[];
        const outWinner = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            winnerBox.assets[0],
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 99n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: winnerBox.additionalRegisters.R4,
            R5: SLong(2n),
            R6: winnerBox.additionalRegisters.R6,
          }
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
      }
    );

    /**
     * @target fail when amount of erg on the gift box is not enough
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'fail when amount of erg on the gift box is not enough',
      ({
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
      }) => {
        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
        .data as bigint[];
        const outWinner = testUtils.createCustomOutputBox(
          BigInt(winnerBox.value),
          [
            winnerBox.assets[0],
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 99n
            }
          ],
          winnerBox.ergoTree.toString(),
          {
            R4: winnerBox.additionalRegisters.R4,
            R5: SLong(2n),
            R6: winnerBox.additionalRegisters.R6,
          }
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
      }
    );
  });

  describe('Winner prize creation', () => {
    /**
     * @target success erg-goal based winner-prize creation
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction must done successfully
     */
    winnerTest(
      'should success erg-goal based winner-prize creation',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];
      
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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
    });

    /**
     * @target success token-goal based winner-prize creation
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction must done successfully
     */
    tokenGoalWinnerTest(
      'should success token-goal based winner-prize creation',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];

        prizeBoxTokens.push({
          tokenId: successRaffleBox.assets[2].tokenId,
          amount:  prizeAmount
        });

        successRaffleOutputBoxTokens.push({
          tokenId: successRaffleBox.assets[2]!.tokenId,
          amount: BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount)
        });
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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
    });

    /**
     * @target fail when incorrect value puts on the erg-goal prize box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
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

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];
      
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const incorrectPrizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n - 1n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(incorrectPrizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(incorrectPrizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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
          expect(() =>
            chain.execute(transaction),
          ).toThrowError();
    });

    /**
     * @target fail when incorrect value puts on the token-goal prize box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    tokenGoalWinnerTest(
      'should fail when incorrect value puts on the token-goal prize box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];

        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n + 1n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];

        prizeBoxTokens.push({
          tokenId: successRaffleBox.assets[2].tokenId,
          amount:  prizeAmount
        });

        successRaffleOutputBoxTokens.push({
          tokenId: successRaffleBox.assets[2]!.tokenId,
          amount: BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount)
        });
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n,
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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

        expect(() =>
          chain.execute(transaction),
        ).toThrowError();
    });

    /**
     * @target fail when don't move total assets from winner-box to the prize-box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when don\'t move total assets from winner-box to the prize-box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox,
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];
      
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];

        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          // Missing one token amount
          {
            tokenId: winnerBox.assets[1].tokenId,
            amount: BigInt(winnerBox.assets[1].amount) - 1n
          }
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );

        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
        );

        testUtils.prettyPrintJson([
          [successRaffleBox, winnerBox],
          [successRaffleOutputBox, prizeBox]
        ])

        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(
            {
              tokenId: winnerBox.assets[1].tokenId,
              amount: 1n
            }
          )
          .payFee(testUtils.FEE)
          .build();

          // Check execution result
          expect(() =>
            chain.execute(transaction, {}),
          ).toThrowError();
    });

    /**
     * @target fail when put invalid winnerBox-index on the prize-box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when put invalid winnerBox-index on the prize-box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];
      
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            // put invalid winner-index
            R4: SColl(SLong, [BigInt(1n), 3n, BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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
        expect(() =>
          chain.execute(transaction, {}),
        ).toThrowError();
    });

    /**
     * @target fail when put invalid token on the successRaffle box
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'fail when put invalid token on the successRaffle box',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: successRaffleBox.assets[1].amount
          }
        ];
      
        const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox.assets[0],
          winnerBox.assets[1],
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerR4[0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
        );
      
        const transaction = new TransactionBuilder(chain.height)
          .from([successRaffleBox, winnerBox, ...someoneWallet.utxos])
          .to([successRaffleOutputBox, prizeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens([{
            tokenId: successRaffleBox.assets[1].tokenId,
            amount: successRaffleBox.assets[1].amount
          }])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        // Check execution result
        expect(() =>
          chain.execute(transaction, {}),
        ).toThrowError();
    });

    /**
     * @target fail when two duplicated winner-boxes use as input
     * @scenario
     * - create winner output box by invalid data about gift-token id
     * - create giftTokenRepoBox
     * - create output boxes
     * - execute transaction
     * - check execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    winnerTest(
      'should fail when two duplicated winner-boxes use as input',
      ({
        WINNER_PRIZE_SCRIPT_HASH_HEX,
        WINNER_SCRIPT_HASH_HEX,
        chain,
        someoneWallet,
        successRaffleBox
      }) => {
        const totalPrize = 1;

        const winnerBox1 = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const winnerBox2 = (testUtils.createWinnersBoxMock(
          1n,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          10000n,
          undefined,
          [{
            tokenId: testUtils.GIFT_TOKEN_ID,
            amount: 100n
          }],
          WINNER_SCRIPT_HASH_HEX
        ) as Box[])[0];
        const successRaffleOutputBoxTokens = [
          successRaffleBox.assets[0],
          successRaffleBox.assets[1],
        ];
      
        const winnerR4 = SConstant.from(winnerBox1.additionalRegisters.R4!)
          .data as bigint[];
      
        const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
        const prizeBoxTokens = [
          winnerBox1.assets[0],
          winnerBox1.assets[1],
        ];
        const prizeBox = testUtils.createCustomOutputBox(
          testUtils.FEE * 2n + BigInt(prizeAmount),
          prizeBoxTokens,
          WINNER_PRIZE_SCRIPT_HASH_HEX,
          {
            R4: SColl(SLong, [BigInt(1n), winnerBox1.additionalRegisters.R4![0], BigInt(1n)]).toHex(),
            R5: SLong(0n),
          }
        );
      
        const successRaffleOutputBox = testUtils.createCustomOutputBox(
          BigInt(successRaffleBox.value) - BigInt(prizeAmount),
          successRaffleOutputBoxTokens,
          successRaffleBox.ergoTree,
          {
            R4: SColl(SLong, [BigInt(1n), testUtils.FEE, BigInt(totalPrize)]).toHex(),
            R5: SColl(SColl(SByte), [Array.from(Buffer.from('test seed')), Array.from(Buffer.from(''))]),
            R6: SLong(BigInt(1n))  // step
          }
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
        expect(() =>
          chain.execute(transaction, {}),
        ).toThrowError();
    });
  });
});
