/**
 * Cache Service Interface
 * Common interface for cache implementations
 */

export interface CacheService {
  /**
   * Get a value from cache
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL
   */
  set<T = any>(key: string, value: T, ttl: number): Promise<boolean>;

  /**
   * Delete one or more keys
   */
  del(keys: string | string[]): Promise<number>;

  /**
   * Get TTL for a key
   */
  ttl?(key: string): Promise<number>;

  /**
   * Flush all cache entries
   */
  flushAll?(): Promise<void>;

  /**
   * Close cache connection
   */
  close?(): Promise<void>;
}