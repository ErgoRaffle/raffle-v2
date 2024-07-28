import { it, describe, expect } from 'vitest';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { Box, TransactionBuilder } from '@fleet-sdk/core';

import * as testUtils from '../../testUtils';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create service input box
 * @returns vitest customized "it" object
 */
const createRaffleTest = (
  winnersCount: bigint = 1n,
  giftTokenCount: bigint = 1n,
) => {
  const chain = new testUtils.RaffleMockChain({ height: 1000 });
  const { creator, someone } = testUtils.createPartners(chain, {
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });

  const contractsAddresses = testUtils.initialContracts({
    inactiveRaffle: {
      GIFT_TOKEN_COUNT: giftTokenCount.toString(),
    },
  });

  // Created input service-box
  const serviceBox = testUtils.createServiceBoxMock(
    creator.address.toString(),
    testUtils.LICENSE_TOKEN_COUNT,
    10n,
    10n,
    1_000_000_000n,
    (contractsAddresses as { [key: string]: string })['service'],
  );
  const winnersPercent: bigint[] = [];
  for (let i = 0; i < winnersCount; i++)
    winnersPercent.push(1000n / winnersCount);
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(someone.address.toString())),
      Array.from(Buffer.from(creator.address.toString())),
    ]),
  });

  return it.extend({
    chain: chain,
    someoneWallet: someone,
    creator: creator,
    contractsAddresses: contractsAddresses,
    serviceParty: chain.addParty(contractsAddresses['service']),
    ticketRepoParty: chain.addParty(contractsAddresses['ticketRepo']),
    inactiveRaffleParty: chain.addParty(contractsAddresses['inactiveRaffle']),
    giftTokenRepoParty: chain.addParty(contractsAddresses['giftTokenRepo']),
    winnersParty: chain.addParty(contractsAddresses['winner']),
    inputBoxes: [serviceBox, ...creator.utxos.toArray()],
  });
};

describe('Raffle', () => {
  const raffleBy2WinnersTest = createRaffleTest(2n, 2_000n);

  describe('Create raffle', () => {
    /*
     */
    raffleBy2WinnersTest(
      'Create an erg-goal raffle by two winners and giving two gifts to one winner and donate to this raffle by two persons and finally be fail',
      ({ chain, contractsAddresses, someoneWallet, creator, inputBoxes }) => {
        // Step 1: Create and execute service transaction
        const serviceOutputBox = testUtils.createServiceOutputBox(
          creator.address.toString(),
          999999999n,
          10n,
          10n,
          1_000_000_000n,
          (contractsAddresses as { [key: string]: string })['service'],
        );
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
          (contractsAddresses as { [key: string]: string })['ticketRepo'],
        );
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          someoneWallet.address.toString(),
          creator.address.toString(),
          2n,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          inputBoxes[0].boxId.toString(),
          (contractsAddresses as { [key: string]: string })['inactiveRaffle'],
        );
        const serviceTx = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();
        const serviceResult = chain.executeAndReturnOutputs(serviceTx, {
          signers: [creator],
        });
        // Check execution result
        expect(serviceResult.success).true;

        // step 2: execute the inactive raffle contract
        const inactiveRaffleInputBox = serviceResult.outputs[2];
        const inactiveRaffleBoxId = inactiveRaffleInputBox.boxId;
        const ticketRepoInputBox = serviceResult.outputs[1];
        const ticketTokenId = ticketRepoInputBox.assets?.at(0)?.tokenId;

        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          2n,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ticketTokenId,
          (contractsAddresses as { [key: string]: string })['activeRaffle'],
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(
          ticketTokenId,
          (contractsAddresses as { [key: string]: string })['raffleDetails'],
        );
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          2_000,
          2,
          ticketTokenId,
          'mint',
          undefined,
          undefined,
          1,
          undefined,
          (contractsAddresses as { [key: string]: string })['giftTokenRepo'],
        );

        const winnersBoxes = testUtils.createWinnersOutputBox(
          2n,
          inactiveRaffleInputBox.boxId.toString(),
          ticketTokenId,
          undefined,
          (contractsAddresses as { [key: string]: string })['winner'],
        );

        const inactiveRaffleTransaction = new TransactionBuilder(chain.height)
          .from([inactiveRaffleInputBox, ticketRepoInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...winnersBoxes,
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const inactiveRaffleResult = chain.executeAndReturnOutputs(
          inactiveRaffleTransaction,
          { signers: [creator] },
        );
        // Check execution result
        expect(inactiveRaffleResult.success).true;

        // Step 3: execute giftToken contract
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          2n,
          inactiveRaffleBoxId,
          ticketTokenId,
          undefined,
          (contractsAddresses as { [key: string]: string })['winner'],
        );

        // Add 2 gift-tokens to the first winner
        let giftTokenInputBox = inactiveRaffleResult.outputs[2];
        const giftTokenId = giftTokenInputBox.assets[0].tokenId;
        const winnersInputBoxes = inactiveRaffleResult.outputs.slice(
          3,
          winnersBoxes.length + 3,
        );
        const totalSteps = 2;
        for (let step = 1; step <= totalSteps; step++) {
          console.log(
            `====================== step(${step}) ======================`,
          );
          winnerOutputBoxes[step - 1].addTokens({
            tokenId: giftTokenId,
            amount: 2_000n,
          });
          const outBoxes = [winnerOutputBoxes[step - 1]];
          if (step < totalSteps)
            outBoxes.push(
              testUtils.createGiftTokenRepoOutputBox(
                2_000,
                2,
                ticketTokenId,
                'add',
                2_000n,
                testUtils.FEE * 1n,
                step + 1,
                giftTokenId,
                (contractsAddresses as { [key: string]: string })[
                  'giftTokenRepo'
                ],
              ),
            );
          testUtils.prettyPrintJson([
            [(winnersInputBoxes as Box[])[step - 1], giftTokenInputBox],
            outBoxes,
          ]);
          const giftTokenTransaction = new TransactionBuilder(chain.height)
            .from([(winnersInputBoxes as Box[])[step - 1], giftTokenInputBox])
            .to(outBoxes)
            .payFee(testUtils.FEE)
            .build();
          const giftTokenResult =
            chain.executeAndReturnOutputs(giftTokenTransaction);
          expect(giftTokenResult.success).true;

          if (outBoxes.length > 1)
            giftTokenInputBox = giftTokenResult.outputs[1];
        }
      },
    );
  });
});
