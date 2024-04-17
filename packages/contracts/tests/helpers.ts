import { TransactionBuilder, OutputBuilder } from '@fleet-sdk/core'
import { MockChain, KeyedMockChainParty } from '@fleet-sdk/mock-chain';


export function mintRaffleNFT(chain: MockChain, creator: KeyedMockChainParty, height: number) {
    let nftTx = new TransactionBuilder(height)
        .from(creator.utxos)
        .to(
            new OutputBuilder("1500000", creator.address)
            .mintToken({ 
                amount: "1",
                name: "ServiceNft",
                decimals: 0,
                description: "This is a test token minted with Fleet SDK" 
            })
        )
        .sendChangeTo(creator.address)
        .build();
    chain.execute(nftTx, { signers: [creator] });

    return nftTx.outputs[0].assets[0];
}


export function mintLicenseToken(chain: MockChain, creator: KeyedMockChainParty, height: number) {
    let licenseTx = new TransactionBuilder(height)
        .from(creator.utxos)
        .to(
            new OutputBuilder("1500000", creator.address)
            .mintToken({
                amount: "1000000000",
                name: "RaffleLicense",
                decimals: 0,
                description: "This is a test token minted with Fleet SDK" 
            })
        )
        .sendChangeTo(creator.address)
        .build();
    chain.execute(licenseTx, { signers: [creator] });

    return licenseTx.outputs[0].assets[0];
}


export function createServiceBox(chain: MockChain, creator: KeyedMockChainParty, height: number, assets: any[]) {
    let tx = new TransactionBuilder(height)
        .from(creator.utxos)
        .to(
            new OutputBuilder("1500000", creator.address)
            .addTokens(assets)
        )
        .sendChangeTo(creator.address)
        .build();
    chain.execute(tx, { signers: [creator] });

    return tx.outputs[0];
}


export function initServiceContractParty(chain: MockChain, partyTreeHex: string) {
    let serviceContractParty = chain.addParty(
        partyTreeHex,
        "Service Contract"
    );
    serviceContractParty.addUTxOs(
        [
            {
                boxId: "01".repeat(32),
                transactionId: "12ab34cd".repeat(8),
                index: 0,
                ergoTree: "a0ec11".repeat(203),
                creationHeight: 1,
                value: '1500000',
                assets: [
                    {
                        // serviceNft
                        tokenId: "0001".repeat(16),
                        amount: '1'
                    },
                    {
                        // raffleLicense
                        tokenId: "0010".repeat(16),
                        amount: '1000000000'
                    },
                ],
                additionalRegisters: {}
            }
        ]
    );
    return serviceContractParty;
}
