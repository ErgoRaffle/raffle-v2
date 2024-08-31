import { it, describe, expect } from 'vitest';

import * as testUtils from '../../testUtils';
import {
  executeCreateRaffleTx,
  executeDonateTx,
  executeFailureTx,
  executeMergeTx,
  executeForwardToTicketRedeemTx,
  executeTicketRedeemTx,
  executeReturnRaffleLicenseTx,
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
  const { creator, implementer, donator1, donator2 } =
    testUtils.createPartners(chain, {
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
  const serviceBox = testUtils.createServiceBoxMock(
    creator.address.toString(),
    testUtils.LICENSE_TOKEN_COUNT,
    10n,
    10n,
    1_000_000_000n,
  );

  const donatorWallets: KeyedMockChainParty[] = [donator1, donator2];

  return it.extend({
    chain: chain,
    creator: creator,
    serviceBox: serviceBox,
    implementerAddress: implementer.address.toString(),
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
        chain,
        creator,
        serviceBox,
        implementerAddress,
        donatorWallets,
      }) => {
        chain.setTip(100);
        const winnersCount = 2n;
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
          chain,
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

        // Step 4: Failure transaction
        const failureTx = executeFailureTx(activeRaffle, raffleDetails, chain);
        expect(failureTx.success).true;

        // Step 5: Forward to ticket redeem phase
        const giftRedeem = failureTx.outputs[0];
        const forwardToTicketRedeemTx = executeForwardToTicketRedeemTx(
          giftRedeem,
          chain,
        );
        expect(forwardToTicketRedeemTx.success).true;

        // Step 6: Redeem two tickets to donators
        let ticketRedeem = forwardToTicketRedeemTx.outputs[0];
        for (const ticket of tickets) {
          const ticketRedeemTx = executeTicketRedeemTx(ticketRedeem, ticket, chain);
          ticketRedeem = ticketRedeemTx.outputs[0];
          expect(ticketRedeemTx.success).true;
        }

        // Step 7: Return raffle license to service
        const service = createRaffleTx.outputs[0];
        const returnLicenseTx = executeReturnRaffleLicenseTx(
          ticketRedeem,
          service,
          chain,
        );
        expect(returnLicenseTx.success).true;
      },
    );
  });
});
