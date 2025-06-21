/**
 * Valkey (Redis) Cache Service for Akamai Data
 * Provides intelligent caching for improved search performance
 */

import Redis from 'ioredis';

import { type AkamaiClient } from '../akamai-client';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  ttl?: {
    properties?: number; // Default: 300 (5 minutes)
    propertyDetails?: number; // Default: 3600 (1 hour)
    hostnames?: number; // Default: 900 (15 minutes)
    search?: number; // Default: 300 (5 minutes)
    contracts?: number; // Default: 86400 (24 hours)
    groups?: number; // Default: 86400 (24 hours)
  };
}

export class AkamaiCacheService {
  private redis: Redis | null = null;
  private config: CacheConfig;
  private enabled = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      host: config.host || process.env.VALKEY_HOST || 'localhost',
      port: config.port || parseInt(process.env.VALKEY_PORT || '6379'),
      password: config.password || process.env.VALKEY_PASSWORD,
      ttl: {
        properties: 300, // 5 minutes
        propertyDetails: 3600, // 1 hour
        hostnames: 900, // 15 minutes
        search: 300, // 5 minutes
        contracts: 86400, // 24 hours
        groups: 86400, // 24 hours
        ...config.ttl,
      },
    };

    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('[Cache] Failed to connect to Valkey after 3 attempts');
            this.enabled = false;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.redis.on('connect', () => {
        console.error('[Cache] Connected to Valkey');
        this.enabled = true;
      });

      this.redis.on('error', (err) => {
        console.error('[Cache] Valkey error:', err.message);
        this.enabled = false;
      });
    } catch (_error) {
      console.error('[Error]:', _error);
      this.enabled = false;
    }
  }

  /**
   * Get cached properties list or fetch from API
   */
  async getProperties(client: AkamaiClient, customer = 'default'): Promise<any> {
    const cacheKey = `akamai:${customer}:properties:all`;

    if (this.enabled && this.redis) {
      try {
        // Try to get from cache
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          console.error('[Cache] HIT: Properties list');
          return JSON.parse(cached);
        }
      } catch (_err) {
        console.error('[Cache] Error reading from cache:', _err);
      }
    }

    // Fetch from API
    console.error('[Cache] MISS: Fetching properties from API');
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
    });

    const properties = response.properties?.items || [];

    // Store in cache
    if (this.enabled && this.redis && properties.length > 0) {
      try {
        await this.redis.setex(cacheKey, this.config.ttl!.properties!, JSON.stringify(properties));

        // Also create hostname mapping for quick lookups
        await this.createHostnameMapping(client, customer, properties);
      } catch (_err) {
        console.error('[Cache] Error writing to cache:', _err);
      }
    }

    return properties;
  }

  /**
   * Create hostname to property mapping for fast lookups
   */
  private async createHostnameMapping(
    client: AkamaiClient,
    customer: string,
    properties: any[],
  ): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    const hostnameMap: Record<string, any> = {};

    // Batch process properties to get hostnames
    for (const property of properties) {
      try {
        const cacheKey = `akamai:${customer}:property:${property.propertyId}:hostnames`;
        let hostnames;

        // Check if hostnames are cached
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          hostnames = JSON.parse(cached);
        } else {
          // Fetch hostnames
          const response = await client.request({
            path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`,
            method: 'GET',
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
            },
          });

          hostnames = response.hostnames?.items || [];

          // Cache hostnames
          await this.redis.setex(cacheKey, this.config.ttl!.hostnames!, JSON.stringify(hostnames));
        }

        // Map each hostname to property
        for (const hostname of hostnames) {
          if (hostname.cnameFrom) {
            hostnameMap[hostname.cnameFrom.toLowerCase()] = {
              property,
              hostname,
            };
          }
        }
      } catch (_err) {
        console.error(`[Cache] Error processing property ${property.propertyId}:`, _err);
      }
    }

    // Store the complete mapping
    if (Object.keys(hostnameMap).length > 0) {
      await this.redis.setex(
        `akamai:${customer}:hostnames:map`,
        this.config.ttl!.hostnames!,
        JSON.stringify(hostnameMap),
      );
      console.error(
        `[Cache] Created hostname mapping with ${Object.keys(hostnameMap).length} entries`,
      );
    }
  }

  /**
   * Search with caching
   */
  async search(client: AkamaiClient, query: string, customer = 'default'): Promise<any> {
    const searchKey = `akamai:${customer}:search:${query.toLowerCase()}`;

    // Check cache first
    if (this.enabled && this.redis) {
      try {
        const cached = await this.redis.get(searchKey);
        if (cached) {
          console.error(`[Cache] HIT: Search results for "${query}"`);
          return JSON.parse(cached);
        }
      } catch (_err) {
        console.error('[Cache] Error reading search cache:', _err);
      }
    }

    console.error(`[Cache] MISS: Searching for "${query}"`);

    // Get properties (from cache if available)
    const properties = await this.getProperties(client, customer);
    const results: any[] = [];

    // Quick hostname lookup
    if (this.enabled && this.redis) {
      try {
        const hostnameMapStr = await this.redis.get(`akamai:${customer}:hostnames:map`);
        if (hostnameMapStr) {
          const hostnameMap = JSON.parse(hostnameMapStr);
          const queryLower = query.toLowerCase();

          // Direct hostname match
          if (hostnameMap[queryLower]) {
            results.push({
              type: 'exact_hostname',
              ...hostnameMap[queryLower],
            });
          }

          // Check with www prefix
          if (hostnameMap[`www.${queryLower}`]) {
            results.push({
              type: 'hostname_with_www',
              ...hostnameMap[`www.${queryLower}`],
            });
          }

          // Check without www prefix
          if (queryLower.startsWith('www.') && hostnameMap[queryLower.substring(4)]) {
            results.push({
              type: 'hostname_without_www',
              ...hostnameMap[queryLower.substring(4)],
            });
          }
        }
      } catch (_err) {
        console.error('[Cache] Error checking hostname map:', _err);
      }
    }

    // Search through properties if no exact match
    if (results.length === 0) {
      const queryLower = query.toLowerCase();
      for (const property of properties) {
        if (property.propertyName?.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'property_name',
            property,
          });
        }
      }
    }

    // Cache the results
    if (this.enabled && this.redis && results.length > 0) {
      try {
        await this.redis.setex(searchKey, this.config.ttl!.search!, JSON.stringify(results));
      } catch (_err) {
        console.error('[Cache] Error caching search results:', _err);
      }
    }

    return results;
  }

  /**
   * Invalidate cache for a specific property
   */
  async invalidateProperty(propertyId: string, customer = 'default'): Promise<void> {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const keys = [
        `akamai:${customer}:properties:all`,
        `akamai:${customer}:property:${propertyId}:*`,
        `akamai:${customer}:hostnames:map`,
        `akamai:${customer}:search:*`,
      ];

      for (const pattern of keys) {
        if (pattern.includes('*')) {
          const matchingKeys = await this.redis.keys(pattern);
          if (matchingKeys.length > 0) {
            await this.redis.del(...matchingKeys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }

      console.error(`[Cache] Invalidated cache for property ${propertyId}`);
    } catch (_err) {
      console.error('[Cache] Error invalidating cache:', _err);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.enabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      const keys = await this.redis.keys('akamai:*');

      return {
        enabled: true,
        connected: this.redis.status === 'ready',
        totalKeys: dbSize,
        akamaiKeys: keys.length,
        stats: info,
      };
    } catch (_err) {
      console.error('[Cache] Error getting stats:', _err);
      return { enabled: true, _error: _err instanceof Error ? _err.message : String(_err) };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.enabled = false;
    }
  }
}
