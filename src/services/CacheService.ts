/**
 * Cache Service Export
 * Provides a unified cache interface
 */

import { ValkeyCache } from './valkey-cache-service';

// Export ValkeyCache as CacheService for backward compatibility
export { ValkeyCache as CacheService } from './valkey-cache-service';

// Also export the actual implementation
export { ValkeyCache } from './valkey-cache-service';

// Export cache types
export type { ValkeyConfig } from './valkey-cache-service';
export { CacheTTL } from './valkey-cache-service';

// Default cache instance factory
export function createCacheService(config?: any): ValkeyCache {
  return new ValkeyCache(config);
}
