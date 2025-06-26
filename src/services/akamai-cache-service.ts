/**
 * Akamai-specific Cache Service
 * Provides caching for Akamai API responses with smart invalidation
 */

import { type AkamaiClient } from '../akamai-client';
import { ICache } from '../types/cache-interface';
import { getDefaultCache } from './cache-factory';
import { CacheTTL } from './external-cache-service';

export interface PropertySearchResult {
  type:
    | 'exact_hostname'
    | 'hostname_with_www'
    | 'hostname_without_www'
    | 'property_name'
    | 'property_id';
  property: any;
  hostname?: any;
  matchReason?: string;
}

export class AkamaiCacheService {
  private cache: ICache;
  private initialized = false;

  constructor(cache?: ICache) {
    // Cache will be initialized on first use if not provided
    this.cache = cache!;
  }

  /**
   * Initialize cache connection
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      if (!this.cache) {
        this.cache = await getDefaultCache();
      }
      this.initialized = true;
    }
  }

  /**
   * Ensure cache is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get all properties with caching
   */
  async getProperties(client: AkamaiClient, customer = 'default'): Promise<any[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:properties:all`;

    return this.cache.getWithRefresh(
      cacheKey,
      CacheTTL.PROPERTIES_LIST,
      async () => {
        console.error('[Cache] Fetching properties from API...');
        const response = await client.request({
          path: '/papi/v1/properties',
          method: 'GET',
        });

        const properties = response.properties?.items || [];

        // Also create hostname mapping in background
        if (properties.length > 0) {
          this.createHostnameMapping(client, customer, properties).catch((_err) => {
            console.error('[Cache] Error creating hostname mapping:', _err);
          });
        }

        return properties;
      },
      { refreshThreshold: 0.2, softTTL: 300 },
    );
  }

  /**
   * Get property by ID with caching
   */
  async getProperty(
    client: AkamaiClient,
    propertyId: string,
    customer = 'default',
  ): Promise<any | null> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:property:${propertyId}`;

    return this.cache.getWithRefresh(
      cacheKey,
      CacheTTL.PROPERTY_DETAILS,
      async () => {
        const response = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
        });
        return response.properties?.items?.[0] || null;
      },
      { refreshThreshold: 0.3 },
    );
  }

  /**
   * Get property hostnames with caching
   */
  async getPropertyHostnames(
    client: AkamaiClient,
    property: any,
    customer = 'default',
  ): Promise<any[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:property:${property.propertyId}:hostnames`;

    return this.cache.getWithRefresh(
      cacheKey,
      CacheTTL.HOSTNAMES,
      async () => {
        const response = await client.request({
          path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`,
          method: 'GET',
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId,
          },
        });
        return response.hostnames?.items || [];
      },
      { refreshThreshold: 0.2 },
    );
  }

  /**
   * Create hostname to property mapping
   */
  private async createHostnameMapping(
    client: AkamaiClient,
    customer: string,
    properties: any[],
  ): Promise<void> {
    const startTime = Date.now();
    const hostnameMap: Record<string, any> = {};
    const batchSize = 10;

    console.error(`[Cache] Creating hostname mapping for ${properties.length} properties...`);

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (property) => {
          try {
            const hostnames = await this.getPropertyHostnames(client, property, customer);

            // Map each hostname to property
            for (const hostname of hostnames) {
              if (hostname.cnameFrom) {
                const key = hostname.cnameFrom.toLowerCase();
                hostnameMap[key] = {
                  property,
                  hostname,
                };

                // Also store individual hostname cache
                await this.cache.set(
                  `${customer}:hostname:${key}`,
                  { property, hostname },
                  CacheTTL.HOSTNAMES,
                );
              }
            }
          } catch (_err) {
            console.error(`[Cache] Error processing property ${property.propertyId}:`, _err);
          }
        }),
      );
    }

    // Store the complete mapping
    await this.cache.set(`${customer}:hostname:map`, hostnameMap, CacheTTL.HOSTNAME_MAP);

    const elapsed = Date.now() - startTime;
    console.error(
      `[Cache] Created hostname mapping with ${Object.keys(hostnameMap).length} entries in ${elapsed}ms`,
    );
  }

  /**
   * Search with caching
   */
  async search(
    client: AkamaiClient,
    query: string,
    customer = 'default',
  ): Promise<PropertySearchResult[]> {
    await this.ensureInitialized();
    const searchKey = `${customer}:search:${query.toLowerCase()}`;

    // Try cache first
    const cached = await this.cache.get<PropertySearchResult[]>(searchKey);
    if (cached) {
      console.error(`[Cache] HIT: Search results for "${query}"`);
      return cached;
    }

    console.error(`[Cache] MISS: Searching for "${query}"`);
    const results: PropertySearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Quick hostname lookup
    const hostnameData = await this.cache.get<any>(`${customer}:hostname:${queryLower}`);
    if (hostnameData) {
      results.push({
        type: 'exact_hostname',
        property: hostnameData.property,
        hostname: hostnameData.hostname,
        matchReason: 'Exact hostname match (cached)',
      });
    }

    // Check with www prefix
    const wwwData = await this.cache.get<any>(`${customer}:hostname:www.${queryLower}`);
    if (wwwData) {
      results.push({
        type: 'hostname_with_www',
        property: wwwData.property,
        hostname: wwwData.hostname,
        matchReason: 'Hostname match with www (cached)',
      });
    }

    // Check without www prefix
    if (queryLower.startsWith('www.')) {
      const withoutWww = queryLower.substring(4);
      const withoutWwwData = await this.cache.get<any>(`${customer}:hostname:${withoutWww}`);
      if (withoutWwwData) {
        results.push({
          type: 'hostname_without_www',
          property: withoutWwwData.property,
          hostname: withoutWwwData.hostname,
          matchReason: 'Hostname match without www (cached)',
        });
      }
    }

    // If no hostname matches, search through properties
    if (results.length === 0) {
      const properties = await this.getProperties(client, customer);

      for (const property of properties) {
        if (property.propertyName?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'property_name',
            property,
            matchReason: 'Property name match',
          });
        }
      }
    }

    // Cache the results
    if (results.length > 0) {
      await this.cache.set(searchKey, results, CacheTTL.SEARCH_RESULTS);
    }

    return results;
  }

  /**
   * Get contracts with caching
   */
  async getContracts(client: AkamaiClient, customer = 'default'): Promise<any[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:contracts:all`;

    return this.cache.getWithRefresh(cacheKey, CacheTTL.CONTRACTS, async () => {
      const response = await client.request({
        path: '/papi/v1/contracts',
        method: 'GET',
      });
      return response.contracts?.items || [];
    });
  }

  /**
   * Get groups with caching
   */
  async getGroups(client: AkamaiClient, customer = 'default'): Promise<any[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:groups:all`;

    return this.cache.getWithRefresh(cacheKey, CacheTTL.GROUPS, async () => {
      const response = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });
      return response.groups?.items || [];
    });
  }

  /**
   * Invalidate property cache
   */
  async invalidateProperty(propertyId: string, customer = 'default'): Promise<void> {
    await this.ensureInitialized();
    console.error(`[Cache] Invalidating cache for property ${propertyId}`);

    const keys = [
      `${customer}:property:${propertyId}`,
      `${customer}:property:${propertyId}:hostnames`,
      `${customer}:property:${propertyId}:rules:*`,
      `${customer}:properties:all`,
      `${customer}:hostname:map`,
    ];

    // Delete direct keys
    await this.cache.del(keys.filter((k) => !k.includes('*')));

    // Delete pattern-matched keys
    for (const pattern of keys.filter((k) => k.includes('*'))) {
      await this.cache.scanAndDelete(pattern);
    }

    // Also invalidate search results
    await this.cache.scanAndDelete(`${customer}:search:*`);
  }

  /**
   * Warm cache for a customer
   */
  async warmCache(client: AkamaiClient, customer = 'default'): Promise<void> {
    await this.ensureInitialized();
    console.error(`[Cache] Starting cache warming for customer: ${customer}`);
    const startTime = Date.now();

    try {
      // Warm properties and hostname mapping
      const properties = await this.getProperties(client, customer);
      console.error(`[Cache] Warmed ${properties.length} properties`);

      // Warm contracts and groups in parallel
      await Promise.all([this.getContracts(client, customer), this.getGroups(client, customer)]);

      const elapsed = Date.now() - startTime;
      console.error(`[Cache] Cache warming completed in ${elapsed}ms`);
    } catch (_err) {
      console.error('[Cache] Error during cache warming:', _err);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    await this.ensureInitialized();
    const metrics = this.cache.getMetrics();

    return {
      ...metrics,
      cacheEnabled: this.cache.isAvailable(),
      hitRatePercent: metrics.hitRate.toFixed(2) + '%',
      estimatedCostSavings: `$${(metrics.apiCallsSaved * 0.001).toFixed(2)}`, // Rough estimate
    };
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    await this.cache.flushAll();
  }

  /**
   * Close cache connection
   */
  async close(): Promise<void> {
    if (this.initialized && this.cache) {
      await this.cache.close();
    }
  }
}
