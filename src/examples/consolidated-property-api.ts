/**
 * EXAMPLE: Consolidated Property API with Performance Optimizations
 * 
 * This demonstrates how we'll consolidate 12 property files into a single,
 * performant, junior-developer-friendly API that maintains backwards compatibility.
 */

import { z } from 'zod';
import { RequestCoalescer, KeyNormalizers } from '../utils/request-coalescer';
import { UnifiedCacheService } from '../services/unified-cache-service';
// import { MCPCompatibilityWrapper } from '../utils/mcp-compatibility-wrapper'; // Will be used in production
import { AkamaiClient } from '../akamai-client';

// Initialize performance utilities
const coalescer = new RequestCoalescer({
  ttl: 10000,
  maxSize: 500,
  cleanupInterval: 30000,
});

const cache = new UnifiedCacheService({
  maxSize: 10000,
  enableSegmentation: true,
  segmentSize: 1000,
  enableCompression: true,
  adaptiveTTL: true,
});

/**
 * Type-safe property parameters with Zod validation
 */
const ListPropertiesParams = z.object({
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  customer: z.string().default('default'),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

const CreatePropertyParams = z.object({
  propertyName: z.string().min(1),
  productId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  customer: z.string().default('default'),
  ruleFormat: z.string().optional(),
});

/**
 * Performance-optimized property operations
 */
class PropertyOperations {
  /**
   * List properties with automatic caching and coalescing
   */
  async list(client: AkamaiClient, params: z.infer<typeof ListPropertiesParams>) {
    const validated = ListPropertiesParams.parse(params);
    
    // Check cache first (customer-isolated)
    const cacheKey = `${validated.customer}:properties:list:${JSON.stringify(validated)}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Coalesce concurrent requests
    const result = await coalescer.coalesce(
      'property.list',
      async () => {
        // Actual API call
        const response = await client.request({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: {
            ...(validated.contractId && { contractId: validated.contractId }),
            ...(validated.groupId && { groupId: validated.groupId }),
          },
        });
        
        // Transform response for consistency
        return this.transformPropertyList(response);
      },
      validated,
      KeyNormalizers.list
    );
    
    // Cache the result
    await cache.set(cacheKey, result, 300); // 5 minute TTL
    
    return result;
  }
  
  /**
   * Get single property with smart caching
   */
  async get(client: AkamaiClient, propertyId: string, customer: string = 'default') {
    // Validate property ID format
    if (!propertyId.startsWith('prp_')) {
      propertyId = `prp_${propertyId}`;
    }
    
    const cacheKey = `${customer}:property:${propertyId}`;
    
    // Use cache with automatic refresh
    return await cache.getWithRefresh(
      cacheKey,
      600, // 10 minute TTL
      async () => {
        return await coalescer.coalesce(
          'property.get',
          async () => {
            const response = await client.request({
              path: `/papi/v1/properties/${propertyId}`,
              method: 'GET',
            });
            return this.transformProperty(response);
          },
          { propertyId, customer: customer },
          KeyNormalizers.property
        );
      }
    );
  }
  
  /**
   * Create property with validation
   */
  async create(client: AkamaiClient, params: z.infer<typeof CreatePropertyParams>) {
    const validated = CreatePropertyParams.parse(params);
    
    // No caching for write operations
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      body: {
        propertyName: validated.propertyName,
        productId: validated.productId,
        contractId: validated.contractId,
        groupId: validated.groupId,
        ruleFormat: validated.ruleFormat || 'latest',
      },
    });
    
    // Invalidate related caches
    await cache.scanAndDelete(`${validated.customer}:properties:list:*`);
    
    return this.transformProperty(response);
  }
  
  /**
   * Transform API responses to consistent format
   */
  private transformPropertyList(response: any) {
    return {
      properties: response.properties?.items || [],
      _meta: {
        total: response.properties?.items?.length || 0,
        cached: false,
      },
    };
  }
  
  private transformProperty(response: any) {
    const property = response.properties?.items?.[0] || response;
    return {
      id: property.propertyId,
      name: property.propertyName,
      contract: property.contractId,
      group: property.groupId,
      latestVersion: property.latestVersion,
      productionVersion: property.productionVersion,
      stagingVersion: property.stagingVersion,
    };
  }
}

/**
 * Version management with status polling
 */
class VersionOperations {
  async create(client: AkamaiClient, propertyId: string, createFromVersion?: number) {
    const response = await client.request({
      path: `/papi/v1/properties/${propertyId}/versions`,
        method: 'POST',
        body: {
          createFromVersion,
          createFromVersionEtag: await this.getVersionEtag(client, propertyId, createFromVersion),
        },
      }
    );
    
    // Invalidate property cache
    await cache.del(`default:property:${propertyId}`);
    
    return response;
  }
  
  async list(client: AkamaiClient, propertyId: string) {
    const cacheKey = `default:versions:${propertyId}`;
    
    return await cache.getWithRefresh(cacheKey, 300, async () => {
      return await coalescer.coalesce(
        'property.versions.list',
        async () => {
          const response = await client.request({
            path: `/papi/v1/properties/${propertyId}/versions`,
            method: 'GET',
          });
          return (response as any).versions?.items || [];
        },
        { propertyId },
        KeyNormalizers.property
      );
    });
  }
  
  private async getVersionEtag(_client: AkamaiClient, _propertyId: string, _version?: number) {
    // Implementation details...
    return 'etag-placeholder';
  }
}

/**
 * Activation management with progress tracking
 */
class ActivationOperations {
  async create(
    client: AkamaiClient,
    propertyId: string,
    version: number,
    network: 'staging' | 'production'
  ) {
    const response = await client.request({
      path: `/papi/v1/properties/${propertyId}/activations`,
        method: 'POST',
        body: {
          propertyVersion: version,
          network: network.toUpperCase(),
          notifyEmails: ['noreply@example.com'],
          acknowledgeAllWarnings: true,
        },
      }
    );
    
    // Start polling for status
    return this.pollActivationStatus(client, propertyId, (response as any).activationId);
  }
  
  async status(client: AkamaiClient, propertyId: string, activationId: string, customer: string = 'default') {
    const cacheKey = `${customer}:activation:${propertyId}:${activationId}`;
    
    // Short cache for status checks
    return await cache.getWithRefresh(cacheKey, 5, async () => {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/activations/${activationId}`,
        method: 'GET',
      });
      return (response as any).activations?.items?.[0];
    });
  }
  
  private async pollActivationStatus(
    client: AkamaiClient,
    propertyId: string,
    activationId: string
  ) {
    // Poll every 10 seconds for up to 30 minutes
    const maxAttempts = 180;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await this.status(client, propertyId, activationId);
      
      if (status.status === 'ACTIVE') {
        return { success: true, activation: status };
      }
      
      if (status.status === 'FAILED' || status.status === 'ABORTED') {
        return { success: false, activation: status, error: status.detail };
      }
      
      // Still pending
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }
    
    return { success: false, error: 'Activation timeout after 30 minutes' };
  }
}

/**
 * Main consolidated Property API
 */
export const property = {
  // Core operations
  list: (client: AkamaiClient, params: any) => new PropertyOperations().list(client, params),
  get: (client: AkamaiClient, propertyId: string, customer?: string) => new PropertyOperations().get(client, propertyId, customer),
  create: (client: AkamaiClient, params: any) => new PropertyOperations().create(client, params),
  
  // Version management
  version: {
    create: (client: AkamaiClient, propertyId: string, fromVersion?: number) =>
      new VersionOperations().create(client, propertyId, fromVersion),
    list: (client: AkamaiClient, propertyId: string) =>
      new VersionOperations().list(client, propertyId),
  },
  
  // Activation management
  activation: {
    create: (client: AkamaiClient, propertyId: string, version: number, network: 'staging' | 'production') =>
      new ActivationOperations().create(client, propertyId, version, network),
    status: (client: AkamaiClient, propertyId: string, activationId: string, customer?: string) =>
      new ActivationOperations().status(client, propertyId, activationId, customer),
  },
};

/**
 * Backwards compatibility layer
 */
export const listProperties = deprecate(
  (client: AkamaiClient, params: any) => property.list(client, params),
  'listProperties is deprecated. Use property.list instead.'
);

export const getProperty = deprecate(
  (client: AkamaiClient, propertyId: string, customer?: string) => property.get(client, propertyId, customer),
  'getProperty is deprecated. Use property.get instead.'
);

export const createProperty = deprecate(
  (client: AkamaiClient, params: any) => property.create(client, params),
  'createProperty is deprecated. Use property.create instead.'
);

export const createPropertyVersion = deprecate(
  (client: AkamaiClient, propertyId: string, fromVersion?: number) =>
    property.version.create(client, propertyId, fromVersion),
  'createPropertyVersion is deprecated. Use property.version.create instead.'
);

/**
 * Deprecation helper
 */
function deprecate<T extends (...args: any[]) => any>(
  fn: T,
  message: string
): T {
  return ((...args: Parameters<T>) => {
    console.warn(`[DEPRECATION] ${message}`);
    return fn(...args);
  }) as T;
}

/**
 * MCP Tool Registration
 */
export const propertyTools = {
  'property.list': {
    description: 'List all properties with caching and pagination',
    inputSchema: ListPropertiesParams,
    handler: async (client: AkamaiClient, params: any) => {
      const result = await property.list(client, params);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  },
  
  'property.get': {
    description: 'Get property details with smart caching',
    inputSchema: z.object({
      propertyId: z.string(),
      customer: z.string().optional(),
    }),
    handler: async (client: AkamaiClient, params: any) => {
      const result = await property.get(client, params.propertyId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  },
  
  // ... more tool definitions
};

/**
 * Example usage showing the simplicity for junior developers:
 * 
 * // Old way (confusing):
 * const props1 = await listProperties(client, { contractId: 'ctr_123' });
 * const props2 = await listPropertiesOptimized(client, { contractId: 'ctr_123' });
 * const props3 = await getPropertiesList(client, 'ctr_123', 'grp_456');
 * 
 * // New way (clear and consistent):
 * const props = await property.list(client, { contractId: 'ctr_123' });
 * const details = await property.get(client, 'prp_789');
 * const version = await property.version.create(client, 'prp_789');
 * const activation = await property.activation.create(client, 'prp_789', 1, 'staging');
 */