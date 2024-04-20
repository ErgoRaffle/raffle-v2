import { test } from 'vitest'

import { Box } from '@fleet-sdk/core'
import { MockChain } from '@fleet-sdk/mock-chain'
import {
    SSigmaProp,
    SColl,
    SLong,
    SGroupElement,
} from '@fleet-sdk/serializer'
import {
    TransactionBuilder,
    OutputBuilder
} from '@fleet-sdk/core'

import * as helpers from './helpers.js';
import { compileAll, defaultScriptsVariables, ContextVarsType } from '../lib/utils.js'


test('Create raffle successfuly', () => {
    // Mock Required Things
    let chain = new MockChain({height: 1000});
    let creator = chain.newParty('Creator');
    creator.addBalance({ nanoergs: 10_000_000_000n });
    let rosen = chain.newParty('Rosen');
    rosen.addBalance({ nanoergs: 100_000_000_000n });
    let raffleNFTToken = helpers.mintRaffleNFT(chain, rosen, 2);
    let licenseToken = helpers.mintLicenseToken(chain, rosen, 3);
    let serviceBox = helpers.createServiceBox(chain, rosen, 4, [raffleNFTToken, licenseToken]);
    let scriptsVars = { ...defaultScriptsVariables };
    scriptsVars['service'] = {
        "OWNER_NFT_B64": "",
        "INACTIVE_RAFFLE_SCRIPT_HASH_B64": "",
        "TICKET_REPO_SCRIPT_HASH_B64": "",
        "FEE": 15000000,
        "MIN_BOX_VALUE": 30000000
    };
    const initialContractsAddresses = compileAll(
        new Map(Object.entries(scriptsVars)) as ContextVarsType,
        true
    );

    // initialContractsAddresses;
    const serviceContractParty = helpers.initServiceContractParty(chain, serviceBox.ergoTree);
    console.log(`1 >>>>>>>>>>>>>>>> ${serviceContractParty.ergoTree.toString()}`);

    let serviceOuputBox = new OutputBuilder('15000000', serviceContractParty.address.ergoTree)
        .addTokens([
            {
                // serviceNft
                tokenId: raffleNFTToken.tokenId,
                amount: '1'
            },
            {
                // raffleLicense
                tokenId: licenseToken.tokenId,
                amount: '999999999'
            }
        ])
        .setAdditionalRegisters({
            R4: SColl(SLong, [10n, 0n, 90n]).toHex(),
            R5: SSigmaProp(SGroupElement(creator.key.publicKey)).toHex()
        });
    console.log(`2 >>>>>>>>>>>>>>>>>>>>>>>>> ${serviceContractParty.balance.nanoergs}`);

    let ticketRepoOutputBox = new OutputBuilder('15000000', initialContractsAddresses['ticketRepo'])
        .mintToken({
            amount: "1000000000",
            name: "TiketRepoToken",
            decimals: 0
        });

    let inactiveRaffleOutputBox = new OutputBuilder('15000000', initialContractsAddresses['inactiveRaffle'])
        .addTokens([
            {
                // raffleLicense
                tokenId: licenseToken.tokenId,
                amount: '1'
            }
        ])
        .setAdditionalRegisters({
            R4: SColl(SLong, [10n, 0n, 90n]).toHex(),
            R5: SSigmaProp(SGroupElement(creator.key.publicKey)).toHex()
        });

    let inputBoxes: Box<bigint>[] = [ ...creator.utxos.toArray() ];
    inputBoxes.push(
        serviceBox as Box<bigint>
    );

    const transaction = new TransactionBuilder(chain.height)
    // .from(inputBoxes)
    .from(rosen.utxos)
        .to([
            serviceOuputBox,
            ticketRepoOutputBox,
            inactiveRaffleOutputBox
        ])
        .payMinFee()
        .sendChangeTo(creator.address)
        .build();

    console.log(`3 >>>>>>>>>>>>>>>>>>>>>>>>> ${transaction.outputs[0]}`);

    let res = chain.execute(transaction, { signers: [rosen] });

    console.log(`4 >>>>>>>>>>>>>>>>>>>>>>>>> ${res}`);

    console.log(`5 >>>>>>>>>>>>>>>>>>>>>>>>> ${ticketRepoOutputBox.ergoTree}`);
});
