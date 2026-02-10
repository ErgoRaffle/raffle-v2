import pluginJs from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import vitestPlugin from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import pluginCheckFile from 'eslint-plugin-check-file';
import globals from 'globals';


export default [
  {
    // General Ignore Patterns
    ignores: ['**/dist/**', '**/node_modules/**', 'packages/try/**']
  },
  pluginJs.configs.recommended,
  {
    files: ['services/**/*.{js,mjs,jsx,ts,tsx}', 'packages/**/*.{js,mjs,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...vitestPlugin.environments.env.globals,
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'check-file': pluginCheckFile,
      vitest: vitestPlugin,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...vitestPlugin.configs.recommended.rules,
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/!(*-migration).{js,ts,jsx,tsx}': 'CAMEL_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
    }
  },
  // Integrate Prettier for Formatting
  prettier,
];
