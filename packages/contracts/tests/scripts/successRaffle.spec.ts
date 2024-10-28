import { it, describe, expect } from 'vitest';
import { Box, ErgoUnsignedInput, TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SColl, SLong } from '@fleet-sdk/serializer';

import * as testUtils from '../testUtils';
import {
  X_TOKEN_ID,
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

const TEST_INITIAL_SEED = '0123456789012345';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create successRaffle input box
 *   - create winners input boxes
 * @returns vitest customized "it" object
 */
const createSuccessRaffleTest = (
  winnersCount: number = 5,
  totalPrize: bigint = 5n,
  collectingTokenId?: string,
) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'successRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);

  const { creator, someone } = boxFactory.createPartners({
    Creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });

  // Created input successRaffle-box
  const prizeValue = 10n * totalPrize;
  const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
    testUtils.FEE,
    testUtils.LICENSE_TOKEN_ID,
    TEST_INITIAL_SEED,
    [],
    5n,
    winnersCount,
    totalPrize,
    prizeValue,
    1,
    undefined,
    undefined,
    collectingTokenId,
  ) as ErgoUnsignedInput;

  const winnersBoxes = boxFactory.createWinnersBoxMock(
    Number(winnersCount),
    testUtils.TICKET_TOKEN_ID,
    undefined,
    BigInt(2000),
    0n,
    testUtils.GIFT_TOKEN_ID,
  );

  return it.extend({
    boxFactory: boxFactory,
    winnersCount: winnersCount,
    totalPrize: totalPrize,
    someoneWallet: someone,
    creator: creator,
    successRaffleBox: successRaffleBox,
    winnersBoxes: winnersBoxes as Box[],
  });
};

describe('successRaffle', () => {
  const successRaffleTest = createSuccessRaffleTest();

  describe('winner prize creation', () => {
    /**
     * @target should done winner prize creation transaction successfully
     * @scenario
     * - create three output boxes by values(set only one winner)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    successRaffleTest(
      'should done winner prize creation transaction successfully',
      ({
        boxFactory,
        winnersBoxes,
        successRaffleBox,
        winnersCount,
        totalPrize,
      }) => {
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
        const newWinnerTicketIndex = testUtils.generateNextWinnerIndex(
          [],
          1,
          Uint8Array.from(Array.from(Buffer.from(TEST_INITIAL_SEED, 'hex'))),
          totalSoldTickets,
        );

        successRaffleBox.setContextExtension({
          0: SColl(SLong, []),
          1: SLong(newWinnerTicketIndex),
        });

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );
  });
});
