/**
 * Dependency Injection Example - CODE KAI Implementation
 * 
 * This example demonstrates how to use the dependency injection
 * container in ALECS MCP tools and services.
 */

import { container, SERVICES, Injectable } from '../core/di';
import { AkamaiOperation } from '../tools/common/akamai-operation';
import type { IAkamaiClient, IPropertyCache } from '../core/interfaces';
import { AkamaiClient } from '../akamai-client';
import { z } from 'zod';

/**
 * Example 1: Manual service resolution
 */
async function manualExample() {
  // Resolve services manually
  const cache = await container.resolve(SERVICES.Cache);
  
  // Use services
  await cache.set('test:key', { value: 'example' }, 300);
  const cached = await cache.get('test:key');
  console.log('Cached value:', cached);
}

/**
 * Example 2: Service with injected dependencies
 */
@Injectable({ singleton: true })
class PropertyService {
  constructor(
    private cache: IPropertyCache,
    private client: IAkamaiClient
  ) {}
  
  static async create(): Promise<PropertyService> {
    const cache = await container.resolve(SERVICES.Cache);
    const client = await container.resolve(SERVICES.AkamaiClient);
    return new PropertyService(cache, client);
  }
  
  async listProperties(customer: string) {
    const cacheKey = `${customer}:properties:list`;
    
    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.request({
      path: '/papi/v1/properties',
      method: 'GET'
    });
    
    // Cache result
    await this.cache.set(cacheKey, response, 300);
    
    return response;
  }
}

/**
 * Example 3: Tool with dependency injection
 */
class PropertyListTool extends AkamaiOperation {
  domain = 'property'; // Required by Tool
  
  private injectedCache?: IPropertyCache;
  private injectedClient?: IAkamaiClient;
  
  name = 'property_list';
  description = 'List all properties';
  inputSchema = z.object({
    customer: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional()
  });
  
  constructor() {
    super();
  }
  
  async initializeDI(): Promise<void> {
    // Initialize cache through parent
    if (!this.cache) {
      // @ts-ignore - accessing protected method
      await this.initializeCache();
    }
    // Resolve injected dependencies
    this.injectedCache = await container.resolve(SERVICES.Cache);
    this.injectedClient = await container.resolve(SERVICES.AkamaiClient);
  }
  
  async execute(args: any): Promise<any> {
    const cache = this.injectedCache || this.cache!;
    const client = this.injectedClient!; // Should always be injected
    
    const cacheKey = `${args.customer || 'default'}:properties:${JSON.stringify(args)}`;
    
    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(cached, null, 2)
        }],
        _meta: { cached: true }
      };
    }
    
    // Fetch from API
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      queryParams: {
        ...(args.contractId && { contractId: args.contractId }),
        ...(args.groupId && { groupId: args.groupId })
      }
    });
    
    // Cache result
    await cache.set(cacheKey, response, 300);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
}

/**
 * Example 4: Customer-scoped services
 */
async function customerScopedExample() {
  // Create customer-specific container
  const customerContainer = container; // In real app, use createCustomerScope
  
  // Register customer-specific services
  customerContainer.register(
    SERVICES.AkamaiClient,
    () => new AkamaiClient('customer-123'),
    { singleton: true }
  );
  
  // Resolve customer-specific client
  const client = await customerContainer.resolve(SERVICES.AkamaiClient);
  
  // Client is configured for customer-123
  const response = await client.request({
    path: '/papi/v1/properties',
    method: 'GET'
  });
  
  return response;
}

/**
 * Example 5: Testing with dependency injection
 */
describe('PropertyService', () => {
  let mockCache: Partial<IPropertyCache>;
  let mockClient: Partial<AkamaiClient>;
  
  beforeEach(() => {
    // Create mocks
    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    
    mockClient = {
      request: jest.fn()
    };
    
    // Register mocks
    container.register(
      SERVICES.Cache,
      () => mockCache as IPropertyCache,
      { singleton: true }
    );
    
    container.register(
      SERVICES.AkamaiClient,
      () => mockClient as IAkamaiClient,
      { singleton: true }
    );
  });
  
  afterEach(() => {
    container.clear();
  });
  
  it('should cache property list', async () => {
    const service = await PropertyService.create();
    
    // Mock API response
    const mockResponse = { properties: { items: [] } };
    (mockClient.request as jest.Mock).mockResolvedValue(mockResponse);
    
    // First call - hits API
    await service.listProperties('test');
    
    expect(mockCache.get).toHaveBeenCalledWith('test:properties:list');
    expect(mockClient.request).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(
      'test:properties:list',
      mockResponse,
      300
    );
  });
});

// Export examples
export {
  manualExample,
  PropertyService,
  PropertyListTool,
  customerScopedExample
};