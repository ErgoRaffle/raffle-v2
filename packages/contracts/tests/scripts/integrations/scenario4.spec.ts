import { it, describe, expect } from 'vitest';
import { SColl, SLong } from '@fleet-sdk/core'

import * as testUtils from '../../testUtils';
import {
  executeCreateRaffleTx,
  executeGiftTokenReceiptTx,
  executePrizeCreationTx,
  executeMergeTx,
  executeAddGiftTx,
  executeDonateTx,
  executeRewardTx,
  executeGiftUnwrapTx,
  executeFinalPrizeTx,
  executeReturnRaffleLicenseTx
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
  const {
    creator, implementer, giftgiver1,
    donator1, donator2, donator3, donator4, donator5
  } = testUtils.createPartners(chain, {
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
  const serviceBox = testUtils.createServiceBoxMock(
    creator.address.toString(),
    testUtils.LICENSE_TOKEN_COUNT,
    10n,
    10n,
    testUtils.FEE * 6n,
  );

  const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1];
  const donatorWallets: KeyedMockChainParty[] = [
    donator1, donator2, donator3, donator4, donator5
  ];

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
    /**
     * @target Failed Erg-goal raffle with 1 winners
     * @scenario
     * 1. Raffle creation phase 1 (create inactive raffle and ticketRepo with special collecting token)
     * 2. Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
     * 3. Gift token receipt transaction
     * 4. Add two gifts to one of the winners
     * 5. Donate twice by two different donators
     * 6. Reward transaction
     * 7. Create prize-boxes for winners
     * 8. Spending gifts
     * 9. Spending prizes
     * 10. Return raffle license to service
     * @expected
     * - To sign all transactions successfully and complete the scenario
     */
    raffleTest(
      'success Erg-goal raffle with 1 winners',
      ({
        chain,
        creator,
        serviceBox,
        implementerAddress,
        giftGiverWallets,
        donatorWallets,
      }) => {
        chain.setTip(100);
        const winnersCount = 1n;
        const deadline = 2000n;
        const winnersPercent: bigint[] = [];
        for (let i = 0; i < winnersCount; i++)
          winnersPercent.push(1000n / winnersCount);
        // Step 1: Raffle creation phase 1 (create inactive raffle and ticketRepo)
        const createRaffleTx = executeCreateRaffleTx(
          creator,
          serviceBox,
          creator.utxos.toArray(),
          implementerAddress,
          winnersCount,
          deadline,
          winnersPercent,
          chain,
          undefined,
          1_000_000n
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
          chain,
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
            chain,
          );
          step++;
          winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
          giftTokenRepo = giftTokenReceiptTx.outputs[1];
        }

        // Step 4: Add one gift to one of the winner
        let winner1 = winnerBoxes[0];
        const winner1Gifts = [];
        const addGiftTx = executeAddGiftTx(
          winner1,
          (giftGiverWallets as KeyedMockChainParty[])[0],
          chain,
        );
        expect(addGiftTx.success).true;
        winner1 = addGiftTx.outputs[0];
        winner1Gifts.push(addGiftTx.outputs[1]);

        // Step 5: Donate fifth by five different donators
        let activeRaffle = mergeTx.outputs[0];
        const tickets = [];
        for (let donateCount = 0; donateCount < 5; donateCount++) {
          const donateTx = executeDonateTx(
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
          =     Success scenario     =
          =                          =
          ============================
        */
        // Step 6: Reward transaction
        const rewardTx = executeRewardTx(
          activeRaffle,
          raffleDetails,
          creator.address.toString(),
          creator.address.toString(),
          implementerAddress,
          1,
          1_000_000,
          chain
        );
        expect(rewardTx.success).true;

        // Step 7: Create prize-boxes for winners
        let successRaffleBox = rewardTx.outputs[0];
        successRaffleBox.setContextExtension({
          0: SColl(SLong, rewardTx.winnerIndexList),
          1: SLong(BigInt(rewardTx.winnerIndexList[rewardTx.winnerIndexList.length - 1])),
        });
        const prizeBoxes = [];
        const prizeCreationTx = executePrizeCreationTx(
          successRaffleBox,
          activeRaffle,
          winner1,
          rewardTx.winnerIndexList,
          chain
        );
        expect(prizeCreationTx.success).true;
        successRaffleBox = prizeCreationTx.outputs[0];
        prizeBoxes.push(prizeCreationTx.outputs[1]);

        // Step 8: spending gifts
        for(let i = 0; i < winner1Gifts.length; i++) {
          const giftUnwrappedTx = executeGiftUnwrapTx(
            prizeBoxes[i],
            winner1Gifts[i],
            tickets[i],
            BigInt(i + 1),
            chain
          );
          expect(giftUnwrappedTx.success).true;
          prizeBoxes[i] = giftUnwrappedTx.outputs[0];
        }

        // Step 9: spending prizes
        for(let i = 0; i < prizeBoxes.length; i++) {
          const finalPrizeTx = executeFinalPrizeTx(
            prizeBoxes[i],
            tickets[i],
            chain
          );
          expect(finalPrizeTx.success).true;
        }

        // Step 10: Return raffle license to service
        const finalServiceBox = createRaffleTx.outputs[0];
        const returnLicenseTx = executeReturnRaffleLicenseTx(
          successRaffleBox,
          finalServiceBox,
          chain,
        );
        expect(returnLicenseTx.success).true;
      }
    );
  });
});
