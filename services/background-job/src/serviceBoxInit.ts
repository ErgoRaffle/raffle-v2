import { Network } from '@fleet-sdk/common';
import { TransactionBuilder } from '@fleet-sdk/core';
import { serializeTransaction } from '@fleet-sdk/serializer';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { ServiceBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { FleetBoxSelection } from '@ergo-raffle/fleet-box-selection';

import { configs } from './config';
import ErgoNodeNetwork from './network/ergoNodeNetwork';
import { signTransaction } from './transactions/utils';

const DEFAULT_SERVICE_FEE_PERCENT = 30n;
const DEFAULT_IMPLEMENTER_FEE_PERCENT = 20n;
const DEFAULT_CREATION_FEE = 500_000_000n;
const LICENSE_TOKEN_AMOUNT = 1000000n;
const SERVICE_DEFAULT_VALUE = 100000000n;

/**
 * Builds and submits a service box initialization transaction.
 * @param logger - Logger instance for initialization flow.
 * @returns Promise resolving when initialization flow ends.
 */
export const serviceBoxInit = async (logger: AbstractLogger): Promise<void> => {
  const network = new ErgoNodeNetwork(configs.scanner.node.url, logger);
  const ownerKey = await ErgoHDKey.fromMnemonic(configs.init.mnemonic!);
  const ownerAddress = ownerKey.address.toString(Network.Testnet);
  const ownerErgoTree = ownerKey.address.ergoTree;

  logger.debug(`Looking for covering boxes for owner address: ${ownerAddress}`);
  const feeBoxIterator =
    await network.unspentBoxesByAddressIterator(ownerAddress);
  const boxSelector = new FleetBoxSelection();
  const selectedBox = await boxSelector.getCoveringBoxes(
    {
      nativeToken: SERVICE_DEFAULT_VALUE + configs.ergo.fee,
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
    `Selected boxes from owner address: ${ownerAddress}: ${selectedBox.boxes?.map((box) => box.boxId)}`,
  );

  if (!selectedBox.covered) {
    throw new Error(
      'Selected box does not cover the required assets, uncovered assets: ' +
        JsonBigInt.stringify(selectedBox.uncoveredAssets),
    );
  }

  const chainHeight = await network.getHeight();
  const serviceOutput = new ServiceBuilder()
    .setOwnerAddress(ownerAddress)
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

  const signedTx = await signTransaction(network, unsignedTx, [ownerKey]);
  logger.debug(
    `Signed init service box transaction: ${JsonBigInt.stringify(signedTx)}`,
  );
  const txBytes = Buffer.from(
    serializeTransaction(signedTx).toBytes(),
  ).toString('hex');
  await network.submitTransaction(txBytes);

  logger.info(
    `Service box init transaction submitted (txId: [${signedTx.id}])`,
  );
};
