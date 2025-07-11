/**
 * Unified Cache Service - Enterprise-Grade Multi-Tenant Cache
 * 
 * CODE KAI: Consolidates all cache functionality into a single, unified service
 * combining the best features from SmartCache, AkamaiCacheService, and cache factories.
 * 
 * KEY FEATURES:
 * - Zero external dependencies (no Redis/Valkey required)
 * - Multi-customer isolation with segmented storage
 * - Akamai-specific caching patterns (properties, hostnames, contracts)
 * - Advanced cache features (compression, persistence, circuit breaker)
 * - Request coalescing to prevent duplicate API calls
 * - Adaptive TTL based on update patterns
 * - Memory-efficient with configurable limits
 * - Production-ready with comprehensive metrics
 * 
 * APPROACH:
 * - Extends SmartCache base functionality
 * - Adds Akamai-specific methods from AkamaiCacheService
 * - Implements singleton pattern for global access
 * - Provides factory methods for custom instances
 * 
 * IMPLEMENTATION:
 * - Uses composition to combine SmartCache and Akamai features
 * - Maintains backward compatibility with existing code
 * - Provides clear migration path from old implementations
 */

import { SmartCache, type SmartCacheOptions } from '../utils/smart-cache';
import { ICache, type CacheMetrics } from '../types/cache-interface';
import { type AkamaiClient } from '../akamai-client';
import { logger } from '../utils/logger';
import { 
  PropertiesResponse, 
  PropertyDetailResponse,
  ContractsResponse,
  GroupsResponse,
  PropertyHostnamesResponse
} from '../types/api-responses';

// Re-export cache TTL constants
export const CacheTTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes  
  LONG: 1800,         // 30 minutes
  EXTRA_LONG: 3600,   // 1 hour
  // Specific TTLs for different resources
  PROPERTIES_LIST: 300,   // 5 minutes
  PROPERTY_DETAILS: 300,  // 5 minutes
  HOSTNAMES: 300,         // 5 minutes
  HOSTNAME_MAP: 300,      // 5 minutes
  SEARCH_RESULTS: 60,     // 1 minute
  CONTRACTS: 1800,        // 30 minutes
  GROUPS: 1800           // 30 minutes
} as const;

// Type definitions from AkamaiCacheService
type Property = PropertiesResponse['properties']['items'][0];
type Hostname = PropertyHostnamesResponse['hostnames']['items'][0];
type Contract = ContractsResponse['contracts']['items'][0];
type Group = GroupsResponse['groups']['items'][0];

export interface PropertySearchResult {
  type:
    | 'exact_hostname'
    | 'hostname_with_www'
    | 'hostname_without_www'
    | 'property_name'
    | 'property_id';
  property: Property;
  hostname?: Hostname;
  matchReason?: string;
}

/**
 * Unified Cache Service combining SmartCache and Akamai-specific functionality
 */
export class UnifiedCacheService extends SmartCache implements ICache {
  private initialized = false;

  constructor(options?: SmartCacheOptions) {
    // Default options optimized for Akamai API caching
    super({
      maxSize: options?.maxSize || parseInt(process.env['CACHE_MAX_SIZE'] || '10000'),
      maxMemoryMB: options?.maxMemoryMB || parseInt(process.env['CACHE_MAX_MEMORY_MB'] || '100'),
      defaultTTL: options?.defaultTTL || parseInt(process.env['CACHE_DEFAULT_TTL'] || '300'),
      evictionPolicy: (process.env['CACHE_EVICTION_POLICY'] as 'LRU' | 'LFU' | 'FIFO' | 'LRU-K' | undefined) || 'LRU',
      enableMetrics: process.env['CACHE_METRICS'] !== 'false',
      enableCompression: process.env['CACHE_COMPRESSION'] !== 'false',
      compressionThreshold: parseInt(process.env['CACHE_COMPRESSION_THRESHOLD'] || '10240'),
      enablePersistence: process.env['CACHE_PERSISTENCE'] === 'true',
      persistencePath: process.env['CACHE_PERSISTENCE_PATH'] || '.cache/smart-cache.json',
      adaptiveTTL: process.env['CACHE_ADAPTIVE_TTL'] !== 'false',
      requestCoalescing: process.env['CACHE_REQUEST_COALESCING'] !== 'false',
      enableCircuitBreaker: process.env['CACHE_CIRCUIT_BREAKER'] !== 'false',
      enableSegmentation: true, // Always enable for customer isolation
      ...options
    });

    // Add debug logging if enabled
    if (process.env['DEBUG'] === 'true') {
      this.on('hit', (key) => logger.debug(`[UnifiedCache] Hit: ${key}`));
      this.on('miss', (key) => logger.debug(`[UnifiedCache] Miss: ${key}`));
      this.on('evict', (key) => logger.debug(`[UnifiedCache] Evicted: ${key}`));
    }
  }

  /**
   * Initialize cache (compatibility method)
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
      logger.debug('[UnifiedCache] Cache initialized');
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

  // ===== Akamai-Specific Methods =====

  /**
   * Get all properties with caching
   */
  async getProperties(client: AkamaiClient, customer = 'default'): Promise<Property[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:properties:all`;

    return this.getWithRefresh(
      cacheKey,
      CacheTTL.PROPERTIES_LIST,
      async () => {
        logger.debug('[UnifiedCache] Fetching properties from API...');
        const response = await client.request<PropertiesResponse>({
          path: '/papi/v1/properties',
          method: 'GET',
        });

        const properties = response.properties?.items || [];

        // Also create hostname mapping in background
        if (properties.length > 0) {
          this.createHostnameMapping(client, customer, properties).catch((err) => {
            logger.error('[UnifiedCache] Error creating hostname mapping', { error: err });
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
  ): Promise<Property | null> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:property:${propertyId}`;

    return this.getWithRefresh(
      cacheKey,
      CacheTTL.PROPERTY_DETAILS,
      async () => {
        const response = await client.request<PropertyDetailResponse>({
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
    property: Property,
    customer = 'default',
  ): Promise<Hostname[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:property:${property.propertyId}:hostnames`;

    return this.getWithRefresh(
      cacheKey,
      CacheTTL.HOSTNAMES,
      async () => {
        const response = await client.request<PropertyHostnamesResponse>({
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
    properties: Property[],
  ): Promise<void> {
    const startTime = Date.now();
    const hostnameMap: Record<string, unknown> = {};
    const batchSize = 10;

    logger.debug(`[UnifiedCache] Creating hostname mapping for ${properties.length} properties...`);

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
                await this.set(
                  `${customer}:hostname:${key}`,
                  { property, hostname },
                  CacheTTL.HOSTNAMES,
                );
              }
            }
          } catch (err) {
            logger.error('[UnifiedCache] Error processing property', { error: err, propertyId: property.propertyId });
          }
        }),
      );
    }

    // Store the complete mapping
    await this.set(`${customer}:hostname:map`, hostnameMap, CacheTTL.HOSTNAME_MAP);

    const elapsed = Date.now() - startTime;
    logger.debug(
      `[UnifiedCache] Created hostname mapping with ${Object.keys(hostnameMap).length} entries in ${elapsed}ms`,
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
    const cached = await this.get<PropertySearchResult[]>(searchKey);
    if (cached) {
      logger.debug(`[UnifiedCache] HIT: Search results for "${query}"`);
      return cached;
    }

    logger.debug(`[UnifiedCache] MISS: Searching for "${query}"`);
    const results: PropertySearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Quick hostname lookup
    const hostnameData = await this.get<any>(`${customer}:hostname:${queryLower}`);
    if (hostnameData) {
      results.push({
        type: 'exact_hostname',
        property: hostnameData.property,
        hostname: hostnameData.hostname,
        matchReason: 'Exact hostname match (cached)',
      });
    }

    // Check with www prefix
    const wwwData = await this.get<any>(`${customer}:hostname:www.${queryLower}`);
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
      const withoutWwwData = await this.get<any>(`${customer}:hostname:${withoutWww}`);
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
      await this.set(searchKey, results, CacheTTL.SEARCH_RESULTS);
    }

    return results;
  }

  /**
   * Get contracts with caching
   */
  async getContracts(client: AkamaiClient, customer = 'default'): Promise<Contract[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:contracts:all`;

    return this.getWithRefresh(cacheKey, CacheTTL.CONTRACTS, async () => {
      const response = await client.request<ContractsResponse>({
        path: '/papi/v1/contracts',
        method: 'GET',
      });
      return response.contracts?.items || [];
    });
  }

  /**
   * Get groups with caching
   */
  async getGroups(client: AkamaiClient, customer = 'default'): Promise<Group[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:groups:all`;

    return this.getWithRefresh(cacheKey, CacheTTL.GROUPS, async () => {
      const response = await client.request<GroupsResponse>({
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
    logger.debug(`[UnifiedCache] Invalidating cache for property ${propertyId}`);

    const keys = [
      `${customer}:property:${propertyId}`,
      `${customer}:property:${propertyId}:hostnames`,
      `${customer}:property:${propertyId}:versions`,
      `${customer}:property:${propertyId}:rules`,
      `${customer}:property:${propertyId}:rules:*`,
      `${customer}:properties:all`,
      `${customer}:hostname:map`,
    ];

    // Delete direct keys
    await this.del(keys.filter((k) => !k.includes('*')));

    // Delete pattern-matched keys
    for (const pattern of keys.filter((k) => k.includes('*'))) {
      await this.scanAndDelete(pattern);
    }

    // Also invalidate search results
    await this.scanAndDelete(`${customer}:search:*`);
  }

  /**
   * Warm cache for a customer (Akamai-specific method)
   */
  async warmCacheForCustomer(client: AkamaiClient, customer = 'default'): Promise<void> {
    await this.ensureInitialized();
    logger.debug(`[UnifiedCache] Starting cache warming for customer: ${customer}`);
    const startTime = Date.now();

    try {
      // Warm properties and hostname mapping
      const properties = await this.getProperties(client, customer);
      logger.debug(`[UnifiedCache] Warmed ${properties.length} properties`);

      // Warm contracts and groups in parallel
      await Promise.all([this.getContracts(client, customer), this.getGroups(client, customer)]);

      const elapsed = Date.now() - startTime;
      logger.debug(`[UnifiedCache] Cache warming completed in ${elapsed}ms`);
    } catch (err) {
      logger.error('[UnifiedCache] Error during cache warming', { error: err });
    }
  }

  /**
   * Get cache statistics with Akamai-specific info
   */
  async getStats(): Promise<unknown> {
    await this.ensureInitialized();
    const baseStats = this.getDetailedStats();
    const metrics = this.getMetrics();
    const apiCallsSaved = metrics.apiCallsSaved;
    
    return {
      ...(typeof baseStats === 'object' && baseStats !== null ? baseStats : {}),
      cacheEnabled: this.isAvailable(),
      hitRatePercent: typeof metrics.hitRate === 'number' ? `${(metrics.hitRate * 100).toFixed(2)}%` : 'N/A',
      estimatedCostSavings: `$${(((typeof apiCallsSaved === 'number' && !isNaN(apiCallsSaved)) ? apiCallsSaved : 0) * 0.001).toFixed(2)}`,
    };
  }

  /**
   * Clear all cache (alias for flushAll)
   */
  async clearCache(): Promise<void> {
    await this.flushAll();
  }

  /**
   * Clear all cache (compatibility alias)
   */
  async clear(): Promise<void> {
    await this.flushAll();
  }

  /**
   * Generic cached wrapper method for any API call
   */
  async cached<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    customer = 'default'
  ): Promise<T> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:${key}`;
    
    return this.getWithRefresh(
      cacheKey,
      ttl,
      fetchFn,
      { refreshThreshold: 0.2, softTTL: Math.floor(ttl * 0.1) }
    );
  }

  /**
   * Invalidate cache by pattern (alias for scanAndDelete)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    return this.scanAndDelete(pattern);
  }

  /**
   * Get cache metrics (override to match ICache interface)
   */
  override getMetrics(): CacheMetrics {
    const baseMetrics = super.getMetrics();
    // Return metrics with index signature compatibility
    return {
      ...baseMetrics,
      // Allow additional properties
    } as CacheMetrics;
  }
}

// ===== Singleton Implementation =====

let globalCacheService: UnifiedCacheService | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Get or create the global cache service instance
 * Ensures only one instance exists and is properly initialized
 */
export async function getCacheService(): Promise<UnifiedCacheService> {
  if (!globalCacheService) {
    globalCacheService = new UnifiedCacheService();
    
    // Initialize only once, even if called multiple times concurrently
    if (!initializationPromise) {
      initializationPromise = globalCacheService.initialize().catch(err => {
        logger.error('[UnifiedCache] Failed to initialize cache:', err);
        // Don't throw - cache is optional for functionality
      });
    }
    
    await initializationPromise;
  }
  
  return globalCacheService;
}

/**
 * Check if cache service is available
 * Useful for conditional cache operations
 */
export function isCacheAvailable(): boolean {
  return globalCacheService !== null && globalCacheService.isAvailable();
}

/**
 * Close cache connection (for cleanup)
 */
export async function closeCacheService(): Promise<void> {
  if (globalCacheService) {
    await globalCacheService.close();
    globalCacheService = null;
    initializationPromise = null;
  }
}

// ===== Factory Implementation =====

export interface CacheFactoryOptions {
  type?: 'unified' | 'smart';
  options?: SmartCacheOptions;
}

/**
 * Factory for creating custom cache instances
 */
export class CacheFactory {
  /**
   * Create cache instance based on configuration
   */
  static async create(options: CacheFactoryOptions = {}): Promise<ICache> {
    logger.debug('[CacheFactory] Creating unified cache instance');
    return new UnifiedCacheService(options.options);
  }
}

/**
 * Default cache instance (singleton)
 */
let defaultCache: ICache | null = null;

export async function getDefaultCache(): Promise<ICache> {
  if (!defaultCache) {
    defaultCache = await CacheFactory.create();
  }
  return defaultCache;
}

export async function resetDefaultCache(): Promise<void> {
  if (defaultCache) {
    await defaultCache.close();
    defaultCache = null;
  }
}

// ===== Backward Compatibility Exports =====

// Export as AkamaiCacheService for backward compatibility
export { UnifiedCacheService as AkamaiCacheService };

// Export as CacheService for backward compatibility
export { UnifiedCacheService as CacheService };

// Export SmartCache type for backward compatibility
export { UnifiedCacheService as SmartCache };

// Export factory function for backward compatibility
export function createCacheService(options?: SmartCacheOptions): UnifiedCacheService {
  return new UnifiedCacheService(options);
}

// Re-export types
export type { SmartCacheOptions } from '../utils/smart-cache';
export type { CacheEntry } from '../utils/smart-cache';
export type { ICache, CacheMetrics } from '../types/cache-interface';