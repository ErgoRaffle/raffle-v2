import { it, describe, expect } from 'vitest';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

import * as testUtils from '../../testUtils';
import {
  CreationTxBuilder,
  ActivationTxBuilder,
  GiftTokenReceiptTxBuilder,
  AddGiftTxBuilder,
  DonateTxBuilder,
  FailureTxBuilder,
  GiftReturnTxBuilder,
  WinnerRemovalTxBuilder,
  ForwardToTicketRedeemTxBuilder,
  TicketRedeemTxBuilder,
  ReturnRaffleLicenseTxBuilder,
  SafeWithdrawTxBuilder,
} from '@ergo-raffle/transactions';

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
        const createRaffleBuilder = new CreationTxBuilder()
          .setServiceBox(serviceBox)
          .setFeeBoxes(creator.utxos.toArray())
          .setCreatorAddress(creator.address.toString())
          .setImplementerErgoTree(implementerErgoTree)
          .setWinnersCount(winnersCount)
          .setDeadline(deadline)
          .setWinnersPercent(winnersPercent)
          .setTicketPrice(100n)
          .setWinnersSharePercent(200n)
          .setGoal(1000n)
          .setInactiveRaffleValue(
            8n * testUtils.FEE +
              5n * testUtils.FEE * BigInt(winnersCount) +
              testUtils.CREATION_FEE,
          )
          .setRaffleName('Test failed erg-goal raffle')
          .setRaffleDescription('Test Raffle Description')
          .setTicketTokenCount(100n)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.FEE);

        const createRaffleTx = boxFactory.chain.executeAndReturnOutputs(
          createRaffleBuilder.build(),
          { signers: [creator] },
        );
        expect(createRaffleTx.success).true;

        // Step 2: Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
        const inactiveRaffle = createRaffleTx.outputs[2];
        const ticketRepo = createRaffleTx.outputs[1];

        const activationBuilder = new ActivationTxBuilder()
          .setGiftTokenName('Gift Token')
          .setGiftTokenDescription('Gift Token Description')
          .setInactiveRaffle(inactiveRaffle)
          .setTicketRepo(ticketRepo)
          .setWinnersSharePercent(winnersPercent)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.FEE);

        const activationTx = boxFactory.chain.executeAndReturnOutputs(
          activationBuilder.build(),
        );
        expect(activationTx.success).true;

        const raffleDetails = activationTx.outputs[1];

        // Step 3: Gift token receipt transaction (move gift tokens to winner boxes)
        let giftTokenRepo = activationTx.outputs[2];
        const emptyWinnerBoxes = activationTx.outputs.slice(3, 5);
        let step = 1;
        const winnerBoxes = [];
        for (const winnerBox of emptyWinnerBoxes) {
          const giftTokenReceiptBuilder = new GiftTokenReceiptTxBuilder()
            .setWinner(winnerBox)
            .setGiftTokenRepo(giftTokenRepo)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const giftTokenReceiptTx = boxFactory.chain.executeAndReturnOutputs(
            giftTokenReceiptBuilder.build(),
          );
          step++;
          winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
          giftTokenRepo = giftTokenReceiptTx.outputs[1];
          expect(giftTokenReceiptTx.success).true;
        }

        // Step 4: Add two gifts to one of the winners
        let winner1 = winnerBoxes[0];
        const winner1Gifts = [];
        for (let i = 0; i < 2; i++) {
          const addGiftBuilder = new AddGiftTxBuilder()
            .setWinner(winner1)
            .setGiftGiverUtxos(
              (giftGiverWallets as KeyedMockChainParty[])[i].utxos.toArray(),
            )
            .setGiftGiverAddress(
              (giftGiverWallets as KeyedMockChainParty[])[i].address.toString(),
            )
            .setGiftValue(10n * testUtils.FEE)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE)
            .setGiftTokens([
              {
                tokenId: testUtils.X_TOKEN_ID,
                amount: 10n,
              },
              {
                tokenId: 'f'.repeat(64),
                amount: 10n,
              },
            ]);

          const addGiftTx = boxFactory.chain.executeAndReturnOutputs(
            addGiftBuilder.build(),
            { signers: [(giftGiverWallets as KeyedMockChainParty[])[i]] },
          );
          expect(addGiftTx.success).true;
          winner1 = addGiftTx.outputs[0];
          winner1Gifts.push(addGiftTx.outputs[1]);
        }

        // Step 5: Donate twice by two different donators
        let activeRaffle = activationTx.outputs[0];
        const tickets = [];
        for (let donateCount = 0; donateCount < 2; donateCount++) {
          const donateBuilder = new DonateTxBuilder()
            .setActiveRaffle(activeRaffle)
            .setDonatorUtxos([
              (donatorWallets as KeyedMockChainParty[])[
                donateCount
              ].utxos.toArray()[0],
            ])
            .setDonatorAddress(
              (donatorWallets as KeyedMockChainParty[])[
                donateCount
              ].address.toString(),
            )
            .setDonationTicketCount(BigInt(donateCount + 2))
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const donateTx = boxFactory.chain.executeAndReturnOutputs(
            donateBuilder.build(),
            {
              signers: [(donatorWallets as KeyedMockChainParty[])[donateCount]],
            },
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
        const failureBuilder = new FailureTxBuilder()
          .setActiveRaffle(activeRaffle)
          .setRaffleDetails(raffleDetails)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.FEE);

        const failureTx = boxFactory.chain.executeAndReturnOutputs(
          failureBuilder.build(),
        );
        expect(failureTx.success).true;

        // Step 7: Returning two gifts of the first winner
        let giftRedeem = failureTx.outputs[0];
        for (let i = 0; i < 2; i++) {
          const giftGiverErgoTree = (giftGiverWallets as KeyedMockChainParty[])[
            i
          ].ergoTree;

          const giftReturnBuilder = new GiftReturnTxBuilder()
            .setGiftRedeem(giftRedeem)
            .setWinner(winner1)
            .setGift(winner1Gifts[i])
            .setGiftGiverErgoTree(giftGiverErgoTree)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const giftRedeemTx = boxFactory.chain.executeAndReturnOutputs(
            giftReturnBuilder.build(),
          );
          expect(giftRedeemTx.success).true;
          winner1 = giftRedeemTx.outputs[0];

          const giftSafePayBox = giftRedeemTx.outputs[1];
          const giftSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
            .setSafePay(giftSafePayBox)
            .setReceiverAddress(
              (giftGiverWallets as KeyedMockChainParty[])[i].address.toString(),
            )
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const giftSafeWithdrawTx = boxFactory.chain.executeAndReturnOutputs(
            giftSafeWithdrawBuilder.build(),
          );
          expect(giftSafeWithdrawTx.success).true;
        }

        // Step 8: Winner removal transaction
        for (const winnerBox of [winner1, winnerBoxes[1]]) {
          const winnerRemovalBuilder = new WinnerRemovalTxBuilder()
            .setGiftRedeem(giftRedeem)
            .setWinner(winnerBox)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const winnerRemovalTx = boxFactory.chain.executeAndReturnOutputs(
            winnerRemovalBuilder.build(),
          );
          expect(winnerRemovalTx.success).true;
          giftRedeem = winnerRemovalTx.outputs[0];
        }

        // Step 9: Forward to ticket redeem phase
        const forwardToTicketRedeemBuilder =
          new ForwardToTicketRedeemTxBuilder()
            .setGiftRedeem(giftRedeem)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

        const forwardToTicketRedeemTx =
          boxFactory.chain.executeAndReturnOutputs(
            forwardToTicketRedeemBuilder.build(),
          );
        expect(forwardToTicketRedeemTx.success).true;

        // Step 10: Redeem two tickets to donators
        let ticketRedeem = forwardToTicketRedeemTx.outputs[0];
        for (let i = 0; i < tickets.length; i++) {
          const donatorErgoTree = (donatorWallets as KeyedMockChainParty[])[i]
            .ergoTree;

          const ticketRedeemBuilder = new TicketRedeemTxBuilder()
            .setTicketRedeem(ticketRedeem)
            .setTicket(tickets[i])
            .setDonatorErgoTree(donatorErgoTree)
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const ticketRedeemTx = boxFactory.chain.executeAndReturnOutputs(
            ticketRedeemBuilder.build(),
          );
          ticketRedeem = ticketRedeemTx.outputs[0];
          expect(ticketRedeemTx.success).true;

          const donationSafePayBox = ticketRedeemTx.outputs[1];
          const donationSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
            .setSafePay(donationSafePayBox)
            .setReceiverAddress(
              (donatorWallets as KeyedMockChainParty[])[i].address.toString(),
            )
            .setChainHeight(boxFactory.chain.height)
            .setTxFee(testUtils.FEE);

          const donationSafeWithdrawTx =
            boxFactory.chain.executeAndReturnOutputs(
              donationSafeWithdrawBuilder.build(),
            );
          expect(donationSafeWithdrawTx.success).true;
        }

        // Step 11: Return raffle license to service
        const service = createRaffleTx.outputs[0];
        const returnLicenseBuilder = new ReturnRaffleLicenseTxBuilder()
          .setEndedRaffle(ticketRedeem)
          .setService(service)
          .setChangeErgoTree(ownerErgoTree)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.FEE);

        const returnLicenseTx = boxFactory.chain.executeAndReturnOutputs(
          returnLicenseBuilder.build(),
        );
        expect(returnLicenseTx.success).true;

        const serviceFeeSafePayBox = returnLicenseTx.outputs[1];
        const serviceFeeSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
          .setSafePay(serviceFeeSafePayBox)
          .setReceiverAddress(ownerErgoTree)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.FEE);

        const serviceFeeSafeWithdrawTx =
          boxFactory.chain.executeAndReturnOutputs(
            serviceFeeSafeWithdrawBuilder.build(),
          );
        expect(serviceFeeSafeWithdrawTx.success).true;
      },
    );
  });
});
