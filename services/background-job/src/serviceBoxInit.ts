import './bootstrap';

import { ErgoAddress, Network, TransactionBuilder } from '@fleet-sdk/core';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { ProverBuilder$ } from 'sigmastate-js/main';

import { ServiceBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { FleetBoxSelection } from '@ergo-raffle/fleet-box-selection';

import { configs } from './config';
import { ErgoNodeNetwork } from '@ergo-raffle/utils';

const DEFAULT_SERVICE_FEE_PERCENT = 30n;
const DEFAULT_IMPLEMENTER_FEE_PERCENT = 20n;
const DEFAULT_CREATION_FEE = 500_000_000n;
const LICENSE_TOKEN_AMOUNT = 1000000n;
const SERVICE_DEFAULT_VALUE = 100000000n;

/**
 * Builds and submits a service box initialization transaction.
 * @param logger - Logger instance for initialization flow.
 * @param ownerAddress - Base58-encoded Ergo address whose UTXOs fund the init transaction.
 * @returns Promise resolving when initialization flow ends.
 */
export const serviceBoxInit = async (
  logger: AbstractLogger,
  ownerAddress: string,
): Promise<void> => {
  const trimmed = ownerAddress.trim();
  if (!trimmed) {
    throw new Error('ownerAddress is required for service box initialization');
  }

  const network = new ErgoNodeNetwork(configs.scanner.node.url, logger);
  const owner = ErgoAddress.fromBase58(trimmed);
  const ownerErgoTree = owner.ergoTree;

  logger.debug(`Looking for covering boxes for owner address: ${owner}`);
  const feeBoxIterator = await network.unspentBoxesByAddressIterator(
    owner.toString(),
  );
  const boxSelector = new FleetBoxSelection();
  const selectedBox = await boxSelector.getCoveringBoxes(
    {
      nativeToken: SERVICE_DEFAULT_VALUE + BigInt(configs.ergo.fee),
      tokens: [
        { id: raffleInfo.tokens.serviceNft, value: 1n },
        { id: raffleInfo.tokens.raffleLicense, value: LICENSE_TOKEN_AMOUNT },
      ],
    },
    [],
    new Map(),
    feeBoxIterator,
  );
  logger.debug(
    `Selected boxes from owner address: ${owner}: ${selectedBox.boxes?.map((box) => box.boxId)}`,
  );

  if (!selectedBox.covered) {
    throw new Error(
      'Selected box does not cover the required assets, uncovered assets: ' +
        JsonBigInt.stringify(selectedBox.uncoveredAssets),
    );
  }

  const chainHeight = await network.getHeight();
  const serviceOutput = new ServiceBuilder()
    .setOwnerAddress(owner.toString())
    .setCreationHeight(chainHeight)
    .setValue(SERVICE_DEFAULT_VALUE)
    .setServiceFeePercent(DEFAULT_SERVICE_FEE_PERCENT)
    .setImplementerFeePercent(DEFAULT_IMPLEMENTER_FEE_PERCENT)
    .setCreationFee(DEFAULT_CREATION_FEE)
    .setTxFee(configs.ergo.fee)
    .setLicenseTokenCount(LICENSE_TOKEN_AMOUNT)
    .build();

  const unsignedTx = new TransactionBuilder(chainHeight)
    .from(selectedBox.boxes)
    .to([serviceOutput])
    .payFee(configs.ergo.fee)
    .sendChangeTo(ownerErgoTree)
    .build();

  logger.info(`Service box init transaction built (txId: [${unsignedTx.id}])`);

  // Reduce the transaction (ready to be signed) and log it.
  const eip12Tx = unsignedTx.toEIP12Object();
  const reducedStateContext = await network.getStateContext();
  const reducedBlockchainParams = await network.getBlockchainParameters();
  const reducedNetwork =
    configs.ergo.network == 'mainnet' ? Network.Mainnet : Network.Testnet;

  const reducedBuilder = ProverBuilder$.create(
    reducedBlockchainParams,
    reducedNetwork,
  );
  const reducedProver = reducedBuilder.build();
  const reducedTx = reducedProver.reduce(
    reducedStateContext,
    eip12Tx,
    eip12Tx.inputs,
    eip12Tx.dataInputs,
    unsignedTx.burning.tokens,
    0,
  );

  logger.info(
    `ergopay: ${Buffer.from(reducedTx.toHex(), 'hex').toString('base64')}`,
  );
};

/**
 * Runs the initialization script.
 * @returns Promise resolving when the initialization script finishes.
 */
const run = async (): Promise<void> => {
  const ownerAddress = process.argv[2]?.trim();
  if (!ownerAddress) {
    console.error('Usage: npm run init -- <owner-address>');
    process.exit(1);
  }

  const logger = DefaultLogger.getInstance().child('serviceBoxInit');
  await serviceBoxInit(logger, ownerAddress);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
