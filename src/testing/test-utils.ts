/**
 * Enhanced test utilities for ALECS comprehensive testing
 * Provides mock clients, data generators, and testing helpers
 */

import { AkamaiClient } from '../akamai-client.js';

// Mock Akamai Client
export function createMockAkamaiClient(): jest.Mocked<AkamaiClient> {
  const mockClient = {
    request: jest.fn(),
    _customer: 'default',
    _accountSwitchKey: undefined,
    _edgercPath: '.edgerc',
    _section: 'default',
  } as any;

  return mockClient;
}

// Test Server Helper
export function createTestServer(): {
  getServer: () => any;
  callTool: (name: string, args: any) => Promise<any>;
} {
  const mockServer = {
    name: 'test-server',
    version: '1.0.0',
  };

  return {
    getServer: () => mockServer,
    callTool: async (name: string, _args: any) => {
      // Mock tool invocation
      return {
        content: [{
          type: 'text',
          text: `Mock response for ${name}`,
        }],
      };
    },
  };
}

// MCP Response Validator
export function validateMCPResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response.content).toBeDefined();
  expect(Array.isArray(response.content)).toBe(true);
  expect(response.content.length).toBeGreaterThan(0);
  
  response.content.forEach((item: any) => {
    expect(item.type).toBeDefined();
    expect(['text', 'image', 'resource']).toContain(item.type);
    
    if (item.type === 'text') {
      expect(typeof item.text).toBe('string');
      expect(item.text.length).toBeGreaterThan(0);
    }
  });
}

// Error Scenarios Generator
export const ErrorScenarios = {
  authenticationError: () => ({
    response: {
      status: 401,
      data: {
        detail: 'Authentication failed',
        type: 'authentication_error',
      },
    },
  }),

  rateLimited: () => ({
    response: {
      status: 429,
      headers: {
        'retry-after': '60',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
      },
      data: {
        detail: 'Rate limit exceeded',
      },
    },
  }),

  validationError: (field: string) => ({
    response: {
      status: 400,
      data: {
        type: 'validation_error',
        title: 'Validation failed',
        errors: [{
          type: 'invalid_field',
          detail: `Invalid value for ${field}`,
          field,
        }],
      },
    },
  }),

  notFound: (resource: string) => ({
    response: {
      status: 404,
      data: {
        detail: `${resource} not found`,
        type: 'not_found',
      },
    },
  }),

  conflict: (message: string) => ({
    response: {
      status: 409,
      data: {
        detail: message,
        type: 'conflict',
      },
    },
  }),

  serverError: () => ({
    response: {
      status: 500,
      data: {
        detail: 'Internal server error',
        reference: 'ERR-2024-12345',
      },
    },
  }),

  networkError: () => ({
    code: 'ECONNREFUSED',
    message: 'Connection refused',
  }),

  timeout: () => ({
    code: 'ETIMEDOUT',
    message: 'Request timeout',
  }),
};

// Test Data Generators
export const TestDataGenerators = {
  generateProperties: (count: number = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      propertyId: `prp_${1000 + i}`,
      propertyName: `property-${i}.example.com`,
      latestVersion: Math.floor(Math.random() * 10) + 1,
      productionVersion: Math.floor(Math.random() * 5) + 1,
      stagingVersion: Math.floor(Math.random() * 8) + 1,
      contractId: `ctr_C-${i}`,
      groupId: `grp_${i}`,
      accountId: `act_${i}`,
    }));
  },

  generateDNSRecords: (count: number = 10) => {
    const types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'];
    return Array.from({ length: count }, (_, i) => ({
      name: i === 0 ? '@' : `record${i}`,
      type: types[i % types.length],
      ttl: 300,
      rdata: types[i % types.length] === 'A' 
        ? [`192.0.2.${i + 1}`]
        : types[i % types.length] === 'CNAME'
        ? [`target${i}.example.com`]
        : [`value${i}`],
    }));
  },

  generatePropertyRules: (behaviorCount: number = 5) => {
    const behaviors = ['origin', 'caching', 'gzipResponse', 'http2', 'cpCode'];
    return {
      name: 'default',
      criteria: [],
      behaviors: behaviors.slice(0, behaviorCount).map((name, i) => ({
        name,
        options: name === 'origin' 
          ? { hostname: `origin${i}.example.com` }
          : name === 'caching'
          ? { behavior: 'MAX_AGE', ttl: '1d' }
          : {},
      })),
      children: [],
    };
  },

  generateProducts: (count: number = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      productId: `prd_${['Fresca', 'Site_Accel', 'Web_Accel'][i]}`,
      productName: ['Ion Standard', 'Dynamic Site Accelerator', 'Web Application Accelerator'][i],
    }));
  },

  generateDVEnrollment: () => ({
    commonName: 'secure.example.com',
    sans: ['www.secure.example.com', 'api.secure.example.com'],
    adminContact: {
      firstName: 'John',
      lastName: 'Doe', 
      email: 'john@example.com',
      phone: '+1-555-1234',
    },
    techContact: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com', 
      phone: '+1-555-5678',
    },
    contractId: 'C-123',
  }),

  generateContact: () => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1-555-0000',
  }),

  generateLargeErrorResponse: () => ({
    type: 'complex_error',
    errors: Array.from({ length: 50 }, (_, i) => ({
      field: `field${i}`,
      message: `Error message ${i} with lots of details that make the response very large`,
      code: `ERR_${i}`,
    })),
  }),
};

// Mock API Responses
export const MockAPIResponses = {
  emptyPropertyList: () => ({
    properties: { items: [] },
  }),

  propertyList: (count: number = 5) => ({
    properties: { 
      items: TestDataGenerators.generateProperties(count),
    },
  }),

  paginatedPropertyList: (page: number, perPage: number = 10) => {
    const allProperties = TestDataGenerators.generateProperties(50);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const items = allProperties.slice(start, end);
    
    return {
      properties: {
        items,
        nextLink: end < allProperties.length 
          ? `/papi/v1/properties?offset=${end}`
          : null,
      },
    };
  },

  propertyDetails: (propertyId: string) => ({
    properties: {
      propertyId,
      propertyName: 'example.com',
      latestVersion: 5,
      productionVersion: 3,
      stagingVersion: 5,
      contractId: 'ctr_C-123',
      groupId: 'grp_123',
    },
  }),

  activationResponse: (activationId: string = 'atv_123') => ({
    activationLink: `/papi/v1/properties/prp_123/activations/${activationId}`,
    activationId,
  }),

  dnsZoneList: (count: number = 3) => ({
    zones: Array.from({ length: count }, (_, i) => ({
      zone: `zone${i}.example.com`,
      type: 'PRIMARY',
      versionId: `v${i + 1}`,
    })),
  }),

  certificateEnrollment: (enrollmentId: number = 12345) => ({
    enrollment: `/cps/v2/enrollments/${enrollmentId}`,
    enrollmentId,
  }),
};

// Performance Tracker
export class PerformanceTracker {
  private timers = new Map<string, number>();
  private metrics = new Map<string, number[]>();

  start(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  end(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      throw new Error(`No timer found for operation: ${operation}`);
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    // Store duration for analysis
    const existing = this.metrics.get(operation) || [];
    existing.push(duration);
    this.metrics.set(operation, existing);

    return duration;
  }

  getMetrics(): Record<string, { 
    count: number; 
    avg: number; 
    min: number; 
    max: number; 
    totalDuration: number;
  }> {
    const result: any = {};

    for (const [operation, durations] of this.metrics.entries()) {
      result[operation] = {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        totalDuration: durations.reduce((a, b) => a + b, 0),
      };
    }

    return result;
  }

  reset(): void {
    this.timers.clear();
    this.metrics.clear();
  }
}

// Conversational Context Tracker
export class ConversationalContextTracker {
  private context: {
    messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
    entities: Record<string, any>;
    workflow?: string;
    errors: string[];
    resolutions: string[];
    insights: string[];
  } = {
    messages: [],
    entities: {},
    errors: [],
    resolutions: [],
    insights: [],
  };

  addUserMessage(content: string): void {
    this.context.messages.push({
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    });
  }

  addAssistantResponse(content: string): void {
    this.context.messages.push({
      role: 'assistant', 
      content,
      timestamp: new Date().toISOString(),
    });
  }

  addContext(key: string, value: any): void {
    this.context.entities[key] = value;
  }

  setWorkflowState(workflow: any): void {
    this.context.workflow = workflow.type;
    this.context.entities = { ...this.context.entities, ...workflow };
  }

  updateWorkflowState(workflow: any): void {
    this.context.entities = { ...this.context.entities, ...workflow };
  }

  getWorkflowStatus(): {
    currentStep?: string;
    completedSteps: number;
    totalSteps: number;
  } {
    const steps = this.context.entities.steps || [];
    const completed = steps.filter((s: any) => s.status === 'completed').length;
    const current = steps.find((s: any) => s.status === 'in_progress')?.name;

    return {
      currentStep: current,
      completedSteps: completed,
      totalSteps: steps.length,
    };
  }

  getContext(): typeof this.context {
    return { ...this.context };
  }

  reset(): void {
    this.context = {
      messages: [],
      entities: {},
      errors: [],
      resolutions: [],
      insights: [],
    };
  }
}

// Memory Monitor
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage = process.memoryUsage();
  private monitoring = false;
  private samples: NodeJS.MemoryUsage[] = [];

  startMonitoring(): void {
    this.initialMemory = process.memoryUsage();
    this.monitoring = true;
    this.samples = [this.initialMemory];
  }

  stopMonitoring(): void {
    this.monitoring = false;
  }

  getMemoryUsage(): {
    current: NodeJS.MemoryUsage;
    initial: NodeJS.MemoryUsage;
    increase: number;
    peak: number;
  } {
    const current = process.memoryUsage();
    
    if (this.monitoring) {
      this.samples.push(current);
    }

    const peak = this.samples.reduce((max, sample) => 
      Math.max(max, sample.heapUsed), 0
    );

    return {
      current,
      initial: this.initialMemory,
      increase: current.heapUsed - this.initialMemory.heapUsed,
      peak,
    };
  }
}

// Load Test Runner
export class LoadTestRunner {
  async runLoadTest(
    operation: () => Promise<any>,
    options: {
      duration: number; // ms
      concurrency: number;
      rampUp?: number; // ms
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errors: Error[];
  }> {
    const results: Array<{ success: boolean; duration: number; error?: Error }> = [];
    const startTime = Date.now();
    const promises: Promise<void>[] = [];

    // Create concurrent workers
    for (let i = 0; i < options.concurrency; i++) {
      const delay = options.rampUp ? (i * options.rampUp) / options.concurrency : 0;
      
      promises.push(
        new Promise<void>(async (resolve) => {
          await new Promise(r => setTimeout(r, delay));
          
          while (Date.now() - startTime < options.duration) {
            const requestStart = performance.now();
            
            try {
              await operation();
              results.push({
                success: true,
                duration: performance.now() - requestStart,
              });
            } catch (error) {
              results.push({
                success: false,
                duration: performance.now() - requestStart,
                error: error as Error,
              });
            }
            
            // Small delay between requests
            await new Promise(r => setTimeout(r, 10));
          }
          
          resolve();
        })
      );
    }

    await Promise.all(promises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = Date.now() - startTime;

    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      requestsPerSecond: results.length / (totalDuration / 1000),
      errors: failed.map(f => f.error!),
    };
  }
}

// Concurrency Controller
export class ConcurrencyController {
  private activeOperations = new Set<string>();
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T>(id: string, operation: () => Promise<T>): Promise<T> {
    // Wait for available slot
    while (this.activeOperations.size >= this.maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.activeOperations.add(id);

    try {
      return await operation();
    } finally {
      this.activeOperations.delete(id);
    }
  }

  getActiveCount(): number {
    return this.activeOperations.size;
  }
}

// Conversation Context (alias for ConversationalContextTracker)
export const ConversationContext = ConversationalContextTracker;

// Test Data (alias for TestDataGenerators)
export const TestData = TestDataGenerators;

// Re-export createCorrelationId from logger
export { createCorrelationId } from '../observability/logger.js';

// Workflow Simulator
export class WorkflowSimulator {
  constructor(
    private testServer: ReturnType<typeof createTestServer>,
    private mockClient: jest.Mocked<AkamaiClient>
  ) {}

  async runTool(toolName: string, parameters: any): Promise<any> {
    return this.testServer.callTool(toolName, parameters);
  }

  async simulateWorkflow(steps: Array<{
    toolName: string;
    parameters: any;
    mockResponse?: any;
  }>): Promise<any[]> {
    const results = [];

    for (const step of steps) {
      if (step.mockResponse) {
        this.mockClient.request.mockResolvedValueOnce(step.mockResponse);
      }

      const result = await this.runTool(step.toolName, step.parameters);
      results.push(result);
    }

    return results;
  }
}