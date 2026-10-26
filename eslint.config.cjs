// Preserve the API's TypeScript policy while using supported ESLint flat config.
const js = require('@eslint/js');
const plugin = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const globals = require('globals');
module.exports = [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser,
      globals: { ...globals.node, ...globals.es2022 },
    },
    plugins: { '@typescript-eslint': plugin },
    rules: {
      ...js.configs.recommended.rules,
      ...plugin.configs['eslint-recommended'].overrides[0].rules,
      ...plugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // These were enabled by the legacy recommended preset. Preserve policy.
      // The two stylistic core rules still work in v10 but need replacement before v11.
      'no-extra-semi': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
      'no-constant-condition': ['error', { checkLoops: 'all' }],
    },
  },
];
