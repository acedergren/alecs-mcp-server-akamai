/**
 * Property Manager API Integration with Caching
 * Enhanced version with Valkey cache support for performance
 */

import { AkamaiCacheService } from '@services/akamai-cache-service';
import { CacheTTL } from '@services/valkey-cache-service';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Import original functions
import {
  listProperties as originalListProperties,
  getProperty as originalGetProperty,
  listGroups as originalListGroups,
  listContracts as originalListContracts,
} from './property-tools';

// Singleton cache service
let cacheService: AkamaiCacheService | null = null;

function getCacheService(): AkamaiCacheService {
  if (!cacheService) {
    cacheService = new AkamaiCacheService();
    cacheService.initialize().catch((err) => {
      console.error('[PropertyTools] Failed to initialize cache:', err);
    });
  }
  return cacheService;
}

/**
 * List all properties with caching support
 */
export async function listProperties(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    limit?: number;
    customer?: string;
    includeSubgroups?: boolean;
    useCache?: boolean;
    warmCache?: boolean;
  },
): Promise<MCPToolResponse> {
  // Check if caching is enabled (default: true)
  const useCache = args.useCache !== false;
  const customer = args.customer || 'default';

  if (!useCache) {
    // Direct API call without cache
    return originalListProperties(client, args);
  }

  const cache = getCacheService();

  // Warm cache if requested
  if (args.warmCache) {
    console.error('[Cache] Warming cache for customer:', customer);
    await cache.warmCache(client, customer);
  }

  // Build cache key based on parameters
  const cacheKey = `${customer}:properties:${args.contractId || 'all'}:${args.groupId || 'all'}:${args.limit || 50}`;

  try {
    // Try to get from cache first
    const startTime = Date.now();
    const cached = await cache['cache'].get(cacheKey);

    if (cached) {
      const duration = Date.now() - startTime;
      console.error(`[Cache] HIT: Properties list retrieved in ${duration}ms`);

      // Return cached response
      return cached as MCPToolResponse;
    }

    console.error('[Cache] MISS: Fetching properties from API...');

    // Call original function
    const apiStartTime = Date.now();
    const response = await originalListProperties(client, args);
    const apiDuration = Date.now() - apiStartTime;

    console.error(`[Cache] API call completed in ${apiDuration}ms`);

    // Cache the response
    await cache['cache'].set(cacheKey, response, CacheTTL.PROPERTIES_LIST);

    return response;
  } catch (error) {
    console.error('[Cache] Error in cached listProperties:', error);
    // Fallback to direct API call
    return originalListProperties(client, args);
  }
}

/**
 * Get property details with caching
 */
export async function getProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
    useCache?: boolean;
  },
): Promise<MCPToolResponse> {
  const useCache = args.useCache !== false;
  const customer = args.customer || 'default';

  if (!useCache) {
    return originalGetProperty(client, args);
  }

  const cache = getCacheService();
  const cacheKey = `${customer}:property:${args.propertyId}:details`;

  try {
    const cached = await cache['cache'].get(cacheKey);

    if (cached) {
      console.error(`[Cache] HIT: Property ${args.propertyId} details`);
      return cached as MCPToolResponse;
    }

    console.error(`[Cache] MISS: Fetching property ${args.propertyId} from API`);
    const response = await originalGetProperty(client, args);

    // Cache the response
    await cache['cache'].set(cacheKey, response, CacheTTL.PROPERTY_DETAILS);

    return response;
  } catch (error) {
    console.error('[Cache] Error in cached getProperty:', error);
    return originalGetProperty(client, args);
  }
}

/**
 * List groups with caching
 */
export async function listGroups(
  client: AkamaiClient,
  args: {
    searchTerm?: string;
    customer?: string;
    useCache?: boolean;
  },
): Promise<MCPToolResponse> {
  const useCache = args.useCache !== false;
  const customer = args.customer || 'default';

  if (!useCache) {
    return originalListGroups(client, args);
  }

  const cache = getCacheService();
  const cacheKey = `${customer}:groups:${args.searchTerm || 'all'}`;

  try {
    const cached = await cache['cache'].get(cacheKey);

    if (cached) {
      console.error('[Cache] HIT: Groups list');
      return cached as MCPToolResponse;
    }

    console.error('[Cache] MISS: Fetching groups from API');
    const response = await originalListGroups(client, args);

    // Cache the response with long TTL (groups rarely change)
    await cache['cache'].set(cacheKey, response, CacheTTL.GROUPS);

    return response;
  } catch (error) {
    console.error('[Cache] Error in cached listGroups:', error);
    return originalListGroups(client, args);
  }
}

/**
 * List contracts with caching
 */
export async function listContracts(
  client: AkamaiClient,
  args: {
    customer?: string;
    useCache?: boolean;
  },
): Promise<MCPToolResponse> {
  const useCache = args.useCache !== false;
  const customer = args.customer || 'default';

  if (!useCache) {
    return originalListContracts(client, args);
  }

  const cache = getCacheService();
  const cacheKey = `${customer}:contracts:all`;

  try {
    const cached = await cache['cache'].get(cacheKey);

    if (cached) {
      console.error('[Cache] HIT: Contracts list');
      return cached as MCPToolResponse;
    }

    console.error('[Cache] MISS: Fetching contracts from API');
    const response = await originalListContracts(client, args);

    // Cache the response with long TTL (contracts rarely change)
    await cache['cache'].set(cacheKey, response, CacheTTL.CONTRACTS);

    return response;
  } catch (error) {
    console.error('[Cache] Error in cached listContracts:', error);
    return originalListContracts(client, args);
  }
}

// Re-export other functions that don't need caching
export { createProperty } from './property-tools';
