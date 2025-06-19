// @ts-check

const js = require('@eslint/js');
const typescript = require('typescript-eslint');
const jest = require('eslint-plugin-jest');

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      '*.mjs', 
      '*.cjs',
      '!eslint.config.js',
      'archive/**',
      'scripts/test-examples/**'
    ],
  },

  // Base JavaScript config
  js.configs.recommended,

  // TypeScript config
  ...typescript.configs.recommended,

  // TypeScript files configuration
  {
    files: ['src/**/*.ts', '__tests__/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      // General rules
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all'],
    },
  },

  // Jest test files
  {
    files: ['__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      jest,
    },
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/valid-expect': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];