import {
  Box,
  ErgoBox,
  ErgoUnsignedTransaction,
  Network,
} from '@fleet-sdk/core';
import { deserializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoEntity } from '@rosen-bridge/abstract-extractor';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { raffleInfo } from '@ergo-raffle/contracts';
import { ErgoNodeNetwork, signTransaction } from '@ergo-raffle/utils';

import { TxPotService } from '../services/txPotService';
import { BoxValue } from '../types/box';
import { TxType } from '../types/transaction';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * Signs a transaction and adds it to the txpot
 * @param network - The network to use for the transaction.
 * @param tx - The unsigned transaction to sign and add to the txpot
 * @param txType - The type of transaction
 */
export const signAndAddTx = async (
  network: ErgoNodeNetwork,
  tx: ErgoUnsignedTransaction,
  txType: TxType,
) => {
  try {
    logger.debug(
      `Trying to sign ${txType} transaction: ${JsonBigInt.stringify(tx.toEIP12Object())}`,
    );
    const signedTx = await signTransaction(
      network,
      tx,
      [],
      raffleInfo.network === 'Mainnet' ? Network.Mainnet : Network.Testnet,
    );
    await TxPotService.getInstance().addTx(signedTx, txType);
    return signedTx;
  } catch (e) {
    throw new Error(`Failed to sign transaction: ${e}`);
  }
};

/**
 * Converts a list of BoxEntity objects to a list of ErgoBox objects
 * @param dbBoxes - The list of BoxEntity objects to convert
 * @returns The list of ErgoBox objects
 */
export const convertDbBoxesToErgoBoxes = (
  dbBoxes: AbstractErgoEntity[],
): ErgoBox[] => {
  return dbBoxes.map((dbBox) => {
    /**
     * We know that the box is mined because it is stored in the database
     * and we can use Box type instead of BoxCandidate
     */
    const box = deserializeBox(
      Buffer.from(dbBox.serialized, 'base64'),
    ) as Box<bigint>;
    return new ErgoBox(box);
  });
};

/**
 * Calculates the sum of the assets of a list of boxes
 * @param boxes - The list of boxes to calculate the sum of
 * @returns The sum of the assets of the boxes
 */
export const calculateBoxesAssetSum = (boxes: ErgoBox[]): BoxValue => {
  const tokenMap = new Map<string, bigint>();

  // Collect all tokens and sum their amounts
  for (const box of boxes) {
    for (const asset of box.assets) {
      const currentAmount = tokenMap.get(asset.tokenId) || 0n;
      tokenMap.set(asset.tokenId, currentAmount + BigInt(asset.amount));
    }
  }

  return {
    value: boxes.reduce((sum, box) => sum + box.value, 0n),
    tokens: Array.from(tokenMap.entries()).map(([tokenId, amount]) => ({
      tokenId,
      amount,
    })),
  };
};

/**
 * Convert uint8Array to signed bigint
 * @param buffer
 * @returns signed bigint
 */
export const uint8ArrayToSignedBigInt = (buffer: Uint8Array): bigint => {
  const hexStr = Buffer.from(buffer).toString('hex');
  const bigIntValue = BigInt('0x' + hexStr);
  const bitLength = BigInt(hexStr.length * 4); // Each hex digit represents 4 bits
  const maxValue = BigInt(1) << bitLength; // 2^bitLength

  // Check if the number should be negative (if MSB is set)
  if (bigIntValue >= maxValue >> BigInt(1)) {
    return bigIntValue - maxValue;
  }

  return bigIntValue;
};
