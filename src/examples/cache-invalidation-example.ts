/**
 * Example: Proper Cache Invalidation Implementation
 * 
 * This file demonstrates how to properly integrate cache invalidation
 * into mutation operations to prevent stale data issues.
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { getCacheService, UnifiedCacheService } from '../services/unified-cache-service';
import { 
  isPapiPropertyCreateResponse 
} from '../types/api-responses/papi-properties';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Example 1: Property creation with cache invalidation
export async function createPropertyWithCacheInvalidation(
  client: AkamaiClient,
  args: {
    propertyName: string;
    productId: string;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  // Create the property
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {
        contractId: args.contractId,
        groupId: args.groupId,
      },
      body: {
        propertyName: args.propertyName,
        productId: args.productId,
      },
    });

    // Type guard and extract property ID from response
    if (!isPapiPropertyCreateResponse(response)) {
      throw new McpError(ErrorCode.InternalError, 'Invalid response from property creation');
    }
    const propertyId = response.propertyLink.split('/').pop()?.split('?')[0];

    // CRITICAL: Invalidate cache after successful creation
    const cacheService = await getCacheService();
    const customer = args.customer || 'default';
    
    // Invalidate the all properties list since we added a new one
    await cacheService.del(`${customer}:properties:all`);
    
    // Also invalidate any search results that might be cached
    await cacheService.scanAndDelete(`${customer}:search:*`);

    return {
      content: [{
        type: 'text',
        text: `Created property ${args.propertyName} (${propertyId}). Cache invalidated.`
      }]
    };
}

// Example 2: Hostname addition with proper cache invalidation
export async function addPropertyHostnameWithCacheInvalidation(
  _client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    edgeHostname: string;
    version?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  // ... existing hostname addition logic ...
    
    // After successful hostname addition
    const cacheService = await getCacheService();
    const customer = args.customer || 'default';
    
    // Invalidate all property-related caches
    await cacheService.invalidateProperty(args.propertyId, customer);
    
    // Also invalidate the specific hostname cache entries
    await cacheService.del(`${customer}:hostname:${args.hostname.toLowerCase()}`);
    
    // Invalidate hostname map since we added a new hostname
    await cacheService.del(`${customer}:hostname:map`);
    
    return {
      content: [{
        type: 'text',
        text: `Added hostname ${args.hostname} to property ${args.propertyId}. Cache invalidated.`
      }]
    };
}

// Example 3: Rule update with cache invalidation
export async function updatePropertyRulesWithCacheInvalidation(
  _client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    rules: unknown;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  // ... existing rule update logic ...
    
    // After successful rule update
    const cacheService = await getCacheService();
    const customer = args.customer || 'default';
    
    // Invalidate property cache including rules
    await cacheService.invalidateProperty(args.propertyId, customer);
    
    // Specifically invalidate the rules cache for this version
    await cacheService.del(`${customer}:property:${args.propertyId}:rules:${args.version}`);
    
    return {
      content: [{
        type: 'text',
        text: `Updated rules for property ${args.propertyId} v${args.version}. Cache invalidated.`
      }]
    };
}

// Example 4: Property activation with cache invalidation
export async function activatePropertyWithCacheInvalidation(
  _client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    network: 'STAGING' | 'PRODUCTION';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  // ... existing activation logic ...
    
    // After activation is initiated
    const cacheService = await getCacheService();
    const customer = args.customer || 'default';
    
    // Invalidate property cache since activation status changed
    await cacheService.invalidateProperty(args.propertyId, customer);
    
    // Note: You might want to invalidate again when activation completes
    // This could be done in the background monitoring function
    
    return {
      content: [{
        type: 'text',
        text: `Started activation of property ${args.propertyId} v${args.version} to ${args.network}. Cache invalidated.`
      }]
    };
}

// Example 5: Batch operations with cache invalidation
export async function batchUpdatePropertiesWithCacheInvalidation(
  _client: AkamaiClient,
  args: {
    operations: Array<{
      propertyId: string;
      action: string;
      params: unknown;
    }>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  const cacheService = await getCacheService();
  const customer = args.customer || 'default';
  const affectedPropertyIds = new Set<string>();
  
  // Perform all operations
    for (const op of args.operations) {
      // ... perform operation ...
      affectedPropertyIds.add(op.propertyId);
    }
    
    // Batch invalidate all affected properties
    for (const propertyId of affectedPropertyIds) {
      await cacheService.invalidateProperty(propertyId, customer);
    }
    
    // Also invalidate the all properties list and search results
    await cacheService.del(`${customer}:properties:all`);
    await cacheService.scanAndDelete(`${customer}:search:*`);
    
    return {
      content: [{
        type: 'text',
        text: `Completed batch operations on ${affectedPropertyIds.size} properties. Cache invalidated.`
      }]
    };
}

// Helper function to extend cache service for DNS operations
export async function invalidateDNSCache(
  cacheService: UnifiedCacheService,
  zoneId: string,
  customer: string
): Promise<void> {
  // Invalidate zone-specific caches
  await cacheService.del(`${customer}:dns:zone:${zoneId}`);
  await cacheService.del(`${customer}:dns:zone:${zoneId}:records`);
  await cacheService.scanAndDelete(`${customer}:dns:record:${zoneId}:*`);
  
  // Invalidate zone list
  await cacheService.del(`${customer}:dns:zones:all`);
  
  // Invalidate search results that might include DNS data
  await cacheService.scanAndDelete(`${customer}:search:*`);
}

// Helper function for certificate cache invalidation
export async function invalidateCertificateCache(
  cacheService: UnifiedCacheService,
  enrollmentId: string,
  customer: string
): Promise<void> {
  // Invalidate certificate-specific caches
  await cacheService.del(`${customer}:cert:enrollment:${enrollmentId}`);
  await cacheService.del(`${customer}:cert:enrollments:all`);
  
  // If the certificate is linked to properties, invalidate those too
  // This would require tracking which properties use which certificates
}

/**
 * Best Practices for Cache Invalidation:
 * 
 * 1. Always invalidate after successful mutations, not before
 * 2. Invalidate specific keys when possible, use wildcards sparingly
 * 3. Consider cascading invalidation (e.g., property change affects hostname cache)
 * 4. Log cache invalidation operations for debugging
 * 5. Handle cache invalidation errors gracefully (don't fail the mutation)
 * 6. For async operations (like activation), invalidate both at start and completion
 * 7. Use batch invalidation for bulk operations to improve performance
 */