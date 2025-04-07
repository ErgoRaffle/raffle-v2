import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      all: true,
      provider: 'istanbul',
      reporter: 'cobertura',
    },
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: true,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
