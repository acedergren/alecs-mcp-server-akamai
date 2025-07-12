/**
 * Performance Optimization Module - CODE KAI Implementation
 * 
 * KEY: Maximize performance through request coalescing and caching
 * APPROACH: Decorator pattern for transparent optimization
 * IMPLEMENTATION: Zero-overhead wrappers with metrics
 * 
 * This module provides performance enhancements for all tool operations
 * following MCP June 2025 performance guidelines
 */

import { RequestCoalescer, KeyNormalizers } from '../../utils/request-coalescer';
import { UnifiedCacheService as SmartCache } from '../../services/unified-cache-service';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { createLogger } from '../../utils/pino-logger';

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  coalesce?: {
    enabled: boolean;
    ttl?: number;
  };
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    timeout?: number;
  };
  metrics?: {
    enabled: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Default configurations for different operation types
 */
export const PerformanceProfiles = {
  // Read operations: aggressive caching
  READ: {
    cache: { enabled: true, ttl: 300 }, // 5 minutes
    coalesce: { enabled: true, ttl: 10000 }, // 10 seconds
    circuitBreaker: { enabled: true },
    metrics: { enabled: true, logLevel: 'info' as const },
  },
  
  // Write operations: no caching, with coalescing
  WRITE: {
    cache: { enabled: false },
    coalesce: { enabled: true, ttl: 5000 }, // 5 seconds
    circuitBreaker: { enabled: true },
    metrics: { enabled: true, logLevel: 'info' as const },
  },
  
  // List operations: moderate caching
  LIST: {
    cache: { enabled: true, ttl: 60 }, // 1 minute
    coalesce: { enabled: true, ttl: 10000 },
    circuitBreaker: { enabled: true },
    metrics: { enabled: true, logLevel: 'info' as const },
  },
  
  // Status operations: short caching
  STATUS: {
    cache: { enabled: true, ttl: 5 }, // 5 seconds
    coalesce: { enabled: true, ttl: 3000 },
    circuitBreaker: { enabled: true },
    metrics: { enabled: true, logLevel: 'debug' as const },
  },
} as const;

/**
 * Global instances (singletons for efficiency)
 */
const globalCache = new SmartCache({
  maxSize: 10000,
  enableSegmentation: true,
  segmentSize: 1000,
  enableCompression: true,
  adaptiveTTL: true,
  enablePersistence: false, // In-memory only for performance
});

const globalCoalescer = new RequestCoalescer({
  ttl: 10000,
  maxSize: 500,
  cleanupInterval: 30000,
});

const circuitBreakers = new Map<string, CircuitBreaker>();
const logger = createLogger('performance');

/**
 * Get or create circuit breaker for an operation
 */
function getCircuitBreaker(operation: string): CircuitBreaker {
  if (!circuitBreakers.has(operation)) {
    circuitBreakers.set(operation, new CircuitBreaker({
      failureThreshold: 5,
      timeout: 60000, // 1 minute
    }));
  }
  return circuitBreakers.get(operation)!;
}

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
  private metrics = new Map<string, {
    calls: number;
    cacheHits: number;
    cacheMisses: number;
    coalescedCalls: number;
    errors: number;
    totalTime: number;
  }>();
  
  record(operation: string, metric: 'calls' | 'cacheHits' | 'cacheMisses' | 'coalescedCalls' | 'errors' | 'totalTime', value = 1): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        calls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        coalescedCalls: 0,
        errors: 0,
        totalTime: 0,
      });
    }
    
    const stats = this.metrics.get(operation)!;
    (stats as any)[metric] += value;
  }
  
  getStats(operation: string) {
    const stats = this.metrics.get(operation);
    if (!stats) return null;
    
    const hitRate = stats.calls > 0 
      ? ((stats.cacheHits / stats.calls) * 100).toFixed(2)
      : '0.00';
    
    const avgTime = stats.calls > 0
      ? (stats.totalTime / stats.calls).toFixed(2)
      : '0.00';
    
    return {
      ...stats,
      hitRate: `${hitRate}%`,
      avgTime: `${avgTime}ms`,
    };
  }
  
  getAllStats() {
    const allStats: Record<string, any> = {};
    for (const [operation, _] of this.metrics) {
      allStats[operation] = this.getStats(operation);
    }
    return allStats;
  }
}

const metrics = new PerformanceMetrics();

/**
 * Create a cache key for an operation
 */
function createCacheKey(
  operation: string,
  customer: string,
  params: Record<string, unknown>
): string {
  // Remove undefined values and sort keys for consistency
  const cleanParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  return `${customer}:${operation}:${JSON.stringify(cleanParams)}`;
}

/**
 * Wrap a function with caching
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string,
  config: PerformanceConfig['cache'] = PerformanceProfiles.READ.cache
): T {
  if (!config?.enabled) {
    return fn;
  }
  
  return (async (...args: Parameters<T>) => {
    const [client, params] = args;
    const customer = params?.customer || client?.customer || 'default';
    const cacheKey = createCacheKey(operation, customer, params || {});
    
    // Try cache first
    const cached = await globalCache.get(cacheKey);
    if (cached) {
      metrics.record(operation, 'cacheHits');
      return cached;
    }
    
    metrics.record(operation, 'cacheMisses');
    
    // Execute function
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      
      // Cache the result
      await globalCache.set(cacheKey, result, config.ttl);
      
      metrics.record(operation, 'totalTime', Date.now() - startTime);
      return result;
    } catch (error) {
      metrics.record(operation, 'errors');
      throw error;
    }
  }) as T;
}

/**
 * Wrap a function with request coalescing
 */
export function withCoalescing<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string,
  config: PerformanceConfig['coalesce'] = PerformanceProfiles.READ.coalesce
): T {
  if (!config?.enabled) {
    return fn;
  }
  
  return (async (...args: Parameters<T>) => {
    const [, params] = args;
    
    const normalizer = operation.includes('property') ? KeyNormalizers.property :
                      operation.includes('search') ? KeyNormalizers.search :
                      operation.includes('list') ? KeyNormalizers.list :
                      undefined;
    
    const result = await globalCoalescer.coalesce(
      operation,
      async () => {
        metrics.record(operation, 'calls');
        return fn(...args);
      },
      params,
      normalizer
    );
    
    // Track if this was a coalesced call
    const stats = globalCoalescer.getStats();
    if (stats.coalesced > 0) {
      metrics.record(operation, 'coalescedCalls');
    }
    
    return result;
  }) as T;
}

/**
 * Wrap a function with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string,
  config: PerformanceConfig['circuitBreaker'] = PerformanceProfiles.READ.circuitBreaker
): T {
  if (!config?.enabled) {
    return fn;
  }
  
  return (async (...args: Parameters<T>) => {
    const breaker = getCircuitBreaker(operation);
    
    return breaker.execute(async () => {
      return fn(...args);
    });
  }) as T;
}

/**
 * Comprehensive performance wrapper combining all optimizations
 */
export function performanceOptimized<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string,
  config: PerformanceConfig = PerformanceProfiles.READ
): T {
  let wrapped = fn;
  
  // Apply optimizations in order
  if (config.circuitBreaker?.enabled) {
    wrapped = withCircuitBreaker(wrapped, operation, config.circuitBreaker);
  }
  
  if (config.coalesce?.enabled) {
    wrapped = withCoalescing(wrapped, operation, config.coalesce);
  }
  
  if (config.cache?.enabled) {
    wrapped = withCache(wrapped, operation, config.cache);
  }
  
  // Add metrics wrapper
  if (config.metrics?.enabled) {
    const metricsWrapped = (async (...args: Parameters<T>) => {
      const startTime = Date.now();
      try {
        const result = await wrapped(...args);
        const duration = Date.now() - startTime;
        
        if (config.metrics!.logLevel === 'debug' || 
            (config.metrics!.logLevel === 'info' && duration > 1000)) {
          logger.info(`[PERF] ${operation} completed in ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        if (config.metrics!.logLevel !== 'error') {
          logger.error(`[PERF] ${operation} failed:`, error);
        }
        throw error;
      }
    }) as T;
    
    return metricsWrapped;
  }
  
  return wrapped;
}

/**
 * Tool-specific performance wrappers
 */
export const PerformanceWrappers = {
  // Property operations
  propertyList: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'property.list', PerformanceProfiles.LIST),
  
  propertyGet: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'property.get', PerformanceProfiles.READ),
  
  propertyCreate: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'property.create', PerformanceProfiles.WRITE),
  
  // DNS operations
  dnsZoneList: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'dns.zones.list', PerformanceProfiles.LIST),
  
  dnsRecordGet: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'dns.records.get', PerformanceProfiles.READ),
  
  // Status operations
  activationStatus: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    performanceOptimized(fn, 'activation.status', PerformanceProfiles.STATUS),
  
  // Generic wrappers
  readOperation: <T extends (...args: any[]) => Promise<any>>(fn: T, operation: string) =>
    performanceOptimized(fn, operation, PerformanceProfiles.READ),
  
  writeOperation: <T extends (...args: any[]) => Promise<any>>(fn: T, operation: string) =>
    performanceOptimized(fn, operation, PerformanceProfiles.WRITE),
  
  listOperation: <T extends (...args: any[]) => Promise<any>>(fn: T, operation: string) =>
    performanceOptimized(fn, operation, PerformanceProfiles.LIST),
} as const;

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  // Invalidate specific cache entries
  invalidate: async (pattern: string) => {
    await globalCache.scanAndDelete(pattern);
  },
  
  // Invalidate all entries for a customer
  invalidateCustomer: async (customer: string) => {
    await globalCache.scanAndDelete(`${customer}:*`);
  },
  
  // Invalidate all entries for a domain
  invalidateDomain: async (domain: string, customer = '*') => {
    await globalCache.scanAndDelete(`${customer}:${domain}.*`);
  },
  
  // Clear entire cache
  clearAll: async () => {
    await globalCache.flushAll();
  },
};

/**
 * Performance monitoring API
 */
export const PerformanceMonitor = {
  // Get metrics for a specific operation
  getOperationStats: (operation: string) => metrics.getStats(operation),
  
  // Get all metrics
  getAllStats: () => metrics.getAllStats(),
  
  // Get cache statistics
  getCacheStats: async () => globalCache.getDetailedStats(),
  
  // Get coalescer statistics  
  getCoalescerStats: () => globalCoalescer.getStats(),
  
  // Get circuit breaker states
  getCircuitBreakerStates: () => {
    const states: Record<string, string> = {};
    for (const [operation, breaker] of circuitBreakers) {
      states[operation] = breaker.getStatus().state;
    }
    return states;
  },
  
  // Reset all metrics
  reset: async () => {
    (metrics as any).metrics.clear();
    await globalCache.flushAll();
    globalCoalescer.clear();
    circuitBreakers.clear();
  },
};