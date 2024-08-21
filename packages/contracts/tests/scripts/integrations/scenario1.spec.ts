import { it, describe, expect } from 'vitest';

import * as testUtils from '../../testUtils';
import {
  AddGiftTx,
  CreateRaffleTx,
  DonateTx,
  FailureTx,
  GiftTokenReceiptTx,
  MergeTx,
  GiftReturnTx,
  // WinnerRemovalTx,
} from './transactions';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create service input box
 * @returns vitest customized "it" object
 */
const createRaffleTest = () => {
  const chain = new testUtils.RaffleMockChain({ height: 1000 });
  const { creator, implementer, giftgiver1, giftgiver2, donator1, donator2 } =
    testUtils.createPartners(chain, {
      Creator: testUtils.CREATOR_DEFAULT_BALANCE,
      implementer: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      giftGiver1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      giftGiver2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });

  // Created input service-box
  const serviceBox = testUtils.createServiceBoxMock(
    creator.address.toString(),
    testUtils.LICENSE_TOKEN_COUNT,
    10n,
    10n,
    1_000_000_000n,
  );

  const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1, giftgiver2];
  const donatorWallets: KeyedMockChainParty[] = [donator1, donator2];

  return it.extend({
    chain: chain,
    creator: creator,
    serviceBox: serviceBox,
    implementerAddress: implementer.address.toString(),
    giftGiverWallets: giftGiverWallets as KeyedMockChainParty[],
    donatorWallets: donatorWallets as KeyedMockChainParty[],
  });
};

describe('Raffle', () => {
  const raffleTest = createRaffleTest();

  describe('Create raffle', () => {
    /*
    - Erg-goal raffle with 2 winners
    - Receiving 2 gifts for the first winner
    - Raised fund by 2 donation
    - Failed after the deadline (Not raising enough fund to cover raffle goal)
    - All gifts and donations returned successfully
     */
    raffleTest(
      'Failed Erg-goal raffle with 2 winners',
      ({
        chain,
        creator,
        serviceBox,
        implementerAddress,
        giftGiverWallets,
        donatorWallets,
      }) => {
        const winnersCount = 2n;
        console.log(chain.height);
        const deadline = 2000n;
        const winnersPercent: bigint[] = [];
        for (let i = 0; i < winnersCount; i++)
          winnersPercent.push(1000n / winnersCount);
        // Step 1: Raffle creation phase 1 (create inactive raffle and ticketRepo)
        const createRaffleTx = CreateRaffleTx(
          creator,
          serviceBox,
          creator.utxos.toArray(),
          implementerAddress,
          winnersCount,
          deadline,
          winnersPercent,
          chain,
        );
        expect(createRaffleTx.success).true;

        // Step 2: Raffle creation phase 2 (merge inactive and ticket repo and create active raffle)
        const inactiveRaffle = createRaffleTx.outputs[2];
        const ticketRepo = createRaffleTx.outputs[1];

        const mergeTx = MergeTx(
          inactiveRaffle,
          ticketRepo,
          winnersCount,
          deadline,
          chain,
        );
        expect(mergeTx.success).true;

        // Step 3: Gift token receipt transaction
        let giftTokenRepo = mergeTx.outputs[2];
        const emptyWinnerBoxes = mergeTx.outputs.slice(3, 5);
        let step = 1;
        const winnerBoxes = [];
        for (const winnerBox of emptyWinnerBoxes) {
          const giftTokenReceiptTx = GiftTokenReceiptTx(
            winnerBox,
            giftTokenRepo,
            step,
            winnersCount,
            chain,
          );
          step++;
          winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
          giftTokenRepo = giftTokenReceiptTx.outputs[1];
        }

        // Step 4: Add two gifts to one of the winners
        let winner1 = winnerBoxes[0];
        const winner1Gifts = [];
        for (let i = 0; i < 2; i++) {
          const addGiftTx = AddGiftTx(
            winner1,
            (giftGiverWallets as KeyedMockChainParty[])[i],
            chain,
          );
          expect(addGiftTx.success).true;
          winner1 = addGiftTx.outputs[0];
          winner1Gifts.push(addGiftTx.outputs[1]);
        }

        // Step 5: Donate twice by two different donator wallets
        let activeRaffle = mergeTx.outputs[0];
        const tickets = [];
        for (let donateCount = 0; donateCount < 2; donateCount++) {
          const donateTx = DonateTx(
            activeRaffle,
            (donatorWallets as KeyedMockChainParty[])[donateCount],
            10n,
            chain,
          );
          expect(donateTx.success).true;
          activeRaffle = donateTx.outputs[0];
          tickets.push(donateTx.outputs[1]);
        }

        /*
          ============================
          =                          =
          =     Failure scenario     =
          =                          =
          ============================
          */

        // Pass the raffle deadline
        chain.setTip(2001);

        // Step 6: Failure transaction
        const failureTx = FailureTx(activeRaffle, chain);
        expect(failureTx.success).true;

        // Step 7: Return gifts transaction
        const giftRedeem = failureTx.outputs[0];
        for (let i = 0; i < 2; i++) {
          const giftRedeemTx = GiftReturnTx(
            giftRedeem,
            winner1,
            winner1Gifts[i],
            chain,
          );
          expect(giftRedeemTx.success).true;
          winner1 = giftRedeemTx.outputs[0];
        }

        // Step8: Winner removal transaction
        // for (const winnerBox of [winner1, winnerBoxes[1]]) {
        //   const winnerRemovalTx = WinnerRemovalTx(giftRedeem, winnerBox, chain);
        //   expect(winnerRemovalTx.success).true;
        //   giftRedeem = winnerRemovalTx.outputs[0];
        // }
      },
    );
  });
});
