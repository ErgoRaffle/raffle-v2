import { it, describe, expect } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { SColl, SLong } from '@fleet-sdk/serializer';
import { TransactionBuilder, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import { X_TOKEN_ID, CREATOR_DEFAULT_BALANCE, ROSEN_DEFAULT_BALANCE } from '../testUtils';


/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create inactiveRaffle input box
 *   - create ticketRepo input box
 * @returns vitest customized "it" object
*/
function createInactiveRaffleTest() {
  const chain_ = new MockChain({ height: 1000 });
  const { creator, rosen } = testUtils.createPartners(chain_, {
    Creator: CREATOR_DEFAULT_BALANCE,
    Rosen: ROSEN_DEFAULT_BALANCE,
  });
  // Created input service-box
  const service1WinnerInputBox = testUtils.createServiceBoxMock();
  testUtils.createServiceOutputBox(1_000_000_000n)
  service1WinnerInputBox.setContextExtension({ 0: SColl(SLong, [1000n]) });
  const service5WinnerInputBox = testUtils.createServiceBoxMock();
  service5WinnerInputBox.setContextExtension({ 0: SColl(SLong, [200n, 200n, 200n, 200n, 200n]) });

  creator.addBalance({ tokens: [
    { tokenId: X_TOKEN_ID, amount: 100n },
    { tokenId: service1WinnerInputBox.boxId, amount: 1_000_000_000n }
  ] });

  const ticketRepoInputBox = testUtils.createTicketRepoBoxMock();
  const inactiveRaffle1WinnerInputBox = testUtils.createInactiveRaffleBoxMock(
    rosen.address.toString(),
    creator.address.toString(),
    service1WinnerInputBox.boxId,
    1n
  );
  const inactiveRaffle5WinnerInputBox = testUtils.createInactiveRaffleBoxMock(
    rosen.address.toString(),
    creator.address.toString(),
    service1WinnerInputBox.boxId,
    1n
  );

  const activeRaffle1WinnerInputBox = testUtils.createActiveRaffleBoxMock(
    creator.address.toString(),
    1n
  );
  const raffleDetails1WinnerInputBox = testUtils.createRaffleDetailsBoxMock(service1WinnerInputBox.boxId);
  const giftTokenRepo1WinnerInputBox = testUtils.createGiftTokenRepoBoxMock(1_000, 1);

  return it.extend({
    chain: chain_,
    rosen: rosen,
    creator: creator,
    service1WinnerInputBox: service1WinnerInputBox,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffle1WinnerInputBox: inactiveRaffle1WinnerInputBox,
    inactiveRaffle5WinnerInputBox: inactiveRaffle5WinnerInputBox,
    activeRaffle1WinnerInputBox: activeRaffle1WinnerInputBox,
    raffleDetails1WinnerInputBox: raffleDetails1WinnerInputBox,
    giftTokenRepo1WinnerInputBox: giftTokenRepo1WinnerInputBox
  });
}


describe('Service', () => {
  const inactiveRaffleTest = createInactiveRaffleTest();

  describe('Create active raffle', () => {
    inactiveRaffleTest("Create active raffle", ({
        chain, rosen, creator, service1WinnerInputBox, ticketRepoInputBox,
        inactiveRaffle1WinnerInputBox, activeRaffle1WinnerInputBox,
        raffleDetails1WinnerInputBox, giftTokenRepo1WinnerInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        inactiveRaffle1WinnerInputBox,
        service1WinnerInputBox.boxId.toString()
      );
      activeRaffleOutputBox.setValue(
        inactiveRaffle1WinnerInputBox.value - (1n * (testUtils.FEE + SAFE_MIN_BOX_VALUE))
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(service1WinnerInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1_000, 1);
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffle1WinnerInputBox,
          ticketRepoInputBox,
          activeRaffle1WinnerInputBox,
          raffleDetails1WinnerInputBox,
          giftTokenRepo1WinnerInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(1n)
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();
      try {
        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      } catch(err) {
        console.log('Error')
      }
    });
  });
});
