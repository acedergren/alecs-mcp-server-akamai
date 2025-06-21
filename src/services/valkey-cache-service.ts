/**
 * Valkey (Redis) Cache Service for ALECS MCP Server
 * High-performance caching with smart invalidation and monitoring
 */

import Redis, { Cluster, ClusterNode as _ClusterNode } from 'ioredis';

import { AkamaiClient as _AkamaiClient } from '../akamai-client';

export interface ValkeyConfig {
  mode?: 'single' | 'cluster' | 'sentinel';
  nodes?: Array<{ host: string; port: number }>;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string; // master name for sentinel
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  lazyConnect?: boolean;
}

export interface CacheOptions {
  refreshThreshold?: number; // percentage of TTL (0.2 = 20%)
  softTTL?: number; // seconds to serve stale while refreshing
  lockTimeout?: number; // seconds for lock timeout
}

// TTL configuration in seconds
export const CacheTTL = {
  // Frequently changing data
  PROPERTIES_LIST: 300, // 5 minutes
  SEARCH_RESULTS: 300, // 5 minutes

  // Moderately stable data
  PROPERTY_DETAILS: 900, // 15 minutes
  HOSTNAMES: 1800, // 30 minutes
  ACTIVATIONS: 600, // 10 minutes

  // Stable data
  PROPERTY_RULES: 7200, // 2 hours
  CONTRACTS: 86400, // 24 hours
  GROUPS: 86400, // 24 hours
  CP_CODES: 43200, // 12 hours

  // Computed/derived data
  HOSTNAME_MAP: 1800, // 30 minutes
  PROPERTY_TREE: 3600, // 1 hour
  SEARCH_INDEX: 600, // 10 minutes
} as const;

export class ValkeyCache {
  private client: Redis | Cluster;
  private readonly prefix: string;
  private connected = false;
  private refreshingKeys = new Set<string>();
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    apiCallsSaved: 0,
  };

  constructor(config: ValkeyConfig = {}) {
    this.prefix = config.keyPrefix || 'akamai:';

    // Initialize based on mode
    if (config.mode === 'cluster') {
      this.client = new Cluster(
        config.nodes || [
          {
            host: 'localhost',
            port: 6379,
          },
        ],
        {
          enableOfflineQueue: config.enableOfflineQueue !== false,
          enableReadyCheck: config.enableReadyCheck !== false,
          lazyConnect: config.lazyConnect !== false,
          redisOptions: {
            password: config.password,
          },
        },
      );
    } else if (config.mode === 'sentinel') {
      this.client = new Redis({
        sentinels: config.sentinels || [{ host: 'localhost', port: 26379 }],
        name: config.name || 'mymaster',
        password: config.password,
        db: config.db || 0,
        enableOfflineQueue: config.enableOfflineQueue !== false,
        lazyConnect: config.lazyConnect !== false,
      });
    } else {
      // Single node mode (default)
      this.client = new Redis({
        host: config.nodes?.[0]?.host || process.env.VALKEY_HOST || 'localhost',
        port: config.nodes?.[0]?.port || parseInt(process.env.VALKEY_PORT || '6379'),
        password: config.password || process.env.VALKEY_PASSWORD,
        db: config.db || 0,
        enableOfflineQueue: config.enableOfflineQueue !== false,
        connectTimeout: config.connectTimeout || 10000,
        lazyConnect: config.lazyConnect !== false,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('[Valkey] Max retries reached, disabling cache');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('[Valkey] Error:', err.message);
      this.connected = false;
      this.metrics.errors++;
    });

    this.client.on('connect', () => {
      console.error('[Valkey] Connected successfully');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.error('[Valkey] Ready to accept commands');
      this.connected = true;
    });

    this.client.on('close', () => {
      console.error('[Valkey] Connection closed');
      this.connected = false;
    });
  }

  /**
   * Connect to Valkey (if using lazy connect)
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.connected && this.client.status === 'ready';
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);

      if (value) {
        this.metrics.hits++;
        this.metrics.apiCallsSaved++;
        await this.recordHit(key);
        return JSON.parse(value);
      } else {
        this.metrics.misses++;
        await this.recordMiss(key);
        return null;
      }
    } catch (_err) {
      console.error(`[Valkey] Error getting ${key}:`, _err);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      const serialized = JSON.stringify(value);

      // Check size before storing (Redis has 512MB limit per key)
      if (serialized.length > 50 * 1024 * 1024) {
        // 50MB warning threshold
        console.error(
          `[Valkey] Warning: Large value for ${key}: ${(serialized.length / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      await this.client.setex(fullKey, ttl, serialized);
      return true;
    } catch (_err) {
      console.error(`[Valkey] Error setting ${key}:`, _err);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete key(s) from cache
   */
  async del(keys: string | string[]): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const fullKeys = keysArray.map((k) => this.buildKey(k));
      return await this.client.del(...fullKeys);
    } catch (_err) {
      console.error('[Valkey] Error deleting keys:', _err);
      return 0;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      const fullKey = this.buildKey(key);
      return await this.client.ttl(fullKey);
    } catch (_err) {
      console.error(`[Valkey] Error getting TTL for ${key}:`, _err);
      return -1;
    }
  }

  /**
   * Smart get with automatic refresh
   */
  async getWithRefresh<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    const ttlRemaining = await this.ttl(key);

    // Return cached if still fresh
    if (cached && ttlRemaining > 0) {
      // Trigger background refresh if approaching expiry
      const refreshAt = ttl * (options.refreshThreshold || 0.2);
      if (ttlRemaining < refreshAt && !this.refreshingKeys.has(key)) {
        this.refreshInBackground(key, ttl, fetchFn);
      }
      return cached;
    }

    // Use stale-while-revalidate pattern
    if (cached && options.softTTL && ttlRemaining > -options.softTTL) {
      if (!this.refreshingKeys.has(key)) {
        this.refreshInBackground(key, ttl, fetchFn);
      }
      return cached;
    }

    // Fetch with lock to prevent stampede
    return this.getWithLock(key, ttl, fetchFn, options.lockTimeout || 30);
  }

  /**
   * Get with lock to prevent cache stampede
   */
  private async getWithLock<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    lockTimeout = 30,
  ): Promise<T> {
    const lockKey = `${key}:lock`;

    // Try to acquire lock
    const lock = await this.set(lockKey, '1', lockTimeout);

    if (!lock) {
      // Another process is fetching, wait and retry
      await this.sleep(100);
      const cached = await this.get<T>(key);
      if (cached) {
        return cached;
      }

      // Retry with exponential backoff
      return this.getWithLock(key, ttl, fetchFn, lockTimeout);
    }

    try {
      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } finally {
      await this.del(lockKey);
    }
  }

  /**
   * Refresh cache in background
   */
  private async refreshInBackground<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
  ): Promise<void> {
    this.refreshingKeys.add(key);

    try {
      const data = await fetchFn();
      await this.set(key, data, ttl);
    } catch (_err) {
      console.error(`[Valkey] Background refresh failed for ${key}:`, _err);
    } finally {
      this.refreshingKeys.delete(key);
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T = any>(keys: string[]): Promise<Map<string, T>> {
    if (!this.isAvailable() || keys.length === 0) {
      return new Map();
    }

    try {
      const fullKeys = keys.map((k) => this.buildKey(k));
      const values = await this.client.mget(...fullKeys);

      const result = new Map<string, T>();
      values.forEach((value, index) => {
        if (value) {
          try {
            result.set(keys[index], JSON.parse(value));
            this.metrics.hits++;
          } catch (_err) {
            console.error(`[Valkey] Error parsing value for ${keys[index]}`);
          }
        } else {
          this.metrics.misses++;
        }
      });

      return result;
    } catch (_err) {
      console.error('[Valkey] Error in mget:', _err);
      return new Map();
    }
  }

  /**
   * Scan and delete keys matching pattern
   */
  async scanAndDelete(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    let deleted = 0;
    const fullPattern = this.buildKey(pattern);

    // For single Redis instance
    if (this.client instanceof Redis) {
      return new Promise((resolve, reject) => {
        const stream = (this.client as Redis).scanStream({
          match: fullPattern,
          count: 100,
        });

        stream.on('data', async (keys: string[]) => {
          if (keys.length) {
            try {
              deleted += await this.client.del(...keys);
            } catch (_err) {
              console.error('[Valkey] Error deleting batch:', _err);
            }
          }
        });

        stream.on('end', () => resolve(deleted));
        stream.on('error', reject);
      });
    } else {
      // For cluster mode, use scan with cursor
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          try {
            deleted += await this.client.del(...keys);
          } catch (_err) {
            console.error('[Valkey] Error deleting batch:', _err);
          }
        }
      } while (cursor !== '0');

      return deleted;
    }
  }

  /**
   * Record hit for analytics
   */
  private async recordHit(key: string): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const statsKey = this.buildKey(`stats:${date}:hits`);
      await this.client.hincrby(statsKey, key, 1);
      await this.client.expire(statsKey, 7 * 86400); // Keep for 7 days
    } catch (_err) {
      // Ignore stats errors
    }
  }

  /**
   * Record miss for analytics
   */
  private async recordMiss(key: string): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const statsKey = this.buildKey(`stats:${date}:misses`);
      await this.client.hincrby(statsKey, key, 1);
      await this.client.expire(statsKey, 7 * 86400); // Keep for 7 days
    } catch (_err) {
      // Ignore stats errors
    }
  }

  /**
   * Get cache hit rate
   */
  async getHitRate(_pattern?: string): Promise<number> {
    const total = this.metrics.hits + this.metrics.misses;
    if (total === 0) {
      return 0;
    }
    return (this.metrics.hits / total) * 100;
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      hitRate:
        this.metrics.hits + this.metrics.misses > 0
          ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
          : 0,
    };
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.client.flushdb();
      console.error('[Valkey] Cache cleared');
    } catch (_err) {
      console.error('[Valkey] Error flushing cache:', _err);
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
