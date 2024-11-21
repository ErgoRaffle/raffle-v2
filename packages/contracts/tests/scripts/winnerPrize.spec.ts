import { it, describe, expect } from 'vitest';
import { SConstant } from '@fleet-sdk/serializer';
import { TransactionBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import {
  X_TOKEN_ID,
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create winnerPrize input box
 * @returns vitest customized "it" object
 */
const createWinnerPrizeTest = () => {
  const totalPrize = 20_000_000n;
  const winnerRewardPercent = 200n;
  const winnerTicketIndex = 1n;
  const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
  const winnerGiftTokensAmount = 1n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'winnerPrize',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone } = boxFactory.createPartners({
    Creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });

  // create winnerPrize input box
  const winnerPrizeBox = boxFactory.createWinnerPrizeBoxMock(
    testUtils.FEE * 3n + BigInt(prizeAmount),
    1,
    winnerTicketIndex,
    1n,
    0n,
    winnerGiftTokensAmount,
  );

  // create gift input box
  const giftBox = boxFactory.createGiftBoxMock(
    1,
    someone.ergoTree,
    testUtils.FEE * 10n,
    testUtils.GIFT_TOKEN_ID,
    1n,
  );

  // create ticket box
  const ticketBox = boxFactory.createTicketBoxMock(
    someone.ergoTree,
    5n,
    testUtils.TICKET_TOKEN_ID,
    [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    ticketBox: ticketBox,
    winnerPrizeBox: winnerPrizeBox,
    giftBox: giftBox,
  });
};

describe('winnerPrize', () => {
  const winnerPrizeTest = createWinnerPrizeTest();

  describe('Gift unwrap', () => {
    /**
     * @target should successfully unwrap the gift for the winner ticket
     * @scenario
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    winnerPrizeTest(
      'should successfully unwrap the gift for the winner ticket',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );
  });
});
