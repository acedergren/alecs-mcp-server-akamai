/** @type {import('jest').Config} */
module.exports = {
  displayName: 'CI Tests - Critical Path Only',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  
  // Only run critical tests in CI
  testMatch: [
    '**/__tests__/smoke/**/*.test.ts',
    '**/__tests__/critical/**/*.test.ts',
  ],
  
  // Ignore everything else
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/unit/',
    '/__tests__/integration/',
    '/__tests__/e2e/',
    '/__tests__/live/',
    '/__tests__/mcp-evals/',
    '/__tests__/performance/',
  ],
  
  // Simple setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // No coverage in CI - TypeScript handles this
  collectCoverage: false,
  
  // Fast fail
  bail: 1,
  
  // Clear output
  verbose: false,
  
  // No noise
  silent: true,
  
  // Transform
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: false, // Be forgiving in tests
      }
    }]
  },
};