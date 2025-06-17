/**
 * Jest global setup file
 * Configures the test environment before all tests run
 */

import { TextEncoder, TextDecoder } from 'util';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Polyfill for TextEncoder/TextDecoder if needed
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
    // Keep error for important messages
    console.error = jest.fn((...args) => {
      if (process.env.SHOW_TEST_ERRORS) {
        originalConsole.error(...args);
      }
    });
  }
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);

// Add custom error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in test:', error);
  throw error;
});

// Export test utilities
export { originalConsole };