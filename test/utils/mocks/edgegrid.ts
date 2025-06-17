/**
 * EdgeGrid authentication mocks for testing
 */

import { jest } from '@jest/globals';

export interface MockEdgeGridOptions {
  defaultCustomer?: string;
  throwOnInvalidCustomer?: boolean;
  customResponses?: Record<string, any>;
}

export interface MockEdgeGridInstance {
  restore: () => void;
  setResponse: (path: string, response: any) => void;
  setError: (path: string, error: Error) => void;
  getCallCount: (path: string) => number;
  getLastCall: (path: string) => any;
  reset: () => void;
}

/**
 * Create a mock EdgeGrid client
 */
export function mockEdgeGrid(options: MockEdgeGridOptions = {}): MockEdgeGridInstance {
  const {
    defaultCustomer = 'test',
    throwOnInvalidCustomer = false,
    customResponses = {},
  } = options;

  const callHistory = new Map<string, any[]>();
  const responses = new Map<string, any>(Object.entries(customResponses));
  const errors = new Map<string, Error>();

  // Mock the EdgeGrid client module
  const mockClient = {
    getInstance: jest.fn((customer: string) => {
      if (throwOnInvalidCustomer && customer !== defaultCustomer) {
        throw new Error(`Invalid customer: ${customer}`);
      }

      return {
        request: jest.fn(async (options: any) => {
          const { path } = options;
          
          // Track call
          if (!callHistory.has(path)) {
            callHistory.set(path, []);
          }
          callHistory.get(path)!.push(options);

          // Check for errors
          if (errors.has(path)) {
            throw errors.get(path);
          }

          // Return response
          if (responses.has(path)) {
            return responses.get(path);
          }

          // Default response
          return { success: true, data: {} };
        }),
        
        get: jest.fn(async (path: string, params?: any) => {
          return mockClient.getInstance(defaultCustomer).request({
            method: 'GET',
            path,
            queryParams: params,
          });
        }),
        
        post: jest.fn(async (path: string, body?: any, params?: any) => {
          return mockClient.getInstance(defaultCustomer).request({
            method: 'POST',
            path,
            body,
            queryParams: params,
          });
        }),
        
        put: jest.fn(async (path: string, body?: any, params?: any) => {
          return mockClient.getInstance(defaultCustomer).request({
            method: 'PUT',
            path,
            body,
            queryParams: params,
          });
        }),
        
        delete: jest.fn(async (path: string, params?: any) => {
          return mockClient.getInstance(defaultCustomer).request({
            method: 'DELETE',
            path,
            queryParams: params,
          });
        }),
      };
    }),
  };

  // Mock the module
  jest.mock('../../src/utils/edgegrid-client', () => ({
    EdgeGridClient: mockClient,
  }));

  return {
    restore: () => {
      jest.unmock('../../src/utils/edgegrid-client');
    },
    
    setResponse: (path: string, response: any) => {
      responses.set(path, response);
    },
    
    setError: (path: string, error: Error) => {
      errors.set(path, error);
    },
    
    getCallCount: (path: string) => {
      return callHistory.get(path)?.length || 0;
    },
    
    getLastCall: (path: string) => {
      const calls = callHistory.get(path);
      return calls ? calls[calls.length - 1] : null;
    },
    
    reset: () => {
      callHistory.clear();
      responses.clear();
      errors.clear();
      mockClient.getInstance.mockClear();
    },
  };
}

/**
 * Create mock authentication headers
 */
export function createMockAuthHeaders(customer: string = 'test'): Record<string, string> {
  return {
    Authorization: `EG1-HMAC-SHA256 client_token=test-token-${customer};access_token=test-access;timestamp=${Date.now()};nonce=test-nonce;signature=test-signature`,
    'Content-Type': 'application/json',
    'X-Request-ID': `test-request-${Date.now()}`,
  };
}

/**
 * Mock customer configuration
 */
export function mockCustomerConfig(customers: string[] = ['test', 'production']) {
  const configs = new Map<string, any>();
  
  customers.forEach(customer => {
    configs.set(customer, {
      host: `${customer}.akamai.com`,
      client_token: `${customer}-client-token`,
      client_secret: `${customer}-client-secret`,
      access_token: `${customer}-access-token`,
      account_switch_key: customer === 'production' ? `${customer}-account-key` : undefined,
    });
  });

  jest.mock('../../src/utils/customer-config', () => ({
    CustomerConfigManager: {
      getInstance: () => ({
        getSection: (name: string) => {
          if (!configs.has(name)) {
            throw new Error(`Section '${name}' not found`);
          }
          return configs.get(name);
        },
        listSections: () => Array.from(configs.keys()),
        hasSection: (name: string) => configs.has(name),
      }),
    },
    getCustomerConfig: (name: string) => {
      if (!configs.has(name)) {
        throw new Error(`Section '${name}' not found`);
      }
      return configs.get(name);
    },
    listCustomers: () => Array.from(configs.keys()),
    hasCustomer: (name: string) => configs.has(name),
  }));
}