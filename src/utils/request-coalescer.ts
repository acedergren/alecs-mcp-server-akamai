
// Request type definitions  
type RequestConfig = { path: string; method: string; body?: unknown; headers?: Record<string, string> };
type RequestResponse<T = unknown> = { data: T; status: number; headers: Record<string, string> };
type CoalescedRequest = { id: string; promise: Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void };

/**
 * Request Coalescing Utility - CODE KAI Implementation
 * 
 * KEY: Prevent duplicate API calls for same resource
 * APPROACH: In-memory promise cache with TTL and key normalization
 * IMPLEMENTATION: Thread-safe, memory efficient, auto-cleanup
 * 
 * PERFORMANCE BENEFITS:
 * - Eliminates duplicate concurrent requests
 * - Reduces API rate limit pressure  
 * - Improves response times for duplicate requests
 * - Saves bandwidth and server resources
 */

// Removed unused import: z from 'zod'

/**
 * Request cache entry with metadata
 */
interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  hits: number;
  key: string;
}

/**
 * Coalescer configuration
 */
interface CoalescerConfig {
  /** TTL for cache entries in milliseconds */
  ttl: number;
  /** Maximum cache size before cleanup */
  maxSize: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Request key normalization function
 */
type KeyNormalizer = (key: string, args: unknown) => string;

/**
 * Default configuration for request coalescing
 */
const DEFAULT_CONFIG: CoalescerConfig = {
  ttl: 30000,           // 30 seconds
  maxSize: 1000,        // 1000 requests
  cleanupInterval: 60000, // 1 minute
};

/**
 * Request Coalescer Class
 * 
 * Manages in-flight requests to prevent duplicate API calls.
 * Automatically cleans up expired entries and provides metrics.
 */
export class RequestCoalescer {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: CoalescerConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    hits: 0,
    misses: 0,
    coalesced: 0,
    errors: 0,
  };

  constructor(config: Partial<CoalescerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Coalesce a request - returns existing promise if already in flight
   * 
   * CODE KAI: Type-safe generic implementation with proper error handling
   */
  async coalesce<T>(
    key: string,
    requestFn: () => Promise<T>,
    args?: any,
    normalizer?: KeyNormalizer,
  ): Promise<T> {
    try {
      // Normalize the key for better cache hits
      const normalizedKey = normalizer ? normalizer(key, args) : this.normalizeKey(key, args);
      
      // Check if request is already in flight
      const existing = this.cache.get(normalizedKey);
      if (existing && this.isValid(existing)) {
        existing.hits++;
        this.stats.hits++;
        this.stats.coalesced++;
        return existing.promise;
      }

      // Create new request
      this.stats.misses++;
      const promise = this.executeRequest(requestFn);
      
      // Cache the promise
      this.cache.set(normalizedKey, {
        promise,
        timestamp: Date.now(),
        hits: 1,
        key: normalizedKey,
      });

      // Clean up on completion (success or failure)
      promise
        .finally(() => {
          // Remove from cache after completion to free memory
          setTimeout(() => {
            this.cache.delete(normalizedKey);
          }, 1000); // Keep for 1 second after completion for immediate retries
        });

      return await promise;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Execute request with proper error handling
   */
  private async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      // Re-throw to maintain error propagation
      throw error;
    }
  }

  /**
   * Normalize request key for better cache hits
   * 
   * CODE KAI: Deterministic key generation for consistent caching
   */
  private normalizeKey(key: string, args?: any): string {
    if (!args) {return key;}

    // Sort and serialize args for consistent keys
    const sortedArgs = this.sortObject(args);
    const argsStr = JSON.stringify(sortedArgs);
    return `${key}:${this.hashCode(argsStr)}`;
  }

  /**
   * Sort object keys recursively for consistent serialization
   */
  private sortObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    const sorted: unknown = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        // Skip undefined values to normalize keys
        if (obj[key] !== undefined) {
          sorted[key] = this.sortObject(obj[key]);
        }
      });

    return sorted;
  }

  /**
   * Simple hash function for key generation
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return (Date.now() - entry.timestamp) < this.config.ttl;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   * 
   * CODE KAI: Memory management to prevent memory leaks
   */
  private cleanup(): void {
    const beforeSize = this.cache.size;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }

    // Force cleanup if cache is too large
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      // Remove oldest entries first
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.config.maxSize * 0.2)) // Remove 20%
        .forEach(([key]) => this.cache.delete(key));
    }

    const afterSize = this.cache.size;
    if (beforeSize !== afterSize) {
      console.debug(`[RequestCoalescer] Cleaned up ${beforeSize - afterSize} expired entries`);
    }
  }

  /**
   * Get coalescer statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    coalesced: number;
    errors: number;
    cacheSize: number;
    hitRate: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      coalesced: 0,
      errors: 0,
    };
  }

  /**
   * Destroy the coalescer and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Pre-configured coalescer instances for different use cases
 */
export class PropertyServerCoalescer {
  private static instance?: RequestCoalescer;

  /**
   * Get singleton instance for property server operations
   */
  static getInstance(): RequestCoalescer {
    if (!this.instance) {
      this.instance = new RequestCoalescer({
        ttl: 10000,        // 10 seconds for property operations
        maxSize: 500,      // Moderate cache size
        cleanupInterval: 30000, // 30 second cleanup
      });
    }
    return this.instance;
  }

  /**
   * Destroy singleton instance
   */
  static destroy(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = undefined;
    }
  }
}

/**
 * Key normalizers for common request patterns
 */
export const KeyNormalizers = {
  /**
   * Normalizer for property-related requests
   */
  property: (key: string, args: unknown): string => {
    const { propertyId, version, customer, contractId, groupId } = (args as Record<string, unknown>) || {};
    const parts = [key];
    
    if (propertyId) {parts.push(`prop:${propertyId}`);}
    if (version) {parts.push(`v:${version}`);}
    if (customer) {parts.push(`cust:${customer}`);}
    if (contractId) {parts.push(`ctr:${contractId}`);}
    if (groupId) {parts.push(`grp:${groupId}`);}
    
    return parts.join('|');
  },

  /**
   * Normalizer for search requests
   */
  search: (key: string, args: unknown): string => {
    const { query, propertyName, hostname, contractId, groupId } = (args as Record<string, unknown>) || {};
    const parts = [key];
    
    if (query) {parts.push(`q:${query.toLowerCase()}`);}
    if (propertyName) {parts.push(`name:${propertyName.toLowerCase()}`);}
    if (hostname) {parts.push(`host:${hostname.toLowerCase()}`);}
    if (contractId) {parts.push(`ctr:${contractId}`);}
    if (groupId) {parts.push(`grp:${groupId}`);}
    
    return parts.join('|');
  },

  /**
   * Normalizer for list operations
   */
  list: (key: string, args: unknown): string => {
    const { contractId, groupId, customer, limit, offset } = args || {};
    const parts = [key];
    
    if (contractId) {parts.push(`ctr:${contractId}`);}
    if (groupId) {parts.push(`grp:${groupId}`);}
    if (customer) {parts.push(`cust:${customer}`);}
    if (limit) {parts.push(`lim:${limit}`);}
    if (offset) {parts.push(`off:${offset}`);}
    
    return parts.join('|');
  },
};

/**
 * Utility function for easy coalescing in tool implementations
 */
export async function coalesceRequest<T>(
  operation: string,
  args: unknown,
  requestFn: () => Promise<T>,
  normalizer?: KeyNormalizer,
): Promise<T> {
  const coalescer = PropertyServerCoalescer.getInstance();
  return coalescer.coalesce(operation, requestFn, args, normalizer);
}