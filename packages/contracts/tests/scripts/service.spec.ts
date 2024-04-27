import { describe, test, expect } from 'vitest';

import { Box } from '@fleet-sdk/core';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { SColl, SLong } from '@fleet-sdk/serializer';
import { TransactionBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';

describe('Service Contract', () => {
  describe('Create raffle', () => {
    test('Create raffle successfuly', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.generateMockedThings(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const initTicketRepoOutputBox = mockUTxO({
        value: 15000000n,
        ergoTree: rosen.ergoTree,
      });
      const contractsAddresses = testUtils.initialServiceContract(
        initTicketRepoOutputBox.ergoTree,
      );
      const serviceBox = testUtils.createServiceBox(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // initialContractsAddresses;
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        initTicketRepoOutputBox.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
      );

      serviceBox.setContextExtension({
        0: SColl(SLong, [200n, 200n, 200n, 200n, 200n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];

      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      const res = chain.execute(transaction, {
        signers: [rosen, creator],
      });

      expect(res).true;
    });
  });
});
