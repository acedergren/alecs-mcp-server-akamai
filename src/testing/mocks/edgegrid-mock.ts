/**
 * EdgeGrid Mock System
 * Provides comprehensive mocking for Akamai API responses without external dependencies
 */

export interface MockEndpointConfig {
  pattern: string;
  response: unknown;
  delay?: number;
  headers?: Record<string, string>;
}

export interface RequestHistoryEntry {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

export class EdgeGridMock {
  private responses = new Map<string, MockEndpointConfig>();
  private requestHistory: RequestHistoryEntry[] = [];
  private defaultDelay = 0;
  private circuitBreakerState = new Map<string, boolean>();

  constructor() {
    this.loadDefaultResponses();
  }

  /**
   * Set predefined scenario responses
   */
  setScenario(scenario: 'success' | 'auth_error' | 'rate_limit' | 'server_error') {
    this.responses.clear();
    
    switch (scenario) {
      case 'success':
        this.loadSuccessResponses();
        break;
      case 'auth_error':
        this.mockEndpoint('*', {
          status: 401,
          title: 'Unauthorized',
          detail: 'Invalid credentials',
        });
        break;
      case 'rate_limit':
        this.mockEndpoint('*', {
          status: 429,
          title: 'Rate Limit Exceeded',
          detail: 'Too many requests',
        });
        break;
      case 'server_error':
        this.mockEndpoint('*', {
          status: 500,
          title: 'Internal Server Error',
          detail: 'Server error occurred',
        });
        break;
    }
  }

  /**
   * Mock specific API endpoint with response
   */
  mockEndpoint(pattern: string, response: unknown, options: { delay?: number; headers?: Record<string, string> } = {}) {
    this.responses.set(pattern, {
      pattern,
      response,
      delay: options.delay || 0,
      headers: options.headers || {},
    });
  }

  /**
   * Simulate API request with mocked response
   */
  async request(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }) {
    const { path, method = 'GET', headers = {}, body } = options;

    // Record request history
    this.requestHistory.push({
      path,
      method,
      headers,
      body,
      timestamp: Date.now(),
    });

    // Check circuit breaker state
    const operationType = this.extractOperationType(path);
    if (this.circuitBreakerState.get(operationType)) {
      throw new Error(`Circuit breaker OPEN for ${operationType}`);
    }

    // Find matching response
    const matchingConfig = this.findMatchingResponse(path, method);
    
    if (matchingConfig.delay > 0) {
      await this.delay(matchingConfig.delay);
    }

    // Return response or error
    if (matchingConfig.response.status && matchingConfig.response.status >= 400) {
      const error = new Error(matchingConfig.response.detail || 'API Error') as Error & {
        status: number;
        response: unknown;
      };
      (error as any).status = matchingConfig.response.status;
      (error as any).response = matchingConfig.response;
      throw error;
    }

    return matchingConfig.response;
  }

  /**
   * Get request history for verification
   */
  getRequestHistory(): RequestHistoryEntry[] {
    return [...this.requestHistory];
  }

  /**
   * Clear request history
   */
  clearHistory() {
    this.requestHistory = [];
  }

  /**
   * Reset all mocks to default state
   */
  reset() {
    this.responses.clear();
    this.requestHistory = [];
    this.circuitBreakerState.clear();
    this.loadDefaultResponses();
  }

  /**
   * Set circuit breaker state for testing
   */
  setCircuitBreakerState(operationType: string, isOpen: boolean) {
    this.circuitBreakerState.set(operationType, isOpen);
  }

  private loadDefaultResponses() {
    // Property Manager defaults
    this.mockEndpoint('/papi/v1/properties', {
      properties: {
        items: [
          {
            propertyId: 'prp_123456',
            propertyName: 'test-property',
            contractId: 'ctr_C-1000000',
            groupId: 'grp_10000',
            productId: 'prd_Web_Accel',
            latestVersion: 1,
            productionVersion: 1,
            stagingVersion: 1,
          },
        ],
      },
    });

    // DNS defaults
    this.mockEndpoint('/config-dns/v2/zones', {
      zones: [
        {
          zone: 'example.com',
          type: 'primary',
          masters: [],
          comment: 'Test zone',
        },
      ],
    });

    // FastPurge defaults
    this.mockEndpoint('/ccu/v2/queues/default', {
      content: [{
        type: 'text',
        text: 'Purge request submitted successfully',
      }],
    });
  }

  private loadSuccessResponses() {
    this.loadDefaultResponses();
    
    // Add more comprehensive success responses
    this.mockEndpoint('/papi/v1/contracts', {
      contracts: {
        items: [
          {
            contractId: 'ctr_C-1000000',
            contractTypeName: 'AKAMAI_INTERNAL',
          },
        ],
      },
    });

    this.mockEndpoint('/papi/v1/groups', {
      groups: {
        items: [
          {
            groupId: 'grp_10000',
            groupName: 'Test Group',
            contractIds: ['ctr_C-1000000'],
          },
        ],
      },
    });
  }

  private findMatchingResponse(path: string, method: string): MockEndpointConfig {
    // Try exact match first
    const exactMatch = this.responses.get(`${method} ${path}`);
    if (exactMatch) {return exactMatch;}

    // Try path-only match
    const pathMatch = this.responses.get(path);
    if (pathMatch) {return pathMatch;}

    // Try pattern matching
    for (const [pattern, config] of this.responses.entries()) {
      if (pattern === '*' || this.matchesPattern(path, pattern)) {
        return config;
      }
    }

    // Default response
    return {
      pattern: 'default',
      response: { message: 'Default mock response' },
      delay: 0,
      headers: {},
    };
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced for more complex patterns
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(regexPattern).test(path);
    }
    return path.includes(pattern);
  }

  private extractOperationType(path: string): string {
    if (path.includes('/ccu/')) {return 'BULK_OPERATION';}
    if (path.includes('/papi/')) {return 'PROPERTY_MANAGEMENT';}
    if (path.includes('/config-dns/')) {return 'DNS_MANAGEMENT';}
    return 'GENERAL';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}