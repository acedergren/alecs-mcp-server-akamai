/**
 * Example: Custom Cache Adapter
 * 
 * This example shows how to implement a custom cache adapter
 * for distributed caching needs after external cache is removed.
 */

import { ICache, CacheMetrics } from '../src/types/cache-interface';

/**
 * Example Redis-based cache adapter
 */
export class CustomRedisCache implements ICache {
  private client: any; // Your Redis client
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    apiCallsSaved: 0,
    hitRate: 0,
  };

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value) {
        this.metrics.hits++;
        this.metrics.apiCallsSaved++;
        this.updateHitRate();
        return JSON.parse(value);
      }
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.metrics.errors++;
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  async del(keys: string | string[]): Promise<number> {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    try {
      return await this.client.del(...keysArray);
    } catch (error) {
      this.metrics.errors++;
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      return -1;
    }
  }

  async getWithRefresh<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    options?: any
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const fresh = await fetchFn();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  async scanAndDelete(pattern: string): Promise<number> {
    // Implement pattern-based deletion
    let deleted = 0;
    const stream = this.client.scanStream({ match: pattern });
    
    return new Promise((resolve, reject) => {
      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          deleted += await this.del(keys);
        }
      });
      stream.on('end', () => resolve(deleted));
      stream.on('error', reject);
    });
  }

  async flushAll(): Promise<void> {
    await this.client.flushdb();
  }

  isAvailable(): boolean {
    return this.client && this.client.status === 'ready';
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}

/**
 * Usage example:
 * 
 * import Redis from 'ioredis';
 * import { AkamaiCacheService } from './services/akamai-cache-service';
 * 
 * const redisClient = new Redis({ host: 'localhost', port: 6379 });
 * const customCache = new CustomRedisCache(redisClient);
 * const cacheService = new AkamaiCacheService(customCache);
 */