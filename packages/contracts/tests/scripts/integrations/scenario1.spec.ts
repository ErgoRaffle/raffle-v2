import { it, describe, expect } from 'vitest';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

import * as testUtils from '../../testUtils';
import {
  executeAddGiftTx,
  executeCreateRaffleTx,
  executeDonateTx,
  executeFailureTx,
  executeGiftTokenReceiptTx,
  executeMergeTx,
  executeGiftReturnTx,
  executeWinnerRemovalTx,
  executeForwardToTicketRedeemTx,
  executeTicketRedeemTx,
  executeReturnRaffleLicenseTx,
  executeSafeWithdrawTransaction,
} from './transactions';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create service input box
 * @returns vitest customized "it" object
 */
const createRaffleTest = () => {
  const boxFactory = new testUtils.RaffleBoxFactory({ height: 1000 });
  const {
    owner,
    creator,
    implementer,
    giftgiver1,
    giftgiver2,
    donator1,
    donator2,
  } = boxFactory.createPartners({
    owner: testUtils.CREATOR_DEFAULT_BALANCE,
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    implementer: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    giftGiver1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    giftGiver2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  giftgiver1.addBalance({
    tokens: [
      { tokenId: testUtils.X_TOKEN_ID, amount: 1_000n },
      { tokenId: 'f'.repeat(64), amount: 1_000n },
    ],
  });
  giftgiver2.addBalance({
    tokens: [
      { tokenId: testUtils.X_TOKEN_ID, amount: 1_000n },
      { tokenId: 'f'.repeat(64), amount: 1_000n },
    ],
  });

  // Created input service-box
  const serviceBox = boxFactory.createServiceBoxMock(
    owner.ergoTree,
    testUtils.LICENSE_TOKEN_COUNT,
    105n,
    100n,
    1_000_000_000n,
  );

  const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1, giftgiver2];
  const donatorWallets: KeyedMockChainParty[] = [donator1, donator2];

  return it.extend({
    boxFactory: boxFactory,
    creator: creator,
    serviceBox: serviceBox,
    implementerErgoTree: implementer.ergoTree,
    ownerErgoTree: owner.ergoTree,
    giftGiverWallets: giftGiverWallets as KeyedMockChainParty[],
    donatorWallets: donatorWallets as KeyedMockChainParty[],
  });
};

describe('Raffle', () => {
  const raffleTest = createRaffleTest();

  describe('Create raffle', () => {
    /**
     * @target Failed Erg-goal raffle with 2 winners
     * @scenario
     * 1. Raffle creation phase 1 (create inactive raffle and ticketRepo)
     * 2. Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
     * 3. Gift token receipt transaction (move gift tokens to winner boxes)
     * 4. Add two gifts to one of the winners
     * 5. Donate twice by two different donators
     * 6. Failure transaction after passing the deadline
     * 7. Returning two gifts of the first winner
     * 8. Winner removal transaction
     * 9. Forward to ticket redeem phase
     * 10. Redeem two tickets to donators
     * 11. Return raffle license to service
     * @expected
     * - To sign all transactions successfully and complete the scenario
     */
    raffleTest(
      'Failed Erg-goal raffle with 2 winners',
      ({
        boxFactory,
        creator,
        serviceBox,
        implementerErgoTree,
        ownerErgoTree,
        giftGiverWallets,
        donatorWallets,
      }) => {
        boxFactory.chain.setTip(100);
        const winnersCount = 2;
        const deadline = 2000n;
        const winnersPercent: bigint[] = [];
        for (let i = 0; i < winnersCount; i++)
          winnersPercent.push(1000n / BigInt(winnersCount));
        // Step 1: Raffle creation phase 1 (create inactive raffle and ticketRepo)
        const createRaffleTx = executeCreateRaffleTx(
          creator,
          serviceBox,
          creator.utxos.toArray(),
          implementerErgoTree,
          ownerErgoTree,
          winnersCount,
          deadline,
          winnersPercent,
          boxFactory,
        );
        expect(createRaffleTx.success).true;

        // Step 2: Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
        const inactiveRaffle = createRaffleTx.outputs[2];
        const ticketRepo = createRaffleTx.outputs[1];

        const mergeTx = executeMergeTx(
          inactiveRaffle,
          ticketRepo,
          winnersCount,
          deadline,
          boxFactory,
          winnersPercent,
        );
        expect(mergeTx.success).true;

        const raffleDetails = mergeTx.outputs[1];

        // Step 3: Gift token receipt transaction (move gift tokens to winner boxes)
        let giftTokenRepo = mergeTx.outputs[2];
        const emptyWinnerBoxes = mergeTx.outputs.slice(3, 5);
        let step = 1;
        const winnerBoxes = [];
        for (const winnerBox of emptyWinnerBoxes) {
          const giftTokenReceiptTx = executeGiftTokenReceiptTx(
            winnerBox,
            giftTokenRepo,
            step,
            winnersCount,
            boxFactory,
          );
          step++;
          winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
          giftTokenRepo = giftTokenReceiptTx.outputs[1];
        }

        // Step 4: Add two gifts to one of the winners
        let winner1 = winnerBoxes[0];
        const winner1Gifts = [];
        for (let i = 0; i < 2; i++) {
          const addGiftTx = executeAddGiftTx(
            winner1,
            (giftGiverWallets as KeyedMockChainParty[])[i],
            boxFactory,
            [
              {
                tokenId: testUtils.X_TOKEN_ID,
                amount: 10n,
              },
              {
                tokenId: 'f'.repeat(64),
                amount: 10n,
              },
            ],
          );
          expect(addGiftTx.success).true;
          winner1 = addGiftTx.outputs[0];
          winner1Gifts.push(addGiftTx.outputs[1]);
        }

        // Step 5: Donate twice by two different donators
        let activeRaffle = mergeTx.outputs[0];
        const tickets = [];
        for (let donateCount = 0; donateCount < 2; donateCount++) {
          const donateTx = executeDonateTx(
            activeRaffle,
            (donatorWallets as KeyedMockChainParty[])[donateCount],
            BigInt(donateCount + 2),
            boxFactory,
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
        boxFactory.chain.setTip(2001);

        // Step 6: Failure transaction
        const failureTx = executeFailureTx(
          activeRaffle,
          raffleDetails,
          boxFactory,
        );
        expect(failureTx.success).true;

        // Step 7: Returning two gifts of the first winner
        let giftRedeem = failureTx.outputs[0];
        for (let i = 0; i < 2; i++) {
          const giftRedeemTx = executeGiftReturnTx(
            giftRedeem,
            winner1,
            winner1Gifts[i],
            boxFactory,
          );
          expect(giftRedeemTx.success).true;
          winner1 = giftRedeemTx.outputs[0];

          const giftSafePayBox = giftRedeemTx.outputs[1];
          const giftSafeWithdrawTx = executeSafeWithdrawTransaction(
            giftSafePayBox,
            (giftGiverWallets as KeyedMockChainParty[])[i].ergoTree,
            boxFactory,
          );
          expect(giftSafeWithdrawTx.success).true;
        }

        // Step 8: Winner removal transaction
        for (const winnerBox of [winner1, winnerBoxes[1]]) {
          const winnerRemovalTx = executeWinnerRemovalTx(
            giftRedeem,
            winnerBox,
            boxFactory,
          );
          expect(winnerRemovalTx.success).true;
          giftRedeem = winnerRemovalTx.outputs[0];
        }

        // Step 9: Forward to ticket redeem phase
        const forwardToTicketRedeemTx = executeForwardToTicketRedeemTx(
          giftRedeem,
          boxFactory,
        );
        expect(forwardToTicketRedeemTx.success).true;

        // Step 10: Redeem two tickets to donators
        let ticketRedeem = forwardToTicketRedeemTx.outputs[0];
        for (let i = 0; i < tickets.length; i++) {
          const ticketRedeemTx = executeTicketRedeemTx(
            ticketRedeem,
            tickets[i],
            boxFactory,
          );
          ticketRedeem = ticketRedeemTx.outputs[0];
          expect(ticketRedeemTx.success).true;

          const donationSafePayBox = ticketRedeemTx.outputs[1];
          const donationSafeWithdrawTx = executeSafeWithdrawTransaction(
            donationSafePayBox,
            (donatorWallets as KeyedMockChainParty[])[i++].ergoTree,
            boxFactory,
          );
          expect(donationSafeWithdrawTx.success).true;
        }

        // Step 11: Return raffle license to service
        const service = createRaffleTx.outputs[0];
        const returnLicenseTx = executeReturnRaffleLicenseTx(
          ticketRedeem,
          service,
          boxFactory,
          ownerErgoTree,
          ownerErgoTree,
        );
        expect(returnLicenseTx.success).true;

        const serviceFeeSafePayBox = returnLicenseTx.outputs[1];
        const serviceFeeSafeWithdrawTx = executeSafeWithdrawTransaction(
          serviceFeeSafePayBox,
          ownerErgoTree,
          boxFactory,
        );
        expect(serviceFeeSafeWithdrawTx.success).true;
      },
    );
  });
});
