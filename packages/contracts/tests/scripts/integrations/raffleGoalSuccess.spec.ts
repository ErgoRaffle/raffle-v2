// import { it, describe, expect } from 'vitest';
// import { MockChain } from '@fleet-sdk/mock-chain';
// import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
// import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

// import * as testUtils from '../testUtils';
// import { createPartners, createServiceBoxMock, X_TOKEN_ID, CREATOR_DEFAULT_BALANCE, ROSEN_DEFAULT_BALANCE } from '../testUtils';

// /*
//  * create fixtures that contains below steps data:
//  *   - mock chain and partners
//  *   - compile contracts
//  *   - create service input box
//  * @returns vitest customized "it" object
// */
// const createRaffleTest = (winnersCount: bigint = 1n) => {
//   const chain_ = new MockChain({ height: 1000 });
//   const { creator, rosen } = createPartners(chain_, {
//     Creator: CREATOR_DEFAULT_BALANCE,
//     Rosen: ROSEN_DEFAULT_BALANCE,
//   });
//   creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });
//   // Created input service-box
//   const serviceBox = createServiceBoxMock(creator.address.toString());
//   const winnersPercent = [];
//   for(let i = 0; i < winnersCount; i++)
//     winnersPercent.push(1000n / winnersCount);
//   serviceBox.setContextExtension({
//     0: SColl(SLong, winnersPercent),
//     1: SColl(SColl(SByte), [
//       Array.from(Buffer.from(rosen.address.toString())),
//       Array.from(Buffer.from(creator.address.toString()))
//     ])
//    });

//   return it.extend({
//     chain: chain_,
//     rosen: rosen,
//     creator: creator,
//     inputBoxes: [serviceBox, ...creator.utxos.toArray()],
//   });
// }

// describe('Raffle', () => {
//   const raffleServiceTest = createRaffleTest();
//   const raffleServiceBy10WinnersTest = createRaffleTest(10n);

//   describe('Create raffle', () => {});
// });
