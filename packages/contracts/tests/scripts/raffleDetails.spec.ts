import { it, describe, expect } from 'vitest';
import { TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create oracle box
 *   - create raffleDetails & activeRaffle input boxes
 *   - create serviceFee & implementerFee output boxes
 * @returns vitest customized "it" object
 */
const createRaffleDetailsTest = (winnersCount: number = 5) => {
  const totalSuccessSoldTickets = 1000n;
  const ticketPrice = 100_000n;
  const totalRaised = totalSuccessSoldTickets * ticketPrice;
  const goal = totalSuccessSoldTickets * ticketPrice;
  const implementerFeePercent = 100n;
  const serviceFeePercent = 200n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'raffleDetails',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, implementer, someone } = boxFactory.createPartners({
    creator: testUtils.CREATOR_DEFAULT_BALANCE,
    implementer: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100_000_000_000n }],
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.TICKET_TOKEN_ID, amount: 100_000_000_000n }],
  });

  const oracleBox = boxFactory.createMockedOracleUTxO(testUtils.FEE);

  // Created activeRaffle & raffleDetails input boxes
  const activeRaffleBoxForSuccessEnd = boxFactory.createActiveRaffleBoxMock(
    creator.ergoTree,
    implementer.ergoTree,
    creator.ergoTree,
    winnersCount,
    serviceFeePercent,
    undefined,
    1_000_000n,
    1_001_000_000n,
    1_000n,
    totalSuccessSoldTickets,
    goal,
    ticketPrice,
  );

  const raffleDetailsBox = boxFactory.createRaffleDetailsBoxMock(
    testUtils.TICKET_TOKEN_ID,
  );

  const serviceFeeOutputBox = boxFactory.createSafePayOutputBox(
    BigInt((totalRaised * serviceFeePercent) / 1000n) + 2n * testUtils.FEE,
    [],
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
  );
  const implementerFeeOutputBox = boxFactory.createSafePayOutputBox(
    BigInt((totalRaised * implementerFeePercent) / 1000n) + 2n * testUtils.FEE,
    [],
    blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
  );

  boxFactory.chain.setTip(2001);

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    implementer: implementer,
    oracleBox: oracleBox,
    activeRaffleBoxForSuccessEnd: activeRaffleBoxForSuccessEnd,
    raffleDetailsBox: raffleDetailsBox,
    serviceFeeOutputBox: serviceFeeOutputBox,
    implementerFeeOutputBox: implementerFeeOutputBox,
  });
};

describe('raffleDetails', () => {
  const raffleDetailsTest = createRaffleDetailsTest();

  describe('Successful end', () => {
    /**
     * @target should successfully spend in raffle finalize transaction after the deadline
     * @scenario
     * - create successRaffle output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleDetailsTest(
      'should successfully spend in raffle finalize transaction after the deadline',
      ({
        boxFactory,
        creator,
        oracleBox,
        raffleDetailsBox,
        activeRaffleBoxForSuccessEnd,
        implementerFeeOutputBox,
        serviceFeeOutputBox,
      }) => {
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 5;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            serviceFeeOutputBox,
            implementerFeeOutputBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should fail if active raffle doesn't have a proper license token
     * @scenario
     * - create successRaffle output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleDetailsTest(
      "should fail if active raffle doesn't have a proper license token",
      ({
        boxFactory,
        creator,
        implementer,
        oracleBox,
        raffleDetailsBox,
        implementerFeeOutputBox,
        serviceFeeOutputBox,
      }) => {
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 5;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;
        const totalSuccessSoldTickets = 1000n;
        const ticketPrice = 100_000n;
        const goal = totalSuccessSoldTickets * ticketPrice;
        const serviceFeePercent = 200n;

        const activeRaffleBoxForSuccessEnd =
          boxFactory.createActiveRaffleBoxMock(
            creator.ergoTree,
            implementer.ergoTree,
            creator.ergoTree,
            winnersCount,
            serviceFeePercent,
            undefined,
            1_000_000n,
            1_001_000_000n,
            1_000n,
            totalSuccessSoldTickets,
            goal,
            ticketPrice,
            undefined,
            undefined,
            // put invalid license token id
            testUtils.X_TOKEN_ID,
          );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            serviceFeeOutputBox,
            implementerFeeOutputBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if active raffle belongs to a different raffle
     * @scenario
     * - create successRaffle output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleDetailsTest(
      'should fail if active raffle belongs to a different raffle',
      ({
        boxFactory,
        creator,
        implementer,
        oracleBox,
        raffleDetailsBox,
        implementerFeeOutputBox,
        serviceFeeOutputBox,
      }) => {
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 5;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;
        const totalSuccessSoldTickets = 1000n;
        const ticketPrice = 100_000n;
        const goal = totalSuccessSoldTickets * ticketPrice;
        const serviceFeePercent = 200n;

        const activeRaffleBoxForSuccessEnd =
          boxFactory.createActiveRaffleBoxMock(
            creator.ergoTree,
            implementer.ergoTree,
            creator.ergoTree,
            winnersCount,
            serviceFeePercent,
            undefined,
            1_000_000n,
            1_001_000_000n,
            1_000n,
            totalSuccessSoldTickets,
            goal,
            ticketPrice,
            testUtils.X_TOKEN_ID,
            1n,
          );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          testUtils.X_TOKEN_ID,
          // prevent from adding ticket token that located on the raffle-details input box
          // this action not affect on the raffle-details contract execution result
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            serviceFeeOutputBox,
            implementerFeeOutputBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creator.address)
          .burnTokens(raffleDetailsBox.assets[0])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if active raffle didn't meet the deadline
     * @scenario
     * - create successRaffle output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleDetailsTest(
      "should fail if active raffle didn't meet the deadline",
      ({
        boxFactory,
        creator,
        oracleBox,
        raffleDetailsBox,
        activeRaffleBoxForSuccessEnd,
        implementerFeeOutputBox,
        serviceFeeOutputBox,
      }) => {
        boxFactory.chain.setTip(200);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 5;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            serviceFeeOutputBox,
            implementerFeeOutputBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
