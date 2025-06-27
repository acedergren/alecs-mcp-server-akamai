/**
 * Cache Factory
 * Creates SmartCache implementation (Valkey/Redis deprecated)
 */

import { ICache } from '../types/cache-interface';
import { SmartCache } from '../utils/smart-cache';
import { logger } from '../utils/logger';

export interface CacheFactoryOptions {
  type?: 'smart';
  smartCacheOptions?: {
    maxSize?: number;
    maxMemoryMB?: number;
    defaultTTL?: number;
  };
}

export class CacheFactory {
  /**
   * Create cache instance based on configuration
   */
  static async create(options: CacheFactoryOptions = {}): Promise<ICache> {
    logger.info('[Cache] Using SmartCache - zero dependencies, excellent performance');
    return this.createSmartCache(options.smartCacheOptions);
  }

  private static createSmartCache(options?: any): ICache {
    const smartCache = new SmartCache({
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