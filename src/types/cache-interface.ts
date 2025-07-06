/**
 * Common Cache Interface
 * Allows seamless switching between different cache implementations
 */

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  apiCallsSaved: number;
  hitRate: number;
  [key: string]: unknown;
}

export interface CacheOptions {
  refreshThreshold?: number;
  softTTL?: number;
  lockTimeout?: number;
}

export interface ICache {
  /**
   * Get value from cache
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL (in seconds)
   */
  set<T = unknown>(key: string, value: T, ttl: number): Promise<boolean>;

  /**
   * Delete key(s) from cache
   */
  del(keys: string | string[]): Promise<number>;

  /**
   * Get remaining TTL for a key (in seconds)
   */
  ttl(key: string): Promise<number>;

  /**
   * Smart get with automatic refresh
   */
  getWithRefresh<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;

  /**
   * Batch get multiple keys
   */
  mget<T = unknown>(keys: string[]): Promise<Map<string, T>>;

  /**
   * Scan and delete keys matching pattern
   */
  scanAndDelete(pattern: string): Promise<number>;

  /**
   * Clear all cache entries
   */
  flushAll(): Promise<void>;

  /**
   * Check if cache is available
   */
  isAvailable(): boolean;

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics;

  /**
   * Close cache connection
   */
  close(): Promise<void>;
}