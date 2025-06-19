import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

/**
 * Advanced Jest configuration for ALECS MCP Server
 * Provides comprehensive testing with TypeScript support
 */
const config: Config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Enable verbose output for better debugging
  verbose: true,
  
  // Test categorization patterns
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'type',
      testMatch: ['<rootDir>/__tests__/type/**/*.test.ts'],
      testEnvironment: 'node',
    },
  ],
  
  // Root directory
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.spec.ts',
  ],
  
  // Setup files
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.afterEnv.ts'],
  
  // Module name mapping for TypeScript paths
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  
  // Transform settings
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          ...compilerOptions,
          // Ensure strict type checking in tests
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true,
          strictBindCallApply: true,
          strictPropertyInitialization: true,
          noImplicitThis: true,
          alwaysStrict: true,
        },
      },
    ],
  },
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.type.test.ts',
    '!src/__tests__/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['json', 'lcov', 'text', 'html', 'json-summary'],
  
  // Performance optimizations
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  
  // Test timeout
  testTimeout: 30000,
  
  // Global test settings
  globals: {
    'ts-jest': {
      isolatedModules: false,
      diagnostics: {
        warnOnly: false,
      },
    },
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.d\\.ts$',
  ],
  
  // Watch plugins for better development experience
  watchPlugins: [
    // 'jest-watch-typeahead/filename',
    // 'jest-watch-typeahead/testname',
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot settings
  snapshotSerializers: ['<rootDir>/__tests__/utils/serializers/akamai-response.serializer.ts'],
  
  // Custom reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};

// For backward compatibility, also match tests in __tests__ directory
const defaultConfig: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@tools/(.*)$': '<rootDir>/src/tools/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@agents/(.*)$': '<rootDir>/src/agents/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testTimeout: 30000,
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ]
};

export default defaultConfig;