// Preserve the API's TypeScript policy while using supported ESLint flat config.
const js = require('@eslint/js');
const plugin = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const globals = require('globals');
const stylisticModule = require('@stylistic/eslint-plugin');
const stylistic = stylisticModule.default ?? stylisticModule;
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
    plugins: { '@typescript-eslint': plugin, '@stylistic': stylistic },
    rules: {
      ...js.configs.recommended.rules,
      ...plugin.configs['eslint-recommended'].overrides[0].rules,
      ...plugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Maintained equivalents; the legacy behavior is frozen in regression fixtures.
      '@stylistic/no-extra-semi': 'error',
      // false preserves the legacy default: smart-tabs remains disabled.
      '@stylistic/no-mixed-spaces-and-tabs': ['error', false],
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
      'no-constant-condition': ['error', { checkLoops: 'all' }],
    },
  },
];
