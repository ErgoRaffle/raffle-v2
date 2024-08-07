import { it, describe, expect } from 'vitest';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { Box, TransactionBuilder } from '@fleet-sdk/core';

import * as testUtils from '../../testUtils';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';

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
    const { creator, someone, giftgiver1, giftgiver2, donator1, donator2 } = testUtils.createPartners(chain, {
        Creator: testUtils.CREATOR_DEFAULT_BALANCE,
        Someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
        giftGiver1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
        giftGiver2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
        donator1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
        donator2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
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

    const giftGiverWallets: KeyedMockChainParty[] = [giftgiver1, giftgiver2];
    const donatorWallets: KeyedMockChainParty[] = [donator1, donator2];

    return it.extend({
        chain: chain,
        someoneWallet: someone,
        creator: creator,
        giftGiverWallets: giftGiverWallets as KeyedMockChainParty[],
        donatorWallets: donatorWallets as KeyedMockChainParty[],
        contractsAddresses: contractsAddresses,
        inputBoxes: [serviceBox, ...creator.utxos.toArray()],
    });
};

describe('Raffle', () => {
    const raffleBy2WinnersTest = createRaffleTest(2n, 2_000n);

    describe('Create raffle', () => {
        /*
         */
        raffleBy2WinnersTest(
            'Create an erg-goal raffle by two winners and giving two gifts to one winner and donate to this raffle by two wallets and finally be fail',
            ({
                chain, contractsAddresses, someoneWallet, creator,
                giftGiverWallets, donatorWallets, inputBoxes
            }) => {
                const deadline = BigInt(chain.height + 1000);
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
                    deadline,
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
                    0n,
                    deadline,
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
                    0n,
                    deadline,
                    (contractsAddresses as { [key: string]: string })['winner'],
                );

                const inactiveRaffleTx = new TransactionBuilder(chain.height)
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
                    inactiveRaffleTx,
                    { signers: [creator] },
                );
                // Check execution result
                expect(inactiveRaffleResult.success).true;

                const raffleDetailsUTxO = inactiveRaffleResult.outputs[1];

                // Step 3: execute gift-token receipt contract
                const winnerOutputBoxes = testUtils.createWinnersOutputBox(
                    2n,
                    inactiveRaffleBoxId,
                    ticketTokenId,
                    undefined,
                    0n,
                    deadline,
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
                const addGiftWinnersInputBoxes = []
                for (let step = 1; step <= totalSteps; step++) {
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
                    const giftTokenTx = new TransactionBuilder(chain.height)
                        .from([(winnersInputBoxes as Box[])[step - 1], giftTokenInputBox])
                        .to(outBoxes)
                        .payFee(testUtils.FEE)
                        .build();
                    const giftTokenResult =
                        chain.executeAndReturnOutputs(giftTokenTx);
                    expect(giftTokenResult.success).true;

                    addGiftWinnersInputBoxes.push(giftTokenResult.outputs[0]);

                    if (outBoxes.length > 1)
                        giftTokenInputBox = giftTokenResult.outputs[1];
                }

                // Step 4: execute add gift-token contract
                const giftOutputWinnersBoxes = [
                    testUtils.createWinnersOutputBox(
                        1n,
                        inactiveRaffleBoxId,
                        ticketTokenId,
                        undefined,
                        1n,
                        deadline,
                        (contractsAddresses as { [key: string]: string })['winner'],
                    )[0],
                    testUtils.createWinnersOutputBox(
                        1n,
                        inactiveRaffleBoxId,
                        ticketTokenId,
                        undefined,
                        1n,
                        deadline,
                        (contractsAddresses as { [key: string]: string })['winner'],
                    )[0]
                ];

                const totalGifts = 2;
                const winnersUTxOs = [];
                const giftForWinnersUTxOs = [];
                for (let giftCount = 0; giftCount < totalGifts; giftCount++) {
                    giftOutputWinnersBoxes[giftCount].addTokens({
                        tokenId: giftTokenId,
                        amount: BigInt(2_000 - giftCount - 1),
                    });
                    const giftOutBoxes = [
                        giftOutputWinnersBoxes[giftCount],
                        testUtils.createGiftForWinnerOutputBox(
                            1,
                            giftTokenId,
                            (giftGiverWallets as KeyedMockChainParty[])[giftCount].address.toString(),
                            1_000_000_000n,
                            undefined,
                            // To Do: replace this contract by valid contract
                            (contractsAddresses as { [key: string]: string })['gift']
                        )
                    ];

                    const giftAddTx = new TransactionBuilder(chain.height)
                        .from([
                            addGiftWinnersInputBoxes[giftCount],
                            ...(giftGiverWallets as KeyedMockChainParty[])[giftCount].utxos
                        ])
                        .to(giftOutBoxes)
                        .payFee(testUtils.FEE)
                        .sendChangeTo((giftGiverWallets as KeyedMockChainParty[])[giftCount].address.toString())
                        .build();
                    testUtils.prettyPrintJson([
                        [
                            addGiftWinnersInputBoxes[giftCount],
                            ...(giftGiverWallets as KeyedMockChainParty[])[giftCount].utxos
                        ],
                        giftOutBoxes,
                        [BigInt(chain.height), deadline],
                    ]);
                    const giftAddTxResult = chain.executeAndReturnOutputs(
                        giftAddTx,
                        {
                            signers: [(giftGiverWallets as KeyedMockChainParty[])[giftCount]]
                        }
                    );
                    expect(giftAddTxResult.success).true;

                    winnersUTxOs.push(giftAddTxResult.outputs[0]);
                    giftForWinnersUTxOs.push(giftAddTxResult.outputs[1]);
                }

                // Step 5: Donate twice times by two different donator wallets
                const donateTicketUTxOs = [];
                let activeRaffleUTxO = inactiveRaffleResult.outputs[0];
                for(let donateCount = 0; donateCount < 2; donateCount++) {
                    const donateActiveRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
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
                        1n + BigInt(donateCount),
                        deadline,
                        (contractsAddresses as { [key: string]: string })['activeRaffle'],
                    );
                    const donateTicketOutputBox = testUtils.createDonateTicketOutputBox(
                        (donatorWallets as KeyedMockChainParty[])[donateCount].address.toString(),
                    );
                    const donateTx = new TransactionBuilder(chain.height)
                        .from([
                            activeRaffleUTxO,
                            ...(donatorWallets as KeyedMockChainParty[])[donateCount].utxos
                        ])
                        .to([donateActiveRaffleOutputBox, donateTicketOutputBox])
                        .payFee(testUtils.FEE)
                        .sendChangeTo((donatorWallets as KeyedMockChainParty[])[donateCount])
                        .build();
                    const donateTxResult = chain.executeAndReturnOutputs(donateTx, { signers: [(donatorWallets as KeyedMockChainParty[])[donateCount]] });
                    expect(donateTxResult.success).true;

                    activeRaffleUTxO = donateTxResult.outputs[0];
                    donateTicketUTxOs.push(donateTxResult.outputs[1]);
                }

                /*
                ============================
                =                          =
                =     Failure scenario     =
                =                          =
                ============================
                */
                // Step 6: Failure transaction
                const giftRedeemOutputBox = testUtils.createGiftRedeemOutputBox(
                    1_000_000_000n,
                    2n,
                    1_000_000_000n,
                    2n,
                    2n,
                    ticketTokenId!,
                    1_000_000_000n - 2n,
                    (contractsAddresses as { [key: string]: string })['giftRedeem']
                );
                const failureTx = new TransactionBuilder(chain.height)
                    .from([activeRaffleUTxO, raffleDetailsUTxO])
                    .to([giftRedeemOutputBox])
                    .payFee(testUtils.FEE)
                    .build();
                const failureTxResult = chain.executeAndReturnOutputs(failureTx);
                expect(failureTxResult.success).true;

                const giftRedeemUTxO = failureTxResult.outputs[0];
                // Step 7: Return gifts transaction
                const winnerRedeemOutputBoxes = testUtils.createWinnersOutputBox(
                    2n,
                    inactiveRaffleBoxId,
                    ticketTokenId,
                    undefined,
                    1n,
                    deadline,
                    (contractsAddresses as { [key: string]: string })['winner'],
                );
                for(let winnersIndex = 0; winnersIndex < 2; winnersIndex++) {
                    const giftReturnTx = new TransactionBuilder(chain.height)
                        .from([...winnersUTxOs, ...giftForWinnersUTxOs])
                        .to([winnerRedeemOutputBoxes[winnersIndex]])
                        .withDataFrom([giftRedeemUTxO])
                        .build();
                    const giftReturnResult = chain.executeAndReturnOutputs(giftReturnTx);
                    expect(giftReturnResult.success).true;
                }
            }
        );
    });
});
