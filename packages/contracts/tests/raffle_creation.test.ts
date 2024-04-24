import { test } from 'vitest'
import { blake2b256 } from '@fleet-sdk/crypto'

import { Box, ErgoUnsignedInput, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core'
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain'
import {
    SSigmaProp,
    SColl,
    SBigInt,
    SConstant,
    SByte,
    SLong,
    SGroupElement,
} from '@fleet-sdk/serializer'
import {
    TransactionBuilder,
    OutputBuilder
} from '@fleet-sdk/core'

import * as helpers from './helpers.js';
import { compileAll, defaultScriptsVariables, ContextVarsType } from '../lib/utils.js'


const FEE = 15000000n


test('Create raffle successfuly', () => {
    // Mock Required Things
    let chain = new MockChain({height: 1000});
    let creator = chain.newParty('Creator');
    creator.addBalance({ nanoergs: 10_000_000_000n });
    let rosen = chain.newParty('Rosen');
    rosen.addBalance({ nanoergs: 100_000_000_000n });

    let raffleNFTToken = {
        amount: 1n,
        tokenId: helpers.RAFFLE_NFT_ID
    }
    let licenseToken = {
        amount: 1000000000n,
        tokenId: helpers.LICENSE_TOKEN_ID
    }

    let scriptsVars = { ...defaultScriptsVariables };
    scriptsVars['service'] = {
        "OWNER_NFT_B64": "",
        "INACTIVE_RAFFLE_SCRIPT_HASH_B64": rosen.key.address.toString(),
        "TICKET_REPO_SCRIPT_HASH_B64": rosen.key.address.toString(),
        "FEE": 15000000n,
        "MIN_BOX_VALUE": SAFE_MIN_BOX_VALUE
    };
    const initialContractsAddresses = compileAll(
        new Map(Object.entries(scriptsVars)) as ContextVarsType, true
    );

    let initTicketRepoOutputBox = mockUTxO({
        value: 15000000n,
        ergoTree: rosen.ergoTree
    });

    scriptsVars = { ...defaultScriptsVariables };
    scriptsVars['service'] = {
        "OWNER_NFT_B64": "",
        "INACTIVE_RAFFLE_SCRIPT_HASH_B64": Buffer.from(blake2b256(initTicketRepoOutputBox.ergoTree)).toString('base64'),
        "TICKET_REPO_SCRIPT_HASH_B64": Buffer.from(blake2b256(initTicketRepoOutputBox.ergoTree)).toString('base64'),
        "FEE": 15000000n,
        "MIN_BOX_VALUE": SAFE_MIN_BOX_VALUE
    };
    const secondContractsAddresses = compileAll(
        new Map(Object.entries(scriptsVars)) as ContextVarsType, true
    );

    let serviceBox: ErgoUnsignedInput = new ErgoUnsignedInput(mockUTxO({
        ergoTree: secondContractsAddresses['service'],
        value: 11000000n,
        creationHeight: 4,
        assets: [raffleNFTToken, licenseToken],
        additionalRegisters: {
            R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
            R5: SColl(
                SColl(SByte),
                [
                    Array.from(
                        Buffer.from(
                            rosen.key.address.toString()
                        )
                    )
                ]
            ).toHex()
        }
    }));

    // initialContractsAddresses;
    const serviceContractParty = helpers.initServiceContractParty(chain, serviceBox.ergoTree);

    let serviceOuputBox = new OutputBuilder('15000000', serviceContractParty.address.ergoTree)
        .addTokens([
            raffleNFTToken,
            {
                amount: 999999999n,
                tokenId: helpers.LICENSE_TOKEN_ID
            }
        ])
        .setAdditionalRegisters({
            R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
            R5: SColl(
                SColl(SByte),
                [
                    Array.from(
                        Buffer.from(
                            rosen.key.address.toString()
                        )
                    )
                ]
            ).toHex()
        });

    let ticketRepoOutputBox = new OutputBuilder(
        15000000n,
        initTicketRepoOutputBox.ergoTree
    ).mintToken({
        amount: 1000000000n,
        name: "TiketRepoToken",
        decimals: 0
    });

    console.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ${serviceBox.boxId}`);

    let inactiveRaffleOutputBox = new OutputBuilder(
        (
            (5n * (FEE + SAFE_MIN_BOX_VALUE)) + (((2n * FEE) + SAFE_MIN_BOX_VALUE) + 1_000_000_000n)
        ).toString(),
        rosen.key.address.toString())
        .addTokens([
            {
                // raffleLicense
                tokenId: helpers.LICENSE_TOKEN_ID,
                amount: '1'
            }
        ])
        .setAdditionalRegisters({
            R4: SColl(
                SLong,
                [
                    70n,   // CharityPercentage,
                    10n,   // ServiceFeePercent,
                    0n,    // ImplementerFeePercent,
                    10n,   // TicketPrice,
                    1000n, // Goal,
                    0n,    // DeadlineTimestamp,
                    0n,    // TotalSoldTicket,
                    5n,    // WinnersCount,
                    1_000_000_000n,   // CreationFee
                ]
            ),
            R5: SColl(
                SColl(SByte),
                [
                    Array.from(Buffer.from(rosen.address.toString())),
                    Array.from(Buffer.from("")),
                    Array.from(Buffer.from(creator.address.toString()))
                ]
            ),
            R6: SColl(
                SColl(SByte),
                 [
                    Array.from(Buffer.from("Test")),
                    Array.from(Buffer.from("Some descriptions..."))
                ]
            ),
            R7: SColl(
                SColl(SByte),
                [
                    Array.from(Buffer.from(serviceBox.boxId, 'hex')),
                    Array.from(
                        // blake2b256(SColl(SLong, [200n, 200n, 200n, 200n, 200n]).toBytes())
                        blake2b256(Buffer.concat([
                            200n,
                            200n,
                            200n,
                            200n,
                            200n,
                        ].map(n => helpers.bigIntToUint8Array(n))))
                    )
                ]
            ).toHex()
        });

    console.log(
        `+-----------+++> ${Buffer.from(serviceBox.boxId, 'hex')} <> ${Buffer.from(serviceBox.boxId)}`
    );

    serviceBox.setContextExtension({
        0: SColl(
            SLong,
            [
                200n,
                200n,
                200n,
                200n,
                200n
            ]
        )
    });
    let inputBoxes: Box<bigint>[] = [ serviceBox, ...creator.utxos.toArray() ];

    console.log(`+++++++++++++++++++++++++> ${creator.utxos.toArray()[0].boxId}`)

    console.log(`3 >>>>>>>>>>>>>>>>>>>>>>>>> V`);
    let _out3: any[] = []
    inputBoxes.forEach(element => {
        let el_: {amount: string, tokens: any[], registers: object} = {
            "amount": element.value.toString(),
            "tokens": [],
            'registers': {
                "R4": element.additionalRegisters['R4'],
                "R5": element.additionalRegisters['R5'],
                "R6": element.additionalRegisters['R6'],
                "R7": element.additionalRegisters['R7'],
                "R8": element.additionalRegisters['R8'],
                "R9": element.additionalRegisters['R9']
            }
        };
        element.assets.forEach(asset => {
            el_["tokens"].push({
                "id": asset.tokenId.toString(),
                "amount": asset.amount.toString()
            });
        });
        _out3.push(el_);
    });
    console.log(_out3);
    console.log(`4 >>>>>>>>>>>>>>>>>>>>>>>>> V`);
    let _out4: any[] = []
    const _ = [
        serviceOuputBox,
        ticketRepoOutputBox,
        inactiveRaffleOutputBox
    ].forEach(element => {
        let el_: {amount: string, tokens: any[], registers: object} = {
            "amount": element.value.toString(),
            "tokens": [],
            "registers": {}
        };
        Array.from(element.assets).forEach(asset => {
            el_["tokens"].push({
                "id": (asset.tokenId || "").toString(),
                "amount": asset.amount.toString()
            });
            el_["registers"] = {
                "R4": element.additionalRegisters['R4'],
                "R5": element.additionalRegisters['R5'],
                "R6": element.additionalRegisters['R6'],
                "R7": element.additionalRegisters['R7'],
                "R8": element.additionalRegisters['R8'],
                "R9": element.additionalRegisters['R9']
            };
        });
        _out4.push(el_);
    });
    console.log(_out4);

    const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        // .from(rosen.utxos)
        .to([
            serviceOuputBox,
            ticketRepoOutputBox,
            inactiveRaffleOutputBox
        ])
        .payMinFee()
        .sendChangeTo(creator.address)
        .build();

    let res = chain.execute(
        transaction,
        {
            signers: [rosen, creator]
        }
    );
});
