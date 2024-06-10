import { it, describe, expect } from 'vitest';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { TransactionBuilder } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import * as testUtils from '../testUtils';


/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create inactiveRaffle input box(by sigmaProp(true) ergoTree)
 *   - create ticketRepo input box
 * @returns vitest customized "it" object
*/
function createInactiveRaffleTest(winnersCount: number = 1) {
    const chain = new MockChain({ height: 1000 });
    const { creator, rosen } = testUtils.createPartners(chain, {
      Creator: testUtils.CREATOR_DEFAULT_BALANCE,
      Rosen: testUtils.ROSEN_DEFAULT_BALANCE,
    });
  
    const ticketRepoInputBox = testUtils.createTicketRepoBoxMock();
    const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
      creator.address.toString(),
      rosen.address.toString(),
      creator.address.toString(),
      BigInt(winnersCount),
      undefined,
      undefined,
      10n,
      undefined,
      1_000_000_000n,
      compile('{sigmaProp(true);}').toHex().toString()
    );

    return it.extend({
      chain: chain,
      rosen: rosen,
      creator: creator,
      ticketRepoInputBox: ticketRepoInputBox,
      inactiveRaffleInputBox: inactiveRaffleInputBox,
      contractsAddresses: testUtils.contractsAddresses
    });
  }
  
  
describe('inactiveRaffle', () => {
    const ticketRepoBy1WinnerTest = createInactiveRaffleTest();
  
    describe('Fail of creating ticket repo', () => {
        /**
         * @target Should fail creating of active raffle by 1 winner with invalid ticket token id
         * @scenario
         * - create three output boxes(by invalid ticket-token in active box)
         * - execute transaction
         * - check execution must raise error
         * @expected
         * - transaction result must throw error
         */
        ticketRepoBy1WinnerTest("Should fail creating of active raffle by 1 winner with invalid ticket token id", ({
            chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
        }) => {
            const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
                creator.address.toString(),
                creator.address.toString(),
                rosen.address.toString(),
                1n
            );
            const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
            const winnersOutputBoxes = testUtils.createWinnersOutputBox(
                1n,
                inactiveRaffleInputBox.boxId.toString()
            );
            const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
            
            // Replace Ticket-Token with another token
            const extraInputBox = mockUTxO({
                value: testUtils.FEE,
                ergoTree: creator.ergoTree,
                assets: [{
                    tokenId: '12'.repeat(32),
                    amount: 1_000_000_000n
                }]
            });
            activeRaffleOutputBox.assets.remove(1);
            activeRaffleOutputBox.assets.add({
                tokenId: '12'.repeat(32),
                amount: 1_000_000_000n - 1n - 1n
            });

            const transaction = new TransactionBuilder(1000)
                .from([
                    inactiveRaffleInputBox,
                    ticketRepoInputBox,
                    extraInputBox
                ])
                .to([
                    activeRaffleOutputBox,
                    raffleDetailsOutputBox,
                    giftTokenRepoOutputBox,
                    ...winnersOutputBoxes
                ])
                .payFee(testUtils.FEE)
                .sendChangeTo(creator.address)
                .build();

            expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
        });

        /**
         * @target Should fail creating of active raffle by 1 winner with invalid number of ticket token
         * @scenario
         * - create three output boxes(by invalid number of ticket token in active box)
         * - execute transaction
         * - check execution must raise error
         * @expected
         * - transaction result must throw error
         */
        ticketRepoBy1WinnerTest("Should fail creating of active raffle by 1 winner with invalid number of ticket token", ({
            chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
        }) => {
            const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
                creator.address.toString(),
                creator.address.toString(),
                rosen.address.toString(),
                1n,
                undefined,
                undefined,
                // Decreasing Ticket-Token number sets in activeRaffleOutputBox
                1_000_000_000n,
                undefined,
                999_999_997n
            );
            const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
            const winnersOutputBoxes = testUtils.createWinnersOutputBox(
                1n,
                inactiveRaffleInputBox.boxId.toString()
            );
            const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

            // Move one extra Ticket-Token to the giftTokenRepoOutputBox
            giftTokenRepoOutputBox.assets.add({
                tokenId: testUtils.TICKET_TOKEN_ID,
                amount: 1n
            });
            
            const transaction = new TransactionBuilder(1000)
                .from([
                    inactiveRaffleInputBox,
                    ticketRepoInputBox
                ])
                .to([
                    activeRaffleOutputBox,
                    raffleDetailsOutputBox,
                    giftTokenRepoOutputBox,
                    ...winnersOutputBoxes
                ])
                .payFee(testUtils.FEE)
                // .sendChangeTo(creator.address)
                .build();

            expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
        });

        /**
         * @target Should fail creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box
         * @scenario
         * - create three output boxes(by invalid ticket-token id in inactive input box)
         * - execute transaction
         * - check execution must raise error
         * @expected
         * - transaction result must throw error
         */
        ticketRepoBy1WinnerTest("Should fail creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box", ({
            chain, rosen, creator, ticketRepoInputBox
        }) => {
            // Replace Ticket-Token id with invalid id
            const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
                creator.address.toString(),
                rosen.address.toString(),
                creator.address.toString(),
                1n,
                undefined,
                undefined,
                10n,
                undefined,
                1_000_000_000n,
                compile('{sigmaProp(true);}').toHex().toString(),
                '1234'.repeat(16)
            );
            const extraInputBox = mockUTxO({
                value: testUtils.FEE,
                ergoTree: creator.ergoTree,
                assets: [{
                    tokenId: '1234'.repeat(16),
                    amount: 1_000_000_000n
                }]
            });

            const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
                creator.address.toString(),
                creator.address.toString(),
                rosen.address.toString(),
                1n
            );
            const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
            const winnersOutputBoxes = testUtils.createWinnersOutputBox(
                1n,
                inactiveRaffleInputBox.boxId.toString()
            );
            const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
            
            const transaction = new TransactionBuilder(1000)
                .from([
                    inactiveRaffleInputBox,
                    ticketRepoInputBox,
                    extraInputBox
                ])
                .to([
                    activeRaffleOutputBox,
                    raffleDetailsOutputBox,
                    giftTokenRepoOutputBox,
                    ...winnersOutputBoxes
                ])
                .payFee(testUtils.FEE)
                .sendChangeTo(creator.address)
                .build();

            expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
        });
    });
});
