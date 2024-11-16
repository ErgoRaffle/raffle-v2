import { it, describe, expect } from 'vitest';
import { SConstant } from '@fleet-sdk/serializer';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

import * as testUtils from '../../testUtils';
import {
  executeCreateRaffleTx,
  executeGiftTokenReceiptTx,
  executePrizeCreationTx,
  executeMergeTx,
  executeAddGiftTx,
  executeDonateTx,
  executeFeePaymentTx,
  executeGiftUnwrapTx,
  executeFinalPrizeTx,
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
    donator1,
    donator2,
    donator3,
    donator4,
    donator5,
  } = boxFactory.createPartners({
    owner: testUtils.CREATOR_DEFAULT_BALANCE,
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    implementer: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    giftGiver1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator3: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator4: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator5: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000_000n }],
  });
  donator1.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });
  donator2.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });
  donator3.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });
  donator4.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });
  donator5.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });

  // Created input service-box
  const creationFee = testUtils.CREATION_FEE;
  const serviceBox = boxFactory.createServiceBoxMock(
    owner.ergoTree,
    testUtils.LICENSE_TOKEN_COUNT,
    100n,
    100n,
    creationFee,
  );

  const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1];
  const donatorWallets: KeyedMockChainParty[] = [
    donator1,
    donator2,
    donator3,
    donator4,
    donator5,
  ];

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
     * @target Success Erg-goal raffle with 1 winner
     * @scenario
     * 1. Raffle creation phase 1 (create inactive raffle and ticketRepo with special collecting token)
     * 2. Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
     * 3. Gift token receipt transaction
     * 4. Add two gifts to the winner
     * 5. Donate twice by two different donators
     * 6. Success transaction and fee payment after passing the deadline
     * 7. Create prize-boxes for winners
     * 8. Unwrap one gift of the first winner
     * 9. Withdraw winners final prize
     * 10. Return raffle license to service
     * @expected
     * - To sign all transactions successfully and complete the scenario
     */
    raffleTest(
      'success Erg-goal raffle with 1 winner',
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

        const winnersCount = 1;
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
          undefined,
          10_000_000n,
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
        const emptyWinnerBoxes = mergeTx.outputs.slice(3, 4);
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
          expect(giftTokenReceiptTx.success).true;
          step++;
          winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
          giftTokenRepo = giftTokenReceiptTx.outputs[1];
        }

        // Step 4: Add one gift to one of the winner
        let winner1 = winnerBoxes[0];
        const winnersGifts = [];
        const addGiftTx = executeAddGiftTx(
          winner1,
          (giftGiverWallets as KeyedMockChainParty[])[0],
          boxFactory,
        );
        expect(addGiftTx.success).true;
        winner1 = addGiftTx.outputs[0];
        winnersGifts.push(addGiftTx.outputs[1]);

        // Step 5: Donate fifth by five different donators
        let activeRaffle = mergeTx.outputs[0];
        const tickets = new testUtils.Tickets();
        const ticketCount = 10n;
        for (let donateCount = 0; donateCount < 5; donateCount++) {
          const donateTx = executeDonateTx(
            activeRaffle,
            (donatorWallets as KeyedMockChainParty[])[donateCount],
            ticketCount,
            boxFactory,
          );
          expect(donateTx.success).true;
          activeRaffle = donateTx.outputs[0];
          tickets.push(donateTx.outputs[1]);
        }

        /*
          ============================
          =                          =
          =     Success scenario     =
          =                          =
          ============================
        */
        // Pass the raffle deadline
        boxFactory.chain.setTip(2001);

        // Step 6: Success transaction and fee payment after passing the deadline
        const feePaymentTx = executeFeePaymentTx(
          activeRaffle,
          raffleDetails,
          boxFactory,
        );
        expect(feePaymentTx.success).true;

        const serviceFeeSafePayBox = feePaymentTx.outputs[1];
        const serviceFeeSafeWithdrawTx = executeSafeWithdrawTransaction(
          serviceFeeSafePayBox,
          ownerErgoTree,
          boxFactory,
        );
        expect(serviceFeeSafeWithdrawTx.success).true;

        const implementerFeeSafePayBox = feePaymentTx.outputs[2];
        const implementerFeeSafeWithdrawTx = executeSafeWithdrawTransaction(
          implementerFeeSafePayBox,
          implementerErgoTree,
          boxFactory,
        );
        expect(implementerFeeSafeWithdrawTx.success).true;

        // Step 7: Create prize-boxes for winners
        let successRaffleBox = feePaymentTx.outputs[0];
        const winnerTicketsList: bigint[] = [];
        const prizeBoxes = [];
        const successRaffleR4 = SConstant.from(
          successRaffleBox.additionalRegisters.R4!,
        ).data as bigint[];
        const totalSoldTickets = successRaffleR4[1];
        const successRaffleR7 = SConstant.from(
          successRaffleBox.additionalRegisters.R7!,
        ).data as Uint8Array[];
        const newWinnerTicketIndex = testUtils.generateNextWinnerIndex(
          winnerTicketsList,
          1,
          successRaffleR7[0],
          totalSoldTickets,
        );

        const prizeCreationTx = executePrizeCreationTx(
          successRaffleBox,
          winnerBoxes[0],
          newWinnerTicketIndex,
          [],
          boxFactory,
        );
        expect(prizeCreationTx.success).true;
        successRaffleBox = prizeCreationTx.outputs[0];
        prizeBoxes.push(prizeCreationTx.outputs[1]);

        // Step 8: Unwrap one gift of the first winner
        for (let i = 0; i < winnersGifts.length; i++) {
          const prizeBoxR4 = SConstant.from(
            prizeBoxes[0].additionalRegisters.R4!,
          ).data as bigint[];
          const winnerTicket = tickets.selectByWinnerIndex(prizeBoxR4[0]);
          const giftUnwrappedTx = executeGiftUnwrapTx(
            prizeBoxes[i],
            winnersGifts[i],
            winnerTicket,
            BigInt(i + 1),
            boxFactory,
          );
          expect(giftUnwrappedTx.success).true;
          prizeBoxes[i] = giftUnwrappedTx.outputs[0];

          const donatorIndex = Number(prizeBoxR4[0] / ticketCount);
          const winnerAddress = (donatorWallets as KeyedMockChainParty[])[
            donatorIndex
          ].ergoTree;

          const giftSafePayBox = giftUnwrappedTx.outputs[1];
          const giftSafeWithdrawTx = executeSafeWithdrawTransaction(
            giftSafePayBox,
            winnerAddress,
            boxFactory,
          );
          expect(giftSafeWithdrawTx.success).true;
        }

        // Step 9: Withdraw winners final prize
        for (let i = 0; i < prizeBoxes.length; i++) {
          const prizeBoxR4 = SConstant.from(
            prizeBoxes[i].additionalRegisters.R4!,
          ).data as bigint[];
          const winnerTicket = tickets.selectByWinnerIndex(prizeBoxR4[0]);
          const finalPrizeTx = executeFinalPrizeTx(
            prizeBoxes[i],
            winnerTicket,
            boxFactory,
          );
          expect(finalPrizeTx.success).true;

          const donatorIndex = Number(prizeBoxR4[0] / ticketCount);
          const winnerAddress = (donatorWallets as KeyedMockChainParty[])[
            donatorIndex
          ].ergoTree;

          const prizeSafePayBox = finalPrizeTx.outputs[0];
          const prizeSafeWithdrawTx = executeSafeWithdrawTransaction(
            prizeSafePayBox,
            winnerAddress,
            boxFactory,
          );
          expect(prizeSafeWithdrawTx.success).true;
        }

        // Step 10: Return raffle license to service and pay the project fund
        const finalServiceBox = createRaffleTx.outputs[0];
        const returnLicenseTx = executeReturnRaffleLicenseTx(
          successRaffleBox,
          finalServiceBox,
          boxFactory,
          creator.ergoTree,
          ownerErgoTree,
        );
        expect(returnLicenseTx.success).true;

        const projectSafePayBox = returnLicenseTx.outputs[1];
        const projectSafeWithdrawTx = executeSafeWithdrawTransaction(
          projectSafePayBox,
          creator.ergoTree,
          boxFactory,
        );
        expect(projectSafeWithdrawTx.success).true;
      },
    );
  });
});
