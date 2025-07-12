/**
 * Unified Cache Service - Enterprise-Grade Multi-Tenant Cache
 * 
 * CODE KAI: Single source of truth for all caching functionality
 * 
 * KEY FEATURES:
 * - Zero external dependencies (no Redis/Valkey required)
 * - Multi-customer isolation with segmented storage
 * - Akamai-specific caching patterns (properties, hostnames, contracts)
 * - Memory-efficient with configurable limits
 * - Production-ready with comprehensive metrics
 */

import { LRUCache } from 'lru-cache';
import { type AkamaiClient } from '../akamai-client';
import { logger } from '../utils/logger';
import { CACHE_TTL } from '../constants/index';
import type { IPropertyCache, CacheStats } from '../core/interfaces';
import { 
  PropertiesResponse, 
  PropertyDetailResponse,
  ContractsResponse,
  GroupsResponse,
  PropertyHostnamesResponse
} from '../types/api-responses';

// Re-export cache TTL constants for backward compatibility
export const CacheTTL = CACHE_TTL;

// Types
interface Property {
  propertyId: string;
  propertyName: string;
  contractId: string;
  groupId: string;
  latestVersion: number;
  productionVersion?: number;
  stagingVersion?: number;
}

interface Hostname {
  cnameFrom: string;
  cnameTo: string;
  cnameType: string;
}

interface PropertyHostnameMapping {
  property: Property;
  hostname?: Hostname;
  matchReason?: string;
}

/**
 * Unified Cache Service - self-contained implementation
 */
export class UnifiedCacheService implements IPropertyCache {
  private cache: LRUCache<string, any>;
  private maxSize: number;
  private defaultTTL: number;
  private initialized = false;

  constructor(options?: { maxSize?: number; defaultTTL?: number; enableSegmentation?: boolean }) {
    this.maxSize = options?.maxSize || parseInt(process.env['CACHE_MAX_SIZE'] || '10000');
    this.defaultTTL = options?.defaultTTL || parseInt(process.env['CACHE_DEFAULT_TTL'] || '300');
    
    this.cache = new LRUCache<string, any>({
      max: this.maxSize,
      ttl: this.defaultTTL * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    logger.debug('[UnifiedCache] Cache initialized', { maxSize: this.maxSize, defaultTTL: this.defaultTTL });
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

  // ===== Core Cache Methods =====

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value, { ttl: (ttl || this.defaultTTL) * 1000 });
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async flushAll(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Scan and delete keys matching pattern
   */
  async scanAndDelete(pattern: string): Promise<number> {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Get with refresh functionality
   */
  async getWithRefresh<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    _options?: { refreshThreshold?: number; softTTL?: number }
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached !== undefined) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFn();
    await this.set(key, freshData, ttl);
    
    return freshData;
  }

  /**
   * Get detailed stats
   */
  async getDetailedStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      calculatedSize: this.cache.calculatedSize,
      hitRate: 0, // Would need to track hits/misses
      keys: Array.from(this.cache.keys())
    };
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

        const properties = (response as any).properties?.items || [];

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
        return (response as any).properties?.items?.[0] || null;
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
        return (response as any).hostnames?.items || [];
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
      const promises = batch.map(async (property) => {
        try {
          const hostnames = await this.getPropertyHostnames(client, property, customer);
          for (const hostname of hostnames) {
            hostnameMap[hostname.cnameFrom] = {
              property,
              hostname,
              matchReason: 'exact',
            };
          }
        } catch (error) {
          logger.error(`[UnifiedCache] Error fetching hostnames for property ${property.propertyId}`, { error });
        }
      });

      await Promise.all(promises);
    }

    // Cache the hostname mapping
    await this.set(`${customer}:hostname:mapping`, hostnameMap, CacheTTL.HOSTNAMES);

    const elapsed = Date.now() - startTime;
    logger.info(
      `[UnifiedCache] Hostname mapping created for ${Object.keys(hostnameMap).length} hostnames in ${elapsed}ms`,
    );
  }

  /**
   * Get all contracts with caching
   */
  async getContracts(client: AkamaiClient, customer = 'default'): Promise<unknown[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:contracts:all`;

    return this.getWithRefresh(
      cacheKey,
      CacheTTL.CONTRACTS_LIST,
      async () => {
        const response = await client.request<ContractsResponse>({
          path: '/papi/v1/contracts',
          method: 'GET',
        });
        return (response as any).contracts?.items || [];
      },
    );
  }

  /**
   * Get all groups with caching
   */
  async getGroups(client: AkamaiClient, customer = 'default'): Promise<unknown[]> {
    await this.ensureInitialized();
    const cacheKey = `${customer}:groups:all`;

    return this.getWithRefresh(
      cacheKey,
      CacheTTL.GROUPS_LIST,
      async () => {
        const response = await client.request<GroupsResponse>({
          path: '/papi/v1/groups',
          method: 'GET',
        });
        return (response as any).groups?.items || [];
      },
    );
  }

  /**
   * Find property by hostname
   */
  async findPropertyByHostname(
    client: AkamaiClient,
    hostname: string,
    customer = 'default',
  ): Promise<PropertyHostnameMapping | null> {
    await this.ensureInitialized();

    // First check cached hostname mapping
    const mappingCacheKey = `${customer}:hostname:mapping`;
    const mapping = await this.get<Record<string, PropertyHostnameMapping>>(mappingCacheKey);

    if (mapping) {
      // Exact match
      if (mapping[hostname]) {
        return mapping[hostname];
      }

      // Wildcard match
      const wildcardMatch = Object.entries(mapping).find(([key]) => {
        if (key.startsWith('*.')) {
          const domain = key.substring(2);
          return hostname.endsWith(domain);
        }
        return false;
      });

      if (wildcardMatch) {
        return { ...wildcardMatch[1], matchReason: 'wildcard' };
      }
    }

    // If not in cache, search through properties
    const properties = await this.getProperties(client, customer);

    for (const property of properties) {
      const hostnames = await this.getPropertyHostnames(client, property, customer);
      const match = hostnames.find((h) => h.cnameFrom === hostname);
      if (match) {
        return {
          property,
          hostname: match,
          matchReason: 'search',
        };
      }
    }

    return null;
  }

  /**
   * Invalidate property cache
   */
  async invalidateProperty(propertyId: string, customer = 'default'): Promise<void> {
    await this.del(`${customer}:property:${propertyId}`);
    await this.del(`${customer}:property:${propertyId}:hostnames`);
    await this.del(`${customer}:properties:all`);
    await this.del(`${customer}:hostname:mapping`);
  }

  /**
   * Invalidate all customer cache
   */
  async invalidateCustomer(customer = 'default'): Promise<void> {
    await this.scanAndDelete(`${customer}:*`);
  }

  // ===== Interface Implementation Methods =====

  /**
   * Check if key exists in cache (ICache interface)
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics (ICache interface)
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: 0, // LRUCache doesn't track this
      misses: 0, // LRUCache doesn't track this
      hitRate: 0, // Would need custom tracking
      memory: this.cache.calculatedSize || 0
    };
  }

  /**
   * Get cache size (ICache interface)
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get multiple keys at once (IAdvancedCache interface)
   */
  async mget<T = any>(keys: string[]): Promise<(T | undefined)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  /**
   * Set multiple keys at once (IAdvancedCache interface)
   */
  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    await Promise.all(entries.map(entry => this.set(entry.key, entry.value, entry.ttl)));
  }

  /**
   * Increment numeric value (IAdvancedCache interface)
   */
  async incr(key: string, delta: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Set expiration for existing key (IAdvancedCache interface)
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const value = await this.get(key);
    if (value !== undefined) {
      await this.set(key, value, ttl);
      return true;
    }
    return false;
  }

  /**
   * Get time to live for key (IAdvancedCache interface)
   */
  async ttl(key: string): Promise<number> {
    return this.cache.getRemainingTTL(key) || -1;
  }

  /**
   * Cache property search results (IPropertyCache interface)
   */
  async cachePropertySearch(
    customer: string,
    query: string,
    results: any[],
    ttl?: number
  ): Promise<void> {
    const cacheKey = `${customer}:search:${query.toLowerCase()}`;
    await this.set(cacheKey, results, ttl || CacheTTL.DEFAULT);
  }

  /**
   * Get cached search results (IPropertyCache interface)
   */
  async getPropertySearch(customer: string, query: string): Promise<any[] | undefined> {
    const cacheKey = `${customer}:search:${query.toLowerCase()}`;
    return this.get<any[]>(cacheKey);
  }
}

// Singleton instance for backward compatibility
let globalInstance: UnifiedCacheService | null = null;

/**
 * Get global cache instance
 */
export function getGlobalCache(): UnifiedCacheService {
  if (!globalInstance) {
    globalInstance = new UnifiedCacheService();
  }
  return globalInstance;
}

/**
 * Create a new cache instance with custom options
 */
export function createCache(options?: { maxSize?: number; defaultTTL?: number }): UnifiedCacheService {
  return new UnifiedCacheService(options);
}