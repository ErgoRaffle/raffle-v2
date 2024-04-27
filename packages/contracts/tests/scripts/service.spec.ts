import { test } from 'vitest';
import { blake2b256 } from '@fleet-sdk/crypto';

import { Box, ErgoUnsignedInput, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as helpers from '../testUtils';
import {
  compileAll,
  defaultScriptsVariables,
  ContextVarsType,
} from '../../lib/utils';
import { expect } from 'chai';

const FEE = 15000000n;

test('Create raffle successfuly', () => {
  // Mock Required Things
  const chain = new MockChain({ height: 1000 });
  const creator = chain.newParty('Creator');
  creator.addBalance({ nanoergs: 10_000_000_000n });
  const rosen = chain.newParty('Rosen');
  rosen.addBalance({ nanoergs: 100_000_000_000n });

  const raffleNFTToken = {
    amount: 1n,
    tokenId: helpers.RAFFLE_NFT_ID,
  };
  const licenseToken = {
    amount: 1000000000n,
    tokenId: helpers.LICENSE_TOKEN_ID,
  };

  let scriptsVars = { ...defaultScriptsVariables };
  scriptsVars['service'] = {
    OWNER_NFT_B64: '',
    INACTIVE_RAFFLE_SCRIPT_HASH_B64: rosen.key.address.toString(),
    TICKET_REPO_SCRIPT_HASH_B64: rosen.key.address.toString(),
    FEE: 15000000n,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };

  compileAll(new Map(Object.entries(scriptsVars)) as ContextVarsType, true);

  const initTicketRepoOutputBox = mockUTxO({
    value: 15000000n,
    ergoTree: rosen.ergoTree,
  });

  scriptsVars = { ...defaultScriptsVariables };
  scriptsVars['service'] = {
    OWNER_NFT_B64: '',
    INACTIVE_RAFFLE_SCRIPT_HASH_B64: Buffer.from(
      blake2b256(initTicketRepoOutputBox.ergoTree),
    ).toString('base64'),
    TICKET_REPO_SCRIPT_HASH_B64: Buffer.from(
      blake2b256(initTicketRepoOutputBox.ergoTree),
    ).toString('base64'),
    FEE: 15000000n,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  };
  const secondContractsAddresses = compileAll(
    new Map(Object.entries(scriptsVars)) as ContextVarsType,
    true,
  );

  const serviceBox: ErgoUnsignedInput = new ErgoUnsignedInput(
    mockUTxO({
      ergoTree: secondContractsAddresses['service'],
      value: 11000000n,
      creationHeight: 4,
      assets: [raffleNFTToken, licenseToken],
      additionalRegisters: {
        R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from(rosen.key.address.toString())),
        ]).toHex(),
      },
    }),
  );

  // initialContractsAddresses;
  const serviceContractParty = helpers.initServiceContractParty(
    chain,
    serviceBox.ergoTree,
  );

  const serviceOuputBox = new OutputBuilder(
    '15000000',
    serviceContractParty.address.ergoTree,
  )
    .addTokens([
      raffleNFTToken,
      {
        amount: 999999999n,
        tokenId: helpers.LICENSE_TOKEN_ID,
      },
    ])
    .setAdditionalRegisters({
      R4: SColl(SLong, [10n, 0n, 1_000_000_000n]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(rosen.key.address.toString())),
      ]).toHex(),
    });

  const ticketRepoOutputBox = new OutputBuilder(
    15000000n,
    initTicketRepoOutputBox.ergoTree,
  ).mintToken({
    amount: 1000000000n,
    name: 'TiketRepoToken',
    decimals: 0,
  });

  console.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ${serviceBox.boxId}`);

  const inactiveRaffleOutputBox = new OutputBuilder(
    (
      5n * (FEE + SAFE_MIN_BOX_VALUE) +
      (2n * FEE + SAFE_MIN_BOX_VALUE + 1_000_000_000n)
    ).toString(),
    rosen.key.address.toString(),
  )
    .addTokens([
      {
        // raffleLicense
        tokenId: helpers.LICENSE_TOKEN_ID,
        amount: '1',
      },
    ])
    .setAdditionalRegisters({
      R4: SColl(SLong, [
        70n, // CharityPercentage,
        10n, // ServiceFeePercent,
        0n, // ImplementerFeePercent,
        10n, // TicketPrice,
        1000n, // Goal,
        0n, // DeadlineTimestamp,
        0n, // TotalSoldTicket,
        5n, // WinnersCount,
        1_000_000_000n, // CreationFee
      ]),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(rosen.address.toString())),
        Array.from(Buffer.from('')),
        Array.from(Buffer.from(creator.address.toString())),
      ]),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from('Test')),
        Array.from(Buffer.from('Some descriptions...')),
      ]),
      R7: SColl(SColl(SByte), [
        Array.from(Buffer.from(serviceBox.boxId, 'hex')),
        Array.from(
          // blake2b256(SColl(SLong, [200n, 200n, 200n, 200n, 200n]).toBytes())
          blake2b256(
            Buffer.concat(
              [200n, 200n, 200n, 200n, 200n].map((n) =>
                helpers.bigIntToUint8Array(n),
              ),
            ),
          ),
        ),
      ]).toHex(),
    });

  serviceBox.setContextExtension({
    0: SColl(SLong, [200n, 200n, 200n, 200n, 200n]),
  });
  const inputBoxes: Box<bigint>[] = [serviceBox, ...creator.utxos.toArray()];

  const transaction = new TransactionBuilder(chain.height)
    .from(inputBoxes)
    // .from(rosen.utxos)
    .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
    .payMinFee()
    .sendChangeTo(creator.address)
    .build();

  const res = chain.execute(transaction, {
    signers: [rosen, creator],
  });

  expect(res).true;
});
