/**
 * External Cache Loader
 * Lazy loads external cache implementation only when needed
 */

import { ICache } from '../types/cache-interface';
import { logger } from '../utils/logger';

export interface ExternalCacheConfig {
  mode?: 'single' | 'cluster' | 'sentinel';
  nodes?: Array<{ host: string; port: number }>;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  lazyConnect?: boolean;
}

let ExternalCacheClass: any = null;
let ioredisAvailable = false;

/**
 * Try to load external cache dependencies
 */
function loadExternalCacheDependencies(): boolean {
  if (ExternalCacheClass !== null) {
    return ioredisAvailable;
  }

  try {
    // Try to require ioredis - will fail if not installed
    require('ioredis');
    
    // If successful, load the external cache implementation
    const module = require('./external-cache-service');
    ExternalCacheClass = module.ExternalCache;
    ioredisAvailable = true;
    
    logger.warn(
      '[Cache] External cache is deprecated and will be removed in v2.0.0. ' +
      'Please migrate to SmartCache for better performance and zero dependencies.'
    );
    
    return true;
  } catch (error) {
    logger.info(
      '[Cache] External cache not available (ioredis not installed). ' +
      'Using SmartCache instead. This is the recommended configuration.'
    );
    ioredisAvailable = false;
    return false;
  }
}

/**
 * Create external cache instance if available
 */
export async function createExternalCache(config: ExternalCacheConfig): Promise<ICache | null> {
  if (!loadExternalCacheDependencies()) {
    return null;
  }

  try {
    const cache = new ExternalCacheClass(config);
    await cache.connect();
    return cache;
  } catch (error) {
    logger.error('[Cache] Failed to create external cache:', error);
    return null;
  }
}

/**
 * Check if external cache is available
 */
export function isExternalCacheAvailable(): boolean {
  return loadExternalCacheDependencies();
}