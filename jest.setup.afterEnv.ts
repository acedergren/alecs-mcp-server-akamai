/**
 * Jest setup file that runs after the test framework has been set up
 * Configures custom matchers and global test utilities
 */

import { expect } from '@jest/globals';
import * as matchers from './__tests__/utils/matchers';
import { mockEdgeGrid } from './__tests__/utils/mocks/edgegrid';

// Add custom matchers
expect.extend(matchers);

// Global test utilities
global.testUtils = {
  mockEdgeGrid,
  
  // Add more utilities as needed
  async withMockedAuth<T>(fn: () => Promise<T>): Promise<T> {
    const mockAuth = mockEdgeGrid();
    try {
      return await fn();
    } finally {
      mockAuth.restore();
    }
  },
  
  // Create test customer configuration
  createTestCustomer(name: string = 'test-customer') {
    return {
      name,
      credentials: {
        host: 'test.akamai.com',
        client_token: 'test-client-token',
        client_secret: 'test-client-secret',
        access_token: 'test-access-token',
        account_switch_key: 'test-account-key',
      },
    };
  },
};

// Extend Jest matchers TypeScript types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAkamaiResponse(): R;
      toBeValidMcpResponse(): R;
      toMatchAkamaiSchema(schema: any): R;
      toHaveValidEdgeGridAuth(): R;
      toBeValidPropertyResponse(): R;
      toBeValidDnsResponse(): R;
      toBeValidActivationResponse(): R;
      toContainRequiredFields(fields: string[]): R;
      toHaveStatusCode(code: number): R;
      toBeValidZodSchema(schema: any): R;
    }
  }
  
  namespace NodeJS {
    interface Global {
      testUtils: {
        mockEdgeGrid: typeof mockEdgeGrid;
        withMockedAuth: <T>(fn: () => Promise<T>) => Promise<T>;
        createTestCustomer: (name?: string) => any;
      };
    }
  }
}

// Custom assertion helpers
export function assertValidAkamaiResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toBeValidAkamaiResponse();
}

export function assertValidMcpResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toBeValidMcpResponse();
  expect(response).toHaveProperty('success');
}

// Test lifecycle helpers
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset module cache for isolated tests
  jest.resetModules();
});

afterEach(() => {
  // Verify no unhandled promises
  if ((global as any).__unhandledPromises?.length > 0) {
    throw new Error(`Unhandled promises detected: ${(global as any).__unhandledPromises}`);
  }
});