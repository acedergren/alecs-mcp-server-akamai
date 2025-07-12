/**
 * Cache Interface - CODE KAI Implementation
 * 
 * KEY: Type-safe cache abstraction for all storage operations
 * APPROACH: Interface segregation with clear method contracts
 * IMPLEMENTATION: Async-first design with TTL and pattern support
 * 
 * This interface defines the contract for all cache implementations
 * in ALECS, enabling easy testing and pluggable cache backends.
 */

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memory?: number;
  evictions?: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  enableSegmentation?: boolean;
  enableCompression?: boolean;
  enablePersistence?: boolean;
}

/**
 * Core cache interface
 * 
 * All cache implementations must implement this interface
 * to ensure consistency across the ALECS ecosystem.
 */
export interface ICache {
  /**
   * Get value from cache
   */
  get<T = any>(key: string): Promise<T | undefined>;
  
  /**
   * Set value in cache with optional TTL
   */
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  
  /**
   * Delete key from cache
   */
  del(key: string): Promise<void>;
  
  /**
   * Check if key exists in cache
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Clear all cache entries
   */
  flushAll(): Promise<void>;
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats;
  
  /**
   * Get cache size (number of entries)
   */
  getSize(): number;
}

/**
 * Advanced cache interface with additional features
 */
export interface IAdvancedCache extends ICache {
  /**
   * Get value with automatic refresh
   */
  getWithRefresh<T = any>(
    key: string,
    ttl: number,
    refreshFn: () => Promise<T>,
    options?: { refreshThreshold?: number; softTTL?: number }
  ): Promise<T>;
  
  /**
   * Scan and delete keys matching pattern
   */
  scanAndDelete(pattern: string): Promise<number>;
  
  /**
   * Get multiple keys at once
   */
  mget<T = any>(keys: string[]): Promise<(T | undefined)[]>;
  
  /**
   * Set multiple keys at once
   */
  mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
  
  /**
   * Increment numeric value
   */
  incr(key: string, delta?: number): Promise<number>;
  
  /**
   * Set expiration for existing key
   */
  expire(key: string, ttl: number): Promise<boolean>;
  
  /**
   * Get time to live for key
   */
  ttl(key: string): Promise<number>;
}

/**
 * Specialized cache interface for property operations
 */
export interface IPropertyCache extends IAdvancedCache {
  /**
   * Get all properties for a customer
   */
  getProperties(client: any, customer?: string): Promise<any[]>;
  
  /**
   * Get property by ID
   */
  getProperty(client: any, propertyId: string, customer?: string): Promise<any | null>;
  
  /**
   * Invalidate all property-related cache entries
   */
  invalidateProperty(propertyId: string, customer: string): Promise<void>;
  
  /**
   * Cache property search results
   */
  cachePropertySearch(
    customer: string,
    query: string,
    results: any[],
    ttl?: number
  ): Promise<void>;
  
  /**
   * Get cached search results
   */
  getPropertySearch(customer: string, query: string): Promise<any[] | undefined>;
}