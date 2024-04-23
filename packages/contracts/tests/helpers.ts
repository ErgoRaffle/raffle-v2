import { TransactionBuilder, OutputBuilder, TokenAmount, Amount } from '@fleet-sdk/core'
import { MockChain, KeyedMockChainParty } from '@fleet-sdk/mock-chain';


export const RAFFLE_NFT_ID = '1'.repeat(64)
export const LICENSE_TOKEN_ID = '2'.repeat(64)
// export const TIKET_REPO_TOKEN_ID = '3'.repeat(64)


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
                        tokenId: RAFFLE_NFT_ID,
                        amount: '1'
                    },
                    {
                        // raffleLicense
                        tokenId: LICENSE_TOKEN_ID,
                        amount: '1000000000'
                    },
                ],
                additionalRegisters: {}
            }
        ]
    );
    return serviceContractParty;
}
