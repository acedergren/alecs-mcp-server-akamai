/**
 * Unified Test Utilities for ALECS MCP Server
 * 
 * Provides a standardized set of utilities, mocks, and test harnesses for
 * writing consistent and maintainable tests across all domains.
 */

import { AkamaiClient } from '@/akamai-client';
import { MCPToolResponse } from '@/types';

/**
 * MockAkamaiClient
 * 
 * A mock implementation of the AkamaiClient for testing purposes.
 * It can be configured to return specific responses for different API calls.
 */
export class MockAkamaiClient extends AkamaiClient {
  private mockResponses: Map<string, any> = new Map();

  constructor(customer: string = 'default') {
    super(customer);
  }

  /**
   * Sets a mock response for a specific API path and method.
   * @param method - The HTTP method (e.g., 'GET', 'POST').
   * @param path - The API path (e.g., '/papi/v1/properties').
   * @param response - The response data to return.
   */
  setMockResponse(method: string, path: string, response: any): void {
    const key = `${method}:${path}`;
    this.mockResponses.set(key, response);
  }

  async request(options: { path: string; method: string; body?: any; queryParams?: any }): Promise<any> {
    const key = `${options.method}:${options.path}`;
    if (this.mockResponses.has(key)) {
      return Promise.resolve(this.mockResponses.get(key));
    }
    // Return a default empty response if no mock is set
    return Promise.resolve({ items: [] });
  }
}

/**
 * ToolTestHarness
 * 
 * A helper class to build and run tests for tool handlers.
 */
export class ToolTestHarness<TArgs> {
  private handler: (client: AkamaiClient, args: TArgs) => Promise<MCPToolResponse>;
  private args: TArgs;
  private mockResponses: Map<string, any> = new Map();

  constructor(handler: (client: AkamaiClient, args: TArgs) => Promise<MCPToolResponse>) {
    this.handler = handler;
    this.args = {} as TArgs;
  }

  withArgs(args: TArgs): this {
    this.args = { ...this.args, ...args };
    return this;
  }

  withMockResponse(method: string, path: string, response: any): this {
    this.mockResponses.set(`${method}:${path}`, response);
    return this;
  }

  async run(): Promise<MCPToolResponse> {
    const mockClient = new MockAkamaiClient();
    for (const [key, value] of this.mockResponses.entries()) {
      const [method, path] = key.split(':');
      mockClient.setMockResponse(method, path, value);
    }
    return this.handler(mockClient, this.args);
  }
}

/**
 * Creates a new test harness for a given tool handler.
 * @param handler - The tool handler function to test.
 */
export function testTool<TArgs>(handler: (client: AkamaiClient, args: TArgs) => Promise<MCPToolResponse>): ToolTestHarness<TArgs> {
  return new ToolTestHarness<TArgs>(handler);
}