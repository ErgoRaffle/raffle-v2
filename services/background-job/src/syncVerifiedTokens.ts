import './bootstrap';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

import { TokenAction } from '@ergo-raffle/tokens';

import { configs } from './config';
import dataSource from './dataSource';

/**
 * Syncs verified token ids from config into the token table.
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
      `Synced ${verifiedTokenIds.length} verified token ids from config`,
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
  await syncVerifiedTokens(logger, configs.verifiedTokenIds ?? []);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
