import { ErgoUnsignedInput } from '@fleet-sdk/core';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SConstant } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import {
  CreationTxBuilder,
  ActivationTxBuilder,
  GiftTokenReceiptTxBuilder,
  AddGiftTxBuilder,
  DonateTxBuilder,
  FeePaymentTxBuilder,
  PrizeCreationTxBuilder,
  GiftUnwrapTxBuilder,
  FinalPrizeTxBuilder,
  ReturnRaffleLicenseTxBuilder,
  SafeWithdrawTxBuilder,
} from '@ergo-raffle/transactions';

import * as testUtils from '../../testUtils';

interface TestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  creationFee: bigint;
  organizer: KeyedMockChainParty;
  serviceBox: ErgoUnsignedInput;
  implementerErgoTree: string;
  ownerErgoTree: string;
  giftGiverWallets: KeyedMockChainParty[];
  donatorWallets: KeyedMockChainParty[];
}

describe('Raffle', () => {
  beforeEach<TestInterface>(async (ctx) => {
    testUtils.TestConstants.overrideBySampleConfigs();
    const boxFactory = new testUtils.RaffleBoxFactory({ height: 1000 });
    const {
      owner,
      organizer,
      implementer,
      giftgiver1,
      giftgiver2,
      donator1,
      donator2,
      donator3,
      donator4,
      donator5,
    } = boxFactory.createPartners({
      owner: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
      organizer: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
      implementer: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      giftGiver1: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      giftGiver2: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator1: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator2: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator3: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator4: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator5: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
    });
    organizer.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });
    donator1.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });
    donator2.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });
    donator3.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });
    donator4.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });
    donator5.addBalance({
      tokens: [
        { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000_000n },
      ],
    });

    // Created input service-box
    const creationFee = testUtils.TestConstants.CREATION_FEE;
    const serviceBox = boxFactory.createServiceBoxMock(
      owner.ergoTree,
      testUtils.TestConstants.LICENSE_TOKEN_COUNT,
      100n,
      100n,
      creationFee,
    );

    const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1, giftgiver2];
    const donatorWallets: KeyedMockChainParty[] = [
      donator1,
      donator2,
      donator3,
      donator4,
      donator5,
    ];

    ctx.boxFactory = boxFactory;
    ctx.creationFee = creationFee;
    ctx.organizer = organizer;
    ctx.serviceBox = serviceBox;
    ctx.implementerErgoTree = implementer.ergoTree;
    ctx.ownerErgoTree = owner.ergoTree;
    ctx.giftGiverWallets = giftGiverWallets as KeyedMockChainParty[];
    ctx.donatorWallets = donatorWallets as KeyedMockChainParty[];
  });

  describe('Create raffle', () => {
    /**
     * @target success token-goal raffle with 3 winners
     * @scenario
     * 1. Raffle creation phase 1 (create inactive raffle and ticketRepo with special collecting token)
     * 2. Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
     * 3. Gift token receipt transaction
     * 4. Add two gifts to one of the winners
     * 5. Donate twice by two different donators
     * 6. Success transaction and fee payment after passing the deadline
     * 7. Create prize-boxes for winners
     * 8. Unwrap two gifts of the first winner
     * 9. Withdraw winners final prize
     * 10. Return raffle license to service
     * @expected
     * - To sign all transactions successfully and complete the scenario
     */
    it<TestInterface>('success token-goal raffle with 2 winners', ({
      boxFactory,
      organizer,
      serviceBox,
      implementerErgoTree,
      ownerErgoTree,
      giftGiverWallets,
      donatorWallets,
    }) => {
      boxFactory.chain.setTip(100);

      const winnersCount = 3;
      const deadline = 2000n;
      const winnersPercent: bigint[] = [999n, 1n, 0n];

      // Step 1: Raffle creation phase 1 (create inactive raffle and ticketRepo)
      const createRaffleBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes(organizer.utxos.toArray())
        .setOrganizerAddress(organizer.address.toString())
        .setImplementerErgoTree(implementerErgoTree)
        .setWinnersCount(winnersCount)
        .setDeadline(deadline)
        .setWinnersPercent(winnersPercent)
        .setTicketPrice(100n)
        .setWinnersSharePercent(200n)
        .setGoal(1000n)
        .setInactiveRaffleValue(
          8n * testUtils.TestConstants.FEE +
            5n * testUtils.TestConstants.FEE * BigInt(winnersCount) +
            testUtils.TestConstants.CREATION_FEE,
        )
        .setRaffleName('Test success token-goal raffle')
        .setRaffleDescription('Test Raffle Description')
        .setTicketTokenCount(100n)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE)
        .setCollectingTokenId(testUtils.TestConstants.X_TOKEN_ID);

      const createRaffleTx = boxFactory.chain.executeAndReturnOutputs(
        createRaffleBuilder.build(),
        { signers: [organizer] },
      );
      expect(createRaffleTx.success).toBeTruthy();

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
        .setTxFee(testUtils.TestConstants.FEE);

      const activationTx = boxFactory.chain.executeAndReturnOutputs(
        activationBuilder.build(),
      );
      expect(activationTx.success).toBeTruthy();

      // Step 3: Gift token receipt transaction (move gift tokens to winner boxes)
      let giftTokenRepo = activationTx.outputs[2];
      const emptyWinnerBoxes = activationTx.outputs.slice(3, 3 + winnersCount);
      const winnerBoxes = [];
      for (const winnerBox of emptyWinnerBoxes) {
        const giftTokenReceiptBuilder = new GiftTokenReceiptTxBuilder()
          .setWinner(winnerBox)
          .setGiftTokenRepo(giftTokenRepo)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const giftTokenReceiptTx = boxFactory.chain.executeAndReturnOutputs(
          giftTokenReceiptBuilder.build(),
        );
        expect(giftTokenReceiptTx.success).toBeTruthy();
        winnerBoxes.push(giftTokenReceiptTx.outputs[0]);
        giftTokenRepo = giftTokenReceiptTx.outputs[1];
      }

      // Step 4: Add two gifts to one of the winners
      let winner1 = winnerBoxes[0];
      const winnersGifts = [];
      for (let i = 0; i < 2; i++) {
        const addGiftBuilder = new AddGiftTxBuilder()
          .setWinner(winner1)
          .setGiftGiverUtxos(
            (giftGiverWallets as KeyedMockChainParty[])[i].utxos.toArray(),
          )
          .setGiftGiverAddress(
            (giftGiverWallets as KeyedMockChainParty[])[i].address.toString(),
          )
          .setGiftValue(10n * testUtils.TestConstants.FEE)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const addGiftTx = boxFactory.chain.executeAndReturnOutputs(
          addGiftBuilder.build(),
          { signers: [(giftGiverWallets as KeyedMockChainParty[])[i]] },
        );
        expect(addGiftTx.success).toBeTruthy();
        winner1 = addGiftTx.outputs[0];
        winnersGifts.push(addGiftTx.outputs[1]);
      }
      winnerBoxes[0] = winner1;

      // Step 5: Donate fifth by five different donators
      let activeRaffle = activationTx.outputs[0];
      const raffleDetails = activationTx.outputs[1];

      const tickets = new testUtils.Tickets();
      const ticketCount = 9n;
      for (let donateCount = 0; donateCount < 5; donateCount++) {
        const donateBuilder = new DonateTxBuilder()
          .setActiveRaffle(activeRaffle)
          .setDonatorUtxos(
            (donatorWallets as KeyedMockChainParty[])[
              donateCount
            ].utxos.toArray(),
          )
          .setDonatorAddress(
            (donatorWallets as KeyedMockChainParty[])[
              donateCount
            ].address.toString(),
          )
          .setDonationTicketCount(ticketCount)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const donateTx = boxFactory.chain.executeAndReturnOutputs(
          donateBuilder.build(),
          {
            signers: [(donatorWallets as KeyedMockChainParty[])[donateCount]],
          },
        );
        expect(donateTx.success).toBeTruthy();
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
      const oracleBox = boxFactory.createMockedOracleUTxO(
        testUtils.TestConstants.FEE,
      );
      const feePaymentBuilder = new FeePaymentTxBuilder()
        .setActiveRaffle(activeRaffle)
        .setRaffleDetails(raffleDetails)
        .setOracleBox(oracleBox)
        .setServiceErgoTree(ownerErgoTree)
        .setImplementerErgoTree(implementerErgoTree)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE);

      const feePaymentTx = boxFactory.chain.executeAndReturnOutputs(
        feePaymentBuilder.build(),
      );
      expect(feePaymentTx.success).toBeTruthy();

      const serviceFeeSafePayBox = feePaymentTx.outputs[1];
      const serviceFeeSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
        .setSafePay(serviceFeeSafePayBox)
        .setReceiverAddress(ownerErgoTree)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE);

      const serviceFeeSafeWithdrawTx = boxFactory.chain.executeAndReturnOutputs(
        serviceFeeSafeWithdrawBuilder.build(),
      );
      expect(serviceFeeSafeWithdrawTx.success).toBeTruthy();

      const implementerFeeSafePayBox = feePaymentTx.outputs[2];
      const implementerFeeSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
        .setSafePay(implementerFeeSafePayBox)
        .setReceiverAddress(implementerErgoTree)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE);

      const implementerFeeSafeWithdrawTx =
        boxFactory.chain.executeAndReturnOutputs(
          implementerFeeSafeWithdrawBuilder.build(),
        );
      expect(implementerFeeSafeWithdrawTx.success).toBeTruthy();

      // Step 7: Create prize-boxes for winners
      let successRaffleBox = feePaymentTx.outputs[0];

      const winnerTicketsList: bigint[] = [];
      const prizeBoxes = [];
      const successRaffleR4 = SConstant.from(
        successRaffleBox.additionalRegisters.R4!,
      ).data as bigint[];
      const totalSoldTickets = successRaffleR4[1];
      for (let i = 0; i < winnersCount; i++) {
        const successRaffleR7 = SConstant.from(
          successRaffleBox.additionalRegisters.R7!,
        ).data as Uint8Array[];
        const newWinnerTicketIndex = testUtils.generateNextWinnerIndex(
          winnerTicketsList,
          i + 1,
          successRaffleR7[0],
          totalSoldTickets,
        );

        const prizeCreationBuilder = new PrizeCreationTxBuilder()
          .setSuccessRaffle(successRaffleBox)
          .setWinner(winnerBoxes[i])
          .setWinnerTicketIndex(newWinnerTicketIndex)
          .setWinnerIndexList(winnerTicketsList)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const prizeCreationTx = boxFactory.chain.executeAndReturnOutputs(
          prizeCreationBuilder.build(),
        );
        winnerTicketsList.push(newWinnerTicketIndex);
        expect(prizeCreationTx.success).toBeTruthy();
        successRaffleBox = prizeCreationTx.outputs[0];
        prizeBoxes.push(prizeCreationTx.outputs[1]);
      }

      // Step 8: Unwrap two gifts of the first winner
      for (let i = 0; i < winnersGifts.length; i++) {
        const prizeBoxR4 = SConstant.from(prizeBoxes[0].additionalRegisters.R4!)
          .data as bigint[];
        const winnerTicket = tickets.selectByWinnerIndex(prizeBoxR4[0]);
        const donatorIndex = Number(prizeBoxR4[0] / ticketCount);
        const winnerAddress = (donatorWallets as KeyedMockChainParty[])[
          donatorIndex
        ].ergoTree;

        const giftUnwrapBuilder = new GiftUnwrapTxBuilder()
          .setWinnerPrize(prizeBoxes[0])
          .setGiftForWinner(winnersGifts[i])
          .setTicket(winnerTicket)
          .setWinnerErgoTree(winnerAddress)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const giftUnwrappedTx = boxFactory.chain.executeAndReturnOutputs(
          giftUnwrapBuilder.build(),
        );
        expect(giftUnwrappedTx.success).toBeTruthy();
        prizeBoxes[0] = giftUnwrappedTx.outputs[0];

        const giftSafePayBox = giftUnwrappedTx.outputs[1];
        const giftSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
          .setSafePay(giftSafePayBox)
          .setReceiverAddress(winnerAddress)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const giftSafeWithdrawTx = boxFactory.chain.executeAndReturnOutputs(
          giftSafeWithdrawBuilder.build(),
        );
        expect(giftSafeWithdrawTx.success).toBeTruthy();
      }

      // Step 9: Withdraw winners final prize
      for (let i = 0; i < prizeBoxes.length; i++) {
        const prizeBoxR4 = SConstant.from(prizeBoxes[i].additionalRegisters.R4!)
          .data as bigint[];
        const winnerTicket = tickets.selectByWinnerIndex(prizeBoxR4[0]);
        const donatorIndex = Number(prizeBoxR4[0] / ticketCount);
        const winnerAddress = (donatorWallets as KeyedMockChainParty[])[
          donatorIndex
        ].ergoTree;

        const finalPrizeBuilder = new FinalPrizeTxBuilder()
          .setWinnerPrize(prizeBoxes[i])
          .setTicket(winnerTicket)
          .setWinnerErgoTree(winnerAddress)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const finalPrizeTx = boxFactory.chain.executeAndReturnOutputs(
          finalPrizeBuilder.build(),
        );
        expect(finalPrizeTx.success).toBeTruthy();

        const prizeSafePayBox = finalPrizeTx.outputs[0];
        const prizeSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
          .setSafePay(prizeSafePayBox)
          .setReceiverAddress(winnerAddress)
          .setChainHeight(boxFactory.chain.height)
          .setTxFee(testUtils.TestConstants.FEE);

        const prizeSafeWithdrawTx = boxFactory.chain.executeAndReturnOutputs(
          prizeSafeWithdrawBuilder.build(),
        );
        expect(prizeSafeWithdrawTx.success).toBeTruthy();
      }

      // Step 10: Return raffle license to service
      const finalServiceBox = createRaffleTx.outputs[0];
      const returnLicenseBuilder = new ReturnRaffleLicenseTxBuilder()
        .setEndedRaffle(successRaffleBox)
        .setService(finalServiceBox)
        .setChangeErgoTree(organizer.ergoTree)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE);

      const returnLicenseTx = boxFactory.chain.executeAndReturnOutputs(
        returnLicenseBuilder.build(),
      );
      expect(returnLicenseTx.success).toBeTruthy();

      const projectSafePayBox = returnLicenseTx.outputs[1];
      const projectSafeWithdrawBuilder = new SafeWithdrawTxBuilder()
        .setSafePay(projectSafePayBox)
        .setReceiverAddress(organizer.ergoTree)
        .setChainHeight(boxFactory.chain.height)
        .setTxFee(testUtils.TestConstants.FEE);

      const projectSafeWithdrawTx = boxFactory.chain.executeAndReturnOutputs(
        projectSafeWithdrawBuilder.build(),
      );
      expect(projectSafeWithdrawTx.success).toBeTruthy();
    });
  });
});
