import { it, describe, expect } from 'vitest';
import { SConstant } from '@fleet-sdk/serializer';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

import * as testUtils from '../../testUtils';
import {
  executeCreateRaffleTx,
  executeDonateTx,
  executeFailureTx,
  executeMergeTx,
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
  const { owner, creator, implementer, donator1, donator2 } =
    boxFactory.createPartners({
      owner: testUtils.CREATOR_DEFAULT_BALANCE,
      Creator: testUtils.CREATOR_DEFAULT_BALANCE,
      implementer: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
      donator2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
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

  // Created input service-box
  const serviceBox = boxFactory.createServiceBoxMock(
    owner.address.ergoTree,
    testUtils.LICENSE_TOKEN_COUNT,
    100n,
    100n,
    1_000_000_000n,
  );

  const donatorWallets: KeyedMockChainParty[] = [donator1, donator2];

  return it.extend({
    boxFactory: boxFactory,
    creator: creator,
    serviceBox: serviceBox,
    implementerErgoTree: implementer.address.ergoTree,
    ownerErgoTree: owner.address.ergoTree,
    donatorWallets: donatorWallets as KeyedMockChainParty[],
  });
};

describe('Raffle', () => {
  const raffleTest = createRaffleTest();

  describe('Create raffle', () => {
    /**
     * @target Failed token-goal raffle with 2 winners
     * @scenario
     * 1. Raffle creation phase 1 (create inactive raffle and ticketRepo with special collecting token)
     * 2. Raffle creation phase 2 (merge inactive and ticket repo and create active raffle and winners)
     * 3. Donate twice by two different donators
     * 4. Failure transaction after passing the deadline
     * 5. Forward to ticket redeem phase
     * 6. Redeem two tickets to donators
     * 7. Return raffle license to service
     * @expected
     * - To sign all transactions successfully and complete the scenario
     */
    raffleTest(
      'Failed token-goal raffle with 2 winners',
      ({
        boxFactory,
        creator,
        serviceBox,
        implementerErgoTree,
        donatorWallets,
        ownerErgoTree,
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
          winnersCount,
          deadline,
          winnersPercent,
          boxFactory,
          testUtils.X_TOKEN_ID,
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

        // Step 3: Donate twice by two different donators
        let activeRaffle = mergeTx.outputs[0];
        const tickets = [];
        for (let donateCount = 0; donateCount < 2; donateCount++) {
          const donateTx = executeDonateTx(
            activeRaffle,
            (donatorWallets as KeyedMockChainParty[])[donateCount],
            BigInt(donateCount + 1),
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

        // Step 4: Failure transaction
        const failureTx = executeFailureTx(
          activeRaffle,
          raffleDetails,
          boxFactory,
        );
        expect(failureTx.success).true;

        // Step 5: Forward to ticket redeem phase
        const giftRedeem = failureTx.outputs[0];
        const forwardToTicketRedeemTx = executeForwardToTicketRedeemTx(
          giftRedeem,
          boxFactory,
        );
        expect(forwardToTicketRedeemTx.success).true;

        // Step 6: Redeem two tickets to donators
        let ticketRedeem = forwardToTicketRedeemTx.outputs[0];
        for (const ticket of tickets) {
          const ticketRedeemTx = executeTicketRedeemTx(
            ticketRedeem,
            ticket,
            boxFactory,
          );
          ticketRedeem = ticketRedeemTx.outputs[0];
          expect(ticketRedeemTx.success).true;

          const donatorAddress = Buffer.from(
            SConstant.from(ticket.additionalRegisters.R4!).data as Uint8Array,
          ).toString('hex');
          const donationSafePayBox = ticketRedeemTx.outputs[1];
          const donationSafeWithdrawTx = executeSafeWithdrawTransaction(
            donationSafePayBox,
            donatorAddress,
            boxFactory,
          );
          expect(donationSafeWithdrawTx.success).true;
        }

        // Step 7: Return raffle license to service
        const service = createRaffleTx.outputs[0];
        const returnLicenseTx = executeReturnRaffleLicenseTx(
          ticketRedeem,
          service,
          boxFactory,
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
