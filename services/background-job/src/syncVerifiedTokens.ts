import './bootstrap';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { TokenAction } from '@ergo-raffle/tokens';

import { configs } from './config';
import dataSource from './dataSource';

/**
 * Reads verified token ids from csv file.
 * @param csvPath - Absolute or relative path to token id csv file.
 * @returns A Promise resolving to token ids, one item per non-empty line.
 */
const readVerifiedTokenIdsFromCsv = async (
  csvPath: string,
): Promise<string[]> => {
  const csvContent = await readFile(csvPath, 'utf-8');
  return csvContent
    .split(/,?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

/**
 * Syncs verified token ids into the token table.
 * @param logger - Logger instance for sync execution.
 * @param verifiedTokenIds - Token ids that must be marked as verified.
 * @returns Promise resolving when sync completes.
 */
export const syncVerifiedTokens = async (
  logger: AbstractLogger,
  verifiedTokenIds: string[],
): Promise<void> => {
  await dataSource.initialize();
  await dataSource.runMigrations();

  try {
    const tokenAction = new TokenAction(
      dataSource,
      configs.scanner.node.url,
      logger,
    );
    await tokenAction.syncVerifiedTokens(verifiedTokenIds);
    logger.info(
      `Synced ${verifiedTokenIds.length} verified token ids from csv`,
    );
  } finally {
    await dataSource.destroy();
  }
};

/**
 * Runs the verified token sync script.
 * @returns Promise resolving when script execution finishes.
 */
const run = async (): Promise<void> => {
  const logger = DefaultLogger.getInstance().child('syncVerifiedTokens');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const verifiedTokenIdsCsvPath = path.join(
    __dirname,
    '../config/verifiedTokenIds.csv',
  );
  const verifiedTokenIds = await readVerifiedTokenIdsFromCsv(
    verifiedTokenIdsCsvPath,
  );
  await syncVerifiedTokens(logger, verifiedTokenIds);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
