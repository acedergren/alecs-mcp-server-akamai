/**
 * Cache Service - SmartCache Implementation Only
 * Simplified cache service using only in-memory SmartCache
 * OAuth and Valkey/Redis dependencies removed
 */

import { SmartCache } from '../utils/smart-cache';

// Export SmartCache as CacheService for backward compatibility
export { SmartCache as CacheService } from '../utils/smart-cache';

// Export cache types
export type { SmartCacheOptions } from '../utils/smart-cache';

// Default cache instance factory
export function createCacheService(options?: any): SmartCache {
  return new SmartCache(options);
}