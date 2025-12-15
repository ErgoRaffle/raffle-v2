/**
 * Vitest setup for background-job.
 *
 * The codebase validates configs at import-time (see `src/config/index.ts`),
 * and `src/bootstrap.ts` imports configs to initialize logging.
 *
 * For unit tests we provide the missing required config fields via `NODE_CONFIG`
 * to keep tests self-contained and avoid relying on external config files.
 */

process.env.NODE_ENV ??= 'test';

// Merge into `config/default.yml` just enough to satisfy schema validations.
process.env.NODE_CONFIG ??= JSON.stringify({
  scanner: {
    node: {
      initialHeight: 0,
    },
  },
  addresses: {
    serviceFeeAddress: '9fSgUi6Z7kOnxq94voRFuJbDrZfStJn6f2q7oEwj4vJtQp6nR8M',
  },
});

await import('../src/bootstrap');

export {};
