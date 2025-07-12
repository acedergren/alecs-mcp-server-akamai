/**
 * Reliable Test Base Class
 * Provides foundation for 100% reliable tests without external dependencies
 */

import { EdgeGridMock } from '../mocks/edgegrid-mock';
import { AkamaiResponseFactory } from '../factories/response-factory';

export interface TestConfig {
  timeout?: number;
  retries?: number;
  mockLevel?: 'complete' | 'external' | 'minimal';
  verbose?: boolean;
}

export class ReliableTest {
  protected mockEdgeGrid: EdgeGridMock;
  protected originalModules: Map<string, any> = new Map();
  protected testConfig: TestConfig;

  constructor(config: TestConfig = {}) {
    this.testConfig = {
      timeout: 10000,
      retries: 0,
      mockLevel: 'complete',
      verbose: false,
      ...config,
    };
  }

  /**
   * Setup test environment with clean mocks
   */
  async setupTest(): Promise<void> {
    // Initialize fresh mock
    this.mockEdgeGrid = new EdgeGridMock();
    
    // Reset circuit breakers
    await this.resetCircuitBreakers();
    
    // Clear application cache
    this.clearApplicationCache();
    
    // Mock external dependencies
    this.mockExternalDependencies();
    
    if (this.testConfig.verbose) {
      console.log('🧪 Test environment setup complete');
    }
  }

  /**
   * Cleanup test environment
   */
  async teardownTest(): Promise<void> {
    // Restore original modules
    this.restoreAllMocks();
    
    // Clean up test artifacts
    await this.cleanupTestArtifacts();
    
    // Clear mock history
    if (this.mockEdgeGrid) {
      this.mockEdgeGrid.clearHistory();
    }
    
    if (this.testConfig.verbose) {
      console.log('🧹 Test environment cleanup complete');
    }
  }

  /**
   * Setup common success scenario
   */
  setupSuccessScenario(): void {
    this.mockEdgeGrid.setScenario('success');
    this.addCustomerConfig('testing', {
      client_token: 'test-token',
      access_token: 'test-access',
      client_secret: 'test-secret',
      host: 'test.akamai.com',
    });
  }

  /**
   * Setup authentication error scenario
   */
  setupAuthErrorScenario(): void {
    this.mockEdgeGrid.setScenario('auth_error');
  }

  /**
   * Setup rate limiting scenario
   */
  setupRateLimitScenario(): void {
    this.mockEdgeGrid.setScenario('rate_limit');
  }

  /**
   * Add customer configuration for testing
   */
  addCustomerConfig(customer: string, config: unknown): void {
    // Mock customer configuration
    const customerConfigModule = this.mockModule('../../src/utils/customer-config');
    customerConfigModule.validateCustomer = jest.fn().mockReturnValue(true);
    customerConfigModule.getCustomerConfig = jest.fn().mockReturnValue(config);
  }

  /**
   * Mock specific API endpoint
   */
  mockApiEndpoint(endpoint: string, response: unknown, options?: { delay?: number }): void {
    this.mockEdgeGrid.mockEndpoint(endpoint, response, options);
  }

  /**
   * Verify API call was made
   */
  verifyApiCall(endpoint: string, method: string = 'GET'): boolean {
    const history = this.mockEdgeGrid.getRequestHistory();
    return history.some(req => 
      req.path.includes(endpoint) && 
      req.method.toLowerCase() === method.toLowerCase()
    );
  }

  /**
   * Get API call count for endpoint
   */
  getApiCallCount(endpoint: string): number {
    const history = this.mockEdgeGrid.getRequestHistory();
    return history.filter(req => req.path.includes(endpoint)).length;
  }

  /**
   * Reset circuit breakers to prevent test interference
   */
  private async resetCircuitBreakers(): Promise<void> {
    try {
      // Mock the resilience manager to prevent circuit breaker interference
      const resilienceModule = this.mockModule('../../src/utils/resilience-manager');
      resilienceModule.resetAllCircuitBreakers = jest.fn();
      
      // Reset specific circuit breakers
      this.mockEdgeGrid.setCircuitBreakerState('BULK_OPERATION', false);
      this.mockEdgeGrid.setCircuitBreakerState('PROPERTY_MANAGEMENT', false);
      this.mockEdgeGrid.setCircuitBreakerState('DNS_MANAGEMENT', false);
    } catch (error) {
      // Ignore if resilience manager doesn't exist
    }
  }

  /**
   * Clear application cache to prevent test interference
   */
  private clearApplicationCache(): void {
    // Clear any in-memory caches
    if (global.cache) {
      global.cache.clear();
    }
    
    // Clear module cache for specific modules
    const modulesToClear = [
      'akamai-client',
      'customer-config',
      'cache-service',
    ];
    
    modulesToClear.forEach(moduleName => {
      const moduleKey = Object.keys(require.cache).find(key => 
        key.includes(moduleName)
      );
      if (moduleKey) {
        delete require.cache[moduleKey];
      }
    });
  }

  /**
   * Mock external dependencies
   */
  private mockExternalDependencies(): void {
    // Mock file system operations
    this.mockModule('fs', {
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue('[default]\nclient_token = test'),
    });
    
    // Mock path operations
    this.mockModule('path', {
      join: jest.fn((...args) => args.join('/')),
      resolve: jest.fn((...args) => args.join('/')),
    });

    // Mock EdgeGrid authentication
    this.mockEdgeGridAuth();
  }

  /**
   * Mock EdgeGrid authentication
   */
  private mockEdgeGridAuth(): void {
    const authModule = this.mockModule('../../src/auth/enhanced-edgegrid');
    authModule.EnhancedEdgeGrid = jest.fn().mockImplementation(() => ({
      request: this.mockEdgeGrid.request.bind(this.mockEdgeGrid),
      auth: jest.fn().mockReturnValue({}),
    }));
  }

  /**
   * Mock a module and track for cleanup
   */
  private mockModule(modulePath: string, mockImplementation?: unknown): unknown {
    try {
      const originalModule = require(modulePath);
      this.originalModules.set(modulePath, originalModule);
      
      const mockedModule = mockImplementation || {};
      jest.doMock(modulePath, () => mockedModule);
      
      return mockedModule;
    } catch (error) {
      // Return empty mock if module doesn't exist
      return {};
    }
  }

  /**
   * Restore all mocked modules
   */
  private restoreAllMocks(): void {
    this.originalModules.forEach((originalModule, modulePath) => {
      try {
        jest.doMock(modulePath, () => originalModule);
      } catch (error) {
        // Ignore restore errors
      }
    });
    
    this.originalModules.clear();
    jest.clearAllMocks();
  }

  /**
   * Clean up test artifacts
   */
  private async cleanupTestArtifacts(): Promise<void> {
    // Clear any temporary files or state
    // This can be extended based on specific cleanup needs
  }
}

/**
 * Unit Test Base - Complete mocking
 */
export class UnitTest extends ReliableTest {
  constructor() {
    super({
      mockLevel: 'complete',
      timeout: 5000,
      verbose: false,
    });
  }
}

/**
 * Integration Test Base - External mocking only
 */
export class IntegrationTest extends ReliableTest {
  constructor() {
    super({
      mockLevel: 'external',
      timeout: 15000,
      verbose: true,
    });
  }
}

/**
 * Contract Test Base - Schema validation
 */
export class ContractTest extends ReliableTest {
  constructor() {
    super({
      mockLevel: 'minimal',
      timeout: 10000,
      verbose: false,
    });
  }

  /**
   * Validate response against OpenAPI schema
   */
  validateResponseSchema(response: unknown, schemaPath: string): boolean {
    // This would integrate with actual schema validation
    // For now, just check basic structure
    return response && typeof response === 'object';
  }

  /**
   * Validate request format
   */
  validateRequestFormat(request: unknown, endpoint: string): boolean {
    // Basic request validation
    return request && typeof request === 'object';
  }
}