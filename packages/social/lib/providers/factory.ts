import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import {
  OfficialMentionsProvider,
  OfficialProviderConfig,
} from './officialProvider';
import {
  ThirdPartyMentionsProvider,
  ThirdPartyProviderConfig,
} from './thirdPartyProvider';
import { XMentionsProvider } from './types';

/**
 * Selects which data source the poller uses. Defaults to `thirdparty` (cheaper, no OAuth);
 * flip to `official` via config to use the first-party X API.
 */
export interface ProviderConfig {
  /** Active provider. Default `thirdparty`. */
  readonly provider: 'official' | 'thirdparty';
  readonly official: OfficialProviderConfig;
  readonly thirdparty: ThirdPartyProviderConfig;
}

/**
 * Build the configured mentions provider. Both implementations satisfy `XMentionsProvider`, so the
 * poller is agnostic to which one runs. Adding a future provider is one new branch here.
 *
 * @param config - provider selection + per-provider credentials
 * @param logger - optional logger passed through to the implementation
 */
export const makeMentionsProvider = (
  config: ProviderConfig,
  logger?: AbstractLogger,
): XMentionsProvider => {
  switch (config.provider) {
    case 'official':
      return new OfficialMentionsProvider(config.official, logger);
    case 'thirdparty':
      return new ThirdPartyMentionsProvider(config.thirdparty, logger);
    default: {
      // Exhaustiveness guard: a new provider value must be handled above.
      const exhaustive: never = config.provider;
      throw new Error(`Unknown social provider: ${exhaustive}`);
    }
  }
};
