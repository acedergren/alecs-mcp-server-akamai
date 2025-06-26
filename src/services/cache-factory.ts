/**
 * Cache Factory
 * Creates appropriate cache implementation based on configuration
 */

import { ICache } from '../types/cache-interface';
import { EnhancedSmartCache } from '../utils/enhanced-smart-cache';
import { createExternalCache, isExternalCacheAvailable } from './external-cache-loader';
import { logger } from '../utils/logger';

export interface CacheFactoryOptions {
  type?: 'smart' | 'external' | 'auto';
  smartCacheOptions?: {
    maxSize?: number;
    maxMemoryMB?: number;
    defaultTTL?: number;
  };
  externalCacheOptions?: {
    host?: string;
    port?: number;
    password?: string;
  };
}

export class CacheFactory {
  /**
   * Create cache instance based on configuration
   */
  static async create(options: CacheFactoryOptions = {}): Promise<ICache> {
    const cacheType = options.type || process.env.CACHE_TYPE || 'auto';
    
    switch (cacheType) {
      case 'smart':
        return this.createSmartCache(options.smartCacheOptions);
        
      case 'external':
        const external = await createExternalCache(options.externalCacheOptions || {});
        if (!external) {
          logger.warn('[Cache] External cache requested but not available, falling back to SmartCache');
          return this.createSmartCache(options.smartCacheOptions);
        }
        return external;
        
      case 'auto':
      default:
        // Auto-detect: Always prefer SmartCache unless external is explicitly configured
        if (process.env.CACHE_HOST) {
          logger.info('[Cache] External cache configuration detected, checking availability...');
          if (isExternalCacheAvailable()) {
            const external = await createExternalCache(options.externalCacheOptions || {});
            if (external) {
              // Test connection
              try {
                await external.set('test:connection', true, 1);
                await external.del('test:connection');
                logger.info('[Cache] Using external cache (deprecated - consider migrating to SmartCache)');
                return external;
              } catch (error) {
                logger.warn('[Cache] External cache connection failed, using SmartCache instead');
              }
            }
          }
        }
        
        logger.info('[Cache] Using SmartCache (recommended) - zero dependencies, excellent performance');
        return this.createSmartCache(options.smartCacheOptions);
    }
  }

  private static createSmartCache(options?: any): ICache {
    const smartCache = new EnhancedSmartCache({
      maxSize: options?.maxSize || parseInt(process.env.CACHE_MAX_SIZE || '10000'),
      maxMemoryMB: options?.maxMemoryMB || parseInt(process.env.CACHE_MAX_MEMORY_MB || '100'),
      defaultTTL: options?.defaultTTL || parseInt(process.env.CACHE_DEFAULT_TTL || '300'),
      evictionPolicy: (process.env.CACHE_EVICTION_POLICY as any) || 'LRU',
      enableMetrics: process.env.CACHE_METRICS !== 'false',
      enableCompression: process.env.CACHE_COMPRESSION !== 'false',
      compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '10240'),
      enablePersistence: process.env.CACHE_PERSISTENCE === 'true',
      persistencePath: process.env.CACHE_PERSISTENCE_PATH || '.cache/smart-cache.json',
      adaptiveTTL: process.env.CACHE_ADAPTIVE_TTL !== 'false',
      requestCoalescing: process.env.CACHE_REQUEST_COALESCING !== 'false',
    });

    // Add cache event logging if debug mode
    if (process.env.DEBUG === 'true') {
      smartCache.on('hit', (key) => logger.debug(`[SmartCache] Hit: ${key}`));
      smartCache.on('miss', (key) => logger.debug(`[SmartCache] Miss: ${key}`));
      smartCache.on('evict', (key) => logger.debug(`[SmartCache] Evicted: ${key}`));
    }

    return smartCache;
  }

}

/**
 * Default cache instance (singleton)
 */
let defaultCache: ICache | null = null;

export async function getDefaultCache(): Promise<ICache> {
  if (!defaultCache) {
    defaultCache = await CacheFactory.create();
  }
  return defaultCache;
}

export async function resetDefaultCache(): Promise<void> {
  if (defaultCache) {
    await defaultCache.close();
    defaultCache = null;
  }
}