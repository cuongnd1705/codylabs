import eslintJS from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import pluginJest from 'eslint-plugin-jest';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import eslintTS from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules/*', '**/node_modules', 'dist/**/*', '**/dist', 'logs/**/*', '.turbo', '**/.turbo'],
  },
  eslintJS.configs.recommended,
  ...eslintTS.configs.recommended,
  ...eslintTS.configs.stylistic,
  {
    files: ['packages/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': pluginSimpleImportSort,
      import: pluginImport,
      'import/parsers': tsParser,
      'unused-imports': pluginUnusedImports,
      unicorn: pluginUnicorn,
    },
    rules: {
      ...pluginImport.configs.typescript.rules,
      'import/export': 'error',
      'import/no-duplicates': 'warn',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'security/detect-object-injection': 'off',
      'no-bitwise': 'off',
      'no-empty-function': 'off',
      'no-irregular-whitespace': 'off',
      'no-nested-ternary': 'warn',
      'no-shadow': 'off',
      'no-duplicate-imports': 'error',
      'no-unneeded-ternary': 'error',
      'no-console': 'warn',
      'prefer-object-spread': 'error',
      'no-useless-escape': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['packages/**/*.{spec,test}.ts'],
    plugins: {
      jest: pluginJest,
    },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
  pluginPrettierRecommended,
];
