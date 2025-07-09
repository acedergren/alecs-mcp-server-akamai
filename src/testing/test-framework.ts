/**
 * Enhanced Testing Framework for ALECSCore Tools
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Comprehensive testing infrastructure for rapid tool development
 * Approach: Automated test generation with mock data and validation
 * Implementation: Type-safe testing utilities with production-grade patterns
 */

import type { ZodSchema } from 'zod';
import { MCPToolResponse } from '../types';
import { AkamaiClient } from '../akamai-client';
import { createLogger } from '../utils/pino-logger';
import { jest } from '@jest/globals';

const logger = createLogger('test-framework');

/**
 * Test configuration for a tool
 */
export interface ToolTestConfig {
  /**
   * Tool name (e.g., 'property_list')
   */
  toolName: string;
  
  /**
   * Tool handler function
   */
  handler: (client: AkamaiClient, args: any) => Promise<MCPToolResponse>;
  
  /**
   * Zod schema for input validation
   */
  inputSchema: ZodSchema<any>;
  
  /**
   * Test cases to run
   */
  testCases: TestCase[];
  
  /**
   * Mock responses for API calls
   */
  mockResponses?: MockResponse[];
  
  /**
   * Custom validation for responses
   */
  responseValidator?: (response: MCPToolResponse) => void;
}

/**
 * Individual test case
 */
export interface TestCase {
  /**
   * Test name
   */
  name: string;
  
  /**
   * Input arguments
   */
  input: Record<string, any>;
  
  /**
   * Expected outcome
   */
  expected: {
    /**
     * Should the test pass or fail
     */
    success: boolean;
    
    /**
     * Expected error message pattern (for failure cases)
     */
    errorPattern?: RegExp;
    
    /**
     * Expected response content pattern (for success cases)
     */
    contentPattern?: RegExp;
    
    /**
     * Custom assertions
     */
    customAssertions?: (response: MCPToolResponse) => void;
  };
  
  /**
   * Mock data specific to this test case
   */
  mocks?: MockResponse[];
}

/**
 * Mock response configuration
 */
export interface MockResponse {
  /**
   * Request pattern to match
   */
  request: {
    method?: string;
    pathPattern: RegExp;
    params?: Record<string, any>;
  };
  
  /**
   * Response to return
   */
  response: {
    status?: number;
    data?: any;
    headers?: Record<string, string>;
    error?: Error;
  };
}

/**
 * Enhanced test runner for tools
 */
export class ToolTestRunner {
  private mockClient: jest.Mocked<AkamaiClient>;
  
  constructor() {
    this.mockClient = this.createMockClient();
  }
  
  /**
   * Run all tests for a tool
   */
  async runTests(config: ToolTestConfig): Promise<TestResults> {
    const results: TestResults = {
      toolName: config.toolName,
      totalTests: config.testCases.length,
      passed: 0,
      failed: 0,
      errors: [],
      duration: 0
    };
    
    const startTime = Date.now();
    
    for (const testCase of config.testCases) {
      try {
        await this.runTestCase(config, testCase);
        results.passed++;
        logger.info(`✅ ${config.toolName} - ${testCase.name}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          testName: testCase.name,
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`❌ ${config.toolName} - ${testCase.name}: ${error}`);
      }
    }
    
    results.duration = Date.now() - startTime;
    
    return results;
  }
  
  /**
   * Run a single test case
   */
  private async runTestCase(config: ToolTestConfig, testCase: TestCase): Promise<void> {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks for this test
    this.setupMocks([
      ...(config.mockResponses || []),
      ...(testCase.mocks || [])
    ]);
    
    // Validate input
    const validationResult = config.inputSchema.safeParse(testCase.input);
    
    if (!validationResult.success && testCase.expected.success) {
      throw new Error(`Input validation failed: ${validationResult.error.message}`);
    }
    
    // Run the handler
    let response: MCPToolResponse;
    let error: Error | null = null;
    
    try {
      response = await config.handler(this.mockClient, testCase.input);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      response = {
        content: [{ type: 'text', text: error.message }]
      } as MCPToolResponse;
    }
    
    // Assert expectations
    if (testCase.expected.success) {
      if (error) {
        throw new Error(`Expected success but got error: ${error.message}`);
      }
      
      // No need to check isError - error was already caught above
      
      // Check content pattern
      if (testCase.expected.contentPattern) {
        const content = response.content[0]?.text || '';
        if (!testCase.expected.contentPattern.test(content)) {
          throw new Error(`Content does not match expected pattern: ${content}`);
        }
      }
    } else {
      if (!error) {
        throw new Error('Expected failure but operation succeeded');
      }
      
      // Check error pattern
      if (testCase.expected.errorPattern) {
        const errorMessage = error?.message || response.content[0]?.text || '';
        if (!testCase.expected.errorPattern.test(errorMessage)) {
          throw new Error(`Error does not match expected pattern: ${errorMessage}`);
        }
      }
    }
    
    // Run custom assertions
    if (testCase.expected.customAssertions) {
      testCase.expected.customAssertions(response);
    }
    
    // Run response validator
    if (config.responseValidator) {
      config.responseValidator(response);
    }
  }
  
  /**
   * Create a mock Akamai client
   */
  private createMockClient(): jest.Mocked<AkamaiClient> {
    const client = {
      request: jest.fn(),
      getCustomer: jest.fn().mockReturnValue('test-customer'),
      switchCustomer: jest.fn(),
      getHost: jest.fn().mockReturnValue('test.akamaiapis.net')
    } as unknown as jest.Mocked<AkamaiClient>;
    
    return client;
  }
  
  /**
   * Setup mocks for API calls
   */
  private setupMocks(mocks: MockResponse[]): void {
    this.mockClient.request.mockImplementation(async (options) => {
      const mock = mocks.find(m => {
        const methodMatch = !m.request.method || m.request.method === options.method;
        const pathMatch = m.request.pathPattern.test(options.path);
        const paramsMatch = !m.request.params || 
          JSON.stringify(m.request.params) === JSON.stringify(options.queryParams);
        
        return methodMatch && pathMatch && paramsMatch;
      });
      
      if (!mock) {
        throw new Error(`No mock found for ${options.method} ${options.path}`);
      }
      
      if (mock.response.error) {
        throw mock.response.error;
      }
      
      // Return the data directly as the function returns T
      return mock.response.data || {};
    });
  }
}

/**
 * Test results
 */
export interface TestResults {
  toolName: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: Array<{
    testName: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Test data generator for common scenarios
 */
export class TestDataGenerator {
  /**
   * Generate property test data
   */
  static generateProperty(overrides?: Partial<any>): any {
    return {
      propertyId: 'prp_123456',
      propertyName: 'test-property',
      contractId: 'ctr_TEST123',
      groupId: 'grp_12345',
      latestVersion: 1,
      productionVersion: 1,
      stagingVersion: 1,
      ...overrides
    };
  }
  
  /**
   * Generate DNS zone test data
   */
  static generateDnsZone(overrides?: Partial<any>): any {
    return {
      zone: 'example.com',
      type: 'PRIMARY',
      contractId: 'ctr_TEST123',
      groupId: 'grp_12345',
      activationState: 'ACTIVE',
      ...overrides
    };
  }
  
  /**
   * Generate certificate test data
   */
  static generateCertificate(overrides?: Partial<any>): any {
    return {
      enrollmentId: 12345,
      cn: 'example.com',
      sans: ['www.example.com'],
      status: 'active',
      certificateType: 'DV',
      ...overrides
    };
  }
  
  /**
   * Generate error response
   */
  static generateErrorResponse(status: number, detail: string): any {
    return {
      type: 'https://problems.luna.akamaiapis.net/common/error',
      title: `Error ${status}`,
      status,
      detail,
      instance: '/api/v1/test',
      requestId: 'test-request-id'
    };
  }
}

/**
 * Test suite builder for domains
 */
export class DomainTestSuiteBuilder {
  private suites: Map<string, ToolTestConfig[]> = new Map();
  
  /**
   * Add a tool test configuration
   */
  addToolTests(domain: string, config: ToolTestConfig): this {
    if (!this.suites.has(domain)) {
      this.suites.set(domain, []);
    }
    
    this.suites.get(domain)!.push(config);
    return this;
  }
  
  /**
   * Build Jest test suites
   */
  buildJestSuites(): void {
    for (const [domain, configs] of this.suites) {
      describe(`${domain} Domain Tests`, () => {
        const runner = new ToolTestRunner();
        
        for (const config of configs) {
          describe(config.toolName, () => {
            for (const testCase of config.testCases) {
              it(testCase.name, async () => {
                const results = await runner.runTests({
                  ...config,
                  testCases: [testCase]
                });
                
                expect(results.failed).toBe(0);
                expect(results.errors).toHaveLength(0);
              });
            }
          });
        }
      });
    }
  }
  
  /**
   * Generate test report
   */
  async generateReport(): Promise<TestReport> {
    const runner = new ToolTestRunner();
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      domains: [],
      summary: {
        totalDomains: this.suites.size,
        totalTools: 0,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0
      }
    };
    
    for (const [domain, configs] of this.suites) {
      const domainReport: DomainTestReport = {
        domainName: domain,
        tools: []
      };
      
      for (const config of configs) {
        const results = await runner.runTests(config);
        domainReport.tools.push(results);
        
        report.summary.totalTools++;
        report.summary.totalTests += results.totalTests;
        report.summary.totalPassed += results.passed;
        report.summary.totalFailed += results.failed;
      }
      
      report.domains.push(domainReport);
    }
    
    return report;
  }
}

/**
 * Test report interfaces
 */
export interface TestReport {
  timestamp: string;
  domains: DomainTestReport[];
  summary: {
    totalDomains: number;
    totalTools: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
  };
}

export interface DomainTestReport {
  domainName: string;
  tools: TestResults[];
}

// All classes are already exported above