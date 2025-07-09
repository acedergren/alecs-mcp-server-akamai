/**
 * Test Helpers and Utilities
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Common testing utilities for consistent test patterns
 * Approach: Reusable helpers for mocking, assertions, and data generation
 * Implementation: Type-safe testing utilities
 */

import { MCPToolResponse } from '../types';
import { AkamaiClient } from '../akamai-client';
import { jest } from '@jest/globals';

/**
 * Create a mock Akamai client with common defaults
 */
export function createMockAkamaiClient(overrides?: Partial<AkamaiClient>): jest.Mocked<AkamaiClient> {
  const mockClient = {
    request: jest.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {}
    }),
    getCustomer: jest.fn().mockReturnValue('test-customer'),
    switchCustomer: jest.fn(),
    getHost: jest.fn().mockReturnValue('test.akamaiapis.net'),
    ...overrides
  } as unknown as jest.Mocked<AkamaiClient>;
  
  return mockClient;
}

/**
 * Assert that a response is successful
 */
export function assertSuccessResponse(response: MCPToolResponse): void {
  expect(response.isError).toBeFalsy();
  expect(response.content).toBeDefined();
  expect(response.content.length).toBeGreaterThan(0);
  expect(response.content[0].type).toBe('text');
  expect(response.content[0].text).toBeDefined();
}

/**
 * Assert that a response is an error
 */
export function assertErrorResponse(response: MCPToolResponse, errorPattern?: RegExp): void {
  expect(response.isError).toBe(true);
  expect(response.content).toBeDefined();
  expect(response.content.length).toBeGreaterThan(0);
  expect(response.content[0].type).toBe('text');
  
  if (errorPattern) {
    expect(response.content[0].text).toMatch(errorPattern);
  }
}

/**
 * Mock API error response
 */
export function mockApiError(status: number, message: string, detail?: string): Error {
  const error: any = new Error(message);
  error.response = {
    status,
    statusText: message,
    data: {
      type: 'https://problems.luna.akamaiapis.net/common/error',
      title: message,
      status,
      detail: detail || message,
      instance: '/test/api/error',
      requestId: 'test-request-id'
    }
  };
  return error;
}

/**
 * Create test data for common Akamai resources
 */
export const TestData = {
  /**
   * Generate a test property
   */
  property: (overrides?: any) => ({
    propertyId: 'prp_123456',
    propertyName: 'test-property',
    contractId: 'ctr_TEST123',
    groupId: 'grp_12345',
    latestVersion: 1,
    productionVersion: 1,
    stagingVersion: 1,
    assetId: 'aid_12345',
    propertyType: 'TRADITIONAL',
    ...overrides
  }),
  
  /**
   * Generate a test contract
   */
  contract: (overrides?: any) => ({
    contractId: 'ctr_TEST123',
    contractTypeName: 'Test Contract',
    contractType: 'DIRECT_CUSTOMER',
    ...overrides
  }),
  
  /**
   * Generate a test group
   */
  group: (overrides?: any) => ({
    groupId: 'grp_12345',
    groupName: 'Test Group',
    parentGroupId: 'grp_1',
    contractIds: ['ctr_TEST123'],
    ...overrides
  }),
  
  /**
   * Generate a test DNS zone
   */
  dnsZone: (overrides?: any) => ({
    zone: 'example.com',
    type: 'PRIMARY',
    contractId: 'ctr_TEST123',
    comment: 'Test zone',
    activationState: 'ACTIVE',
    lastActivationDate: '2024-01-01T00:00:00Z',
    ...overrides
  }),
  
  /**
   * Generate a test DNS record
   */
  dnsRecord: (overrides?: any) => ({
    name: 'test',
    type: 'A',
    ttl: 300,
    rdata: ['192.0.2.1'],
    active: true,
    ...overrides
  }),
  
  /**
   * Generate a test certificate
   */
  certificate: (overrides?: any) => ({
    enrollmentId: 12345,
    cn: 'example.com',
    sans: ['www.example.com', 'api.example.com'],
    status: 'active',
    certificateType: 'DV',
    validationStatus: 'VALIDATED',
    deployment: {
      networkConfiguration: {
        geography: 'CORE',
        secureNetwork: 'ENHANCED_TLS',
        mustHaveCiphers: 'ak-akamai-default',
        preferredCiphers: 'ak-akamai-default',
        sniOnly: true
      }
    },
    ...overrides
  }),
  
  /**
   * Generate a test network list
   */
  networkList: (overrides?: any) => ({
    networkListId: 'nl_12345',
    name: 'Test Network List',
    type: 'IP',
    contractId: 'ctr_TEST123',
    groupId: 'grp_12345',
    elementCount: 10,
    syncPoint: 1,
    ...overrides
  }),
  
  /**
   * Generate activation details
   */
  activation: (overrides?: any) => ({
    activationId: 'atv_12345',
    propertyId: 'prp_123456',
    propertyVersion: 1,
    network: 'STAGING',
    status: 'ACTIVE',
    submitDate: '2024-01-01T00:00:00Z',
    updateDate: '2024-01-01T00:05:00Z',
    note: 'Test activation',
    notifyEmails: ['test@example.com'],
    ...overrides
  })
};

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a test context for error handling
 */
export function createTestContext(overrides?: any) {
  return {
    tool: 'test-tool',
    operation: 'test-operation',
    customer: 'test-customer',
    requestId: 'test-request-id',
    ...overrides
  };
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  const mocks = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation()
  };
  
  return {
    mocks,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    }
  };
}

/**
 * Snapshot test helper for tool responses
 */
export function snapshotResponse(response: MCPToolResponse): void {
  // Remove dynamic values before snapshot
  const sanitized = {
    ...response,
    content: response.content.map(content => ({
      ...content,
      text: content.text
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, 'TIMESTAMP')
        .replace(/test-request-id-\w+/g, 'REQUEST-ID')
        .replace(/\d+\.\d+\.\d+\.\d+/g, 'IP-ADDRESS')
    }))
  };
  
  expect(sanitized).toMatchSnapshot();
}