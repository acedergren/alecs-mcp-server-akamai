/**
 * Customer-Aware Cache Wrapper
 * Enforces customer isolation for cache keys
 */

import { SmartCache } from './smart-cache';


// Cache type definitions
type CacheKey = string;
type CacheValue = unknown;
type CacheOptions = { ttl?: number; customer?: string; tags?: string[] };
type CacheEntry = { value: CacheValue; expires: number; tags?: string[] };

/**
 * Cache wrapper that enforces customer-scoped cache keys
 */
export class CustomerAwareCache<T = unknown> {
  private cache: SmartCache<T>;
  private customer: string;
  
  constructor(cache: SmartCache<T>, customer: string) {
    if (!customer) {
      throw new Error('Customer identifier is required for cache operations');
    }
    this.cache = cache;
    this.customer = customer;
  }
  
  /**
   * Get customer-scoped cache key
   */
  private getCacheKey(key: string): string {
    // Ensure key doesn't already contain customer prefix
    if (key.startsWith(`${this.customer}:`)) {
      return key;
    }
    return `${this.customer}:${key}`;
  }
  
  /**
   * Get value from cache with customer isolation
   */
  async get<V extends T = T>(key: string): Promise<V | null> {
    return this.cache.get<V>(this.getCacheKey(key));
  }
  
  /**
   * Set value in cache with customer isolation
   */
  async set<V = T>(key: string, value: V, ttl?: number): Promise<boolean> {
    return this.cache.set(this.getCacheKey(key), value, ttl);
  }
  
  /**
   * Delete key from cache with customer isolation
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(this.getCacheKey(key));
  }
  
  /**
   * Clear all keys for this customer
   */
  async clearCustomer(): Promise<void> {
    const pattern = `${this.customer}:*`;
    await this.cache.clearPattern(pattern);
  }
  
  /**
   * Get multiple keys with customer isolation
   */
  async mget<V extends T = T>(keys: string[]): Promise<Map<string, V>> {
    const scopedKeys = keys.map(key => this.getCacheKey(key));
    const results = await this.cache.mget<V>(scopedKeys);
    
    // Convert back to original keys
    const unscoped = new Map<string, V>();
    for (const [scopedKey, value] of results) {
      const originalKey = scopedKey.replace(`${this.customer}:`, '');
      unscoped.set(originalKey, value);
    }
    return unscoped;
  }
  
  /**
   * Get with refresh using customer isolation
   */
  async getWithRefresh<V>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<V>,
    options?: { refreshThreshold?: number; softTTL?: number }
  ): Promise<V> {
    return this.cache.getWithRefresh(
      this.getCacheKey(key),
      ttl,
      fetchFn,
      options
    );
  }
  
  /**
   * Check if key exists with customer isolation
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(this.getCacheKey(key));
  }
  
  /**
   * Get TTL for key with customer isolation
   */
  async ttl(key: string): Promise<number> {
    return this.cache.ttl(this.getCacheKey(key));
  }
  
  /**
   * Get customer-specific metrics
   */
  getCustomerMetrics(): { totalKeys: number; memoryUsage: number } {
    // This would need implementation in SmartCache to track per-customer metrics
    // For now, return placeholder
    return {
      totalKeys: 0,
      memoryUsage: 0
    };
  }
}

/**
 * Factory to create customer-aware cache instances
 */
export class CustomerCacheFactory {
  private baseCache: SmartCache<unknown>;
  private customerCaches: Map<string, CustomerAwareCache<unknown>> = new Map();
  
  constructor(baseCache: SmartCache<unknown>) {
    this.baseCache = baseCache;
  }
  
  /**
   * Get or create customer-specific cache wrapper
   */
  getCustomerCache<T = unknown>(customer: string): CustomerAwareCache<T> {
    if (!customer) {
      throw new Error('Customer identifier is required');
    }
    
    if (!this.customerCaches.has(customer)) {
      this.customerCaches.set(
        customer,
        new CustomerAwareCache<T>(this.baseCache, customer)
      );
    }
    
    return this.customerCaches.get(customer) as CustomerAwareCache<T>;
  }
  
  /**
   * Clear all caches for a specific customer
   */
  async clearCustomer(customer: string): Promise<void> {
    const cache = this.getCustomerCache(customer);
    await cache.clearCustomer();
    this.customerCaches.delete(customer);
  }
}