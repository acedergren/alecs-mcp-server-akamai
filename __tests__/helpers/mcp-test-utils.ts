/**
 * MCP Test Utilities and Mock Data
 * Common helpers for testing MCP capabilities
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * MCP Test Client Configuration
 */
export interface TestClientConfig {
  serverPath?: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * Mock Data Generators
 */
export const MockData = {
  property: (overrides = {}) => ({
    propertyId: 'prp_123456',
    propertyName: 'example.com',
    contractId: 'ctr_1-5C13O2',
    groupId: 'grp_12345',
    latestVersion: 5,
    stagingVersion: 4,
    productionVersion: 3,
    accountId: 'act_1-234',
    ...overrides,
  }),

  contract: (overrides = {}) => ({
    contractId: 'ctr_1-5C13O2',
    contractTypeName: 'AKAMAI_INTERNAL',
    status: 'Active',
    ...overrides,
  }),

  zone: (overrides = {}) => ({
    zone: 'example.com',
    type: 'primary',
    comment: 'Test zone',
    activationState: 'active',
    contractId: 'ctr_1-5C13O2',
    ...overrides,
  }),

  dnsRecord: (overrides = {}) => ({
    name: 'www',
    type: 'A',
    ttl: 300,
    rdata: ['192.0.2.1'],
    ...overrides,
  }),

  edgeHostname: (overrides = {}) => ({
    edgeHostnameId: 'ehn_123456',
    domainPrefix: 'www.example.com',
    domainSuffix: 'edgesuite.net',
    ipVersionBehavior: 'IPV4',
    secure: true,
    ...overrides,
  }),

  certificate: (overrides = {}) => ({
    enrollmentId: 'enr_123456',
    status: 'active',
    certificateType: 'DV',
    cn: 'example.com',
    sans: ['www.example.com', 'api.example.com'],
    ...overrides,
  }),
};

/**
 * Create and manage MCP test client
 */
export class MCPTestClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private config: TestClientConfig;

  constructor(config: TestClientConfig = {}) {
    this.config = {
      serverPath: config.serverPath || path.join(__dirname, '../../dist/index-full.js'),
      timeout: config.timeout || 5000,
      env: config.env || {},
    };
  }

  async connect(): Promise<Client> {
    // Start server process
    this.serverProcess = spawn('node', [this.config.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...this.config.env,
        NODE_ENV: 'test',
      },
    });

    // Create transport
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [this.config.serverPath],
    });

    // Create client
    this.client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    // Connect with timeout
    await Promise.race([
      this.client.connect(this.transport),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), this.config.timeout)
      ),
    ]);

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}

/**
 * Test helpers for common MCP operations
 */
export const MCPTestHelpers = {
  /**
   * Call a tool and extract the text response
   */
  async callToolAndGetText(client: Client, toolName: string, params: any): Promise<string> {
    const result = await client.callTool(toolName, params);
    if (!result.content || result.content.length === 0) {
      throw new Error('No content in response');
    }
    return result.content[0].text;
  },

  /**
   * Check if a tool exists
   */
  async toolExists(client: Client, toolName: string): Promise<boolean> {
    const tools = await client.listTools();
    return tools.tools.some(t => t.name === toolName);
  },

  /**
   * Get tool schema
   */
  async getToolSchema(client: Client, toolName: string): Promise<any> {
    const tools = await client.listTools();
    const tool = tools.tools.find(t => t.name === toolName);
    return tool?.inputSchema;
  },

  /**
   * Validate tool response format
   */
  validateMCPResponse(response: any): boolean {
    return (
      response !== null &&
      typeof response === 'object' &&
      'content' in response &&
      Array.isArray(response.content) &&
      response.content.length > 0 &&
      response.content.every((item: any) => 
        'type' in item && 
        'text' in item &&
        item.type === 'text'
      )
    );
  },

  /**
   * Extract error message from MCP error
   */
  extractErrorMessage(error: any): string {
    if (error.message) return error.message;
    if (error.error?.message) return error.error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  },

  /**
   * Create a mock AkamaiClient for unit tests
   */
  createMockAkamaiClient() {
    return {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };
  },

  /**
   * Create common test scenarios
   */
  testScenarios: {
    /**
     * Test successful tool call
     */
    async successfulCall(
      client: Client, 
      toolName: string, 
      params: any, 
      expectedContent: string[]
    ): Promise<void> {
      const result = await client.callTool(toolName, params);
      expect(MCPTestHelpers.validateMCPResponse(result)).toBe(true);
      
      const text = result.content[0].text;
      expectedContent.forEach(content => {
        expect(text).toContain(content);
      });
    },

    /**
     * Test parameter validation
     */
    async parameterValidation(
      client: Client,
      toolName: string,
      invalidParams: any,
      expectedError: string
    ): Promise<void> {
      await expect(client.callTool(toolName, invalidParams))
        .rejects
        .toThrow(expectedError);
    },

    /**
     * Test error handling
     */
    async errorHandling(
      client: Client,
      toolName: string,
      params: any,
      expectedErrorContent: string
    ): Promise<void> {
      try {
        await client.callTool(toolName, params);
        fail('Expected error but none was thrown');
      } catch (error) {
        const message = MCPTestHelpers.extractErrorMessage(error);
        expect(message).toContain(expectedErrorContent);
      }
    },
  },
};

/**
 * Jest custom matchers for MCP testing
 */
export const MCPMatchers = {
  toBeValidMCPResponse(received: any) {
    const pass = MCPTestHelpers.validateMCPResponse(received);
    return {
      pass,
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to be a valid MCP response`
        : `Expected ${JSON.stringify(received)} to be a valid MCP response`,
    };
  },

  toContainTool(received: any, toolName: string) {
    const pass = received.tools?.some((t: any) => t.name === toolName) ?? false;
    return {
      pass,
      message: () => pass
        ? `Expected tools not to contain ${toolName}`
        : `Expected tools to contain ${toolName}`,
    };
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMCPResponse(): R;
      toContainTool(toolName: string): R;
    }
  }
}

// Add custom matchers to Jest
expect.extend(MCPMatchers);

/**
 * Test environment setup
 */
export async function setupTestEnvironment(): Promise<void> {
  // Set up test configuration
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
  
  // Mock external dependencies if needed
  jest.mock('../../src/utils/logger', () => ({
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  }));
}

/**
 * Clean up test environment
 */
export async function cleanupTestEnvironment(): Promise<void> {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset environment variables
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
}