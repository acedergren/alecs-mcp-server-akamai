/**
 * Cache Service Singleton
 * 
 * CODE KAI: Provides global access to cache service for mutation operations
 * to ensure proper cache invalidation and data consistency
 */

import { AkamaiCacheService } from './akamai-cache-service';

let globalCacheService: AkamaiCacheService | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Get or create the global cache service instance
 * Ensures only one instance exists and is properly initialized
 */
export async function getCacheService(): Promise<AkamaiCacheService> {
  if (!globalCacheService) {
    globalCacheService = new AkamaiCacheService();
    
    // Initialize only once, even if called multiple times concurrently
    if (!initializationPromise) {
      initializationPromise = globalCacheService.initialize().catch(err => {
        console.error('[CacheService] Failed to initialize cache:', err);
        // Don't throw - cache is optional for functionality
      });
    }
    
    await initializationPromise;
  }
  
  return globalCacheService;
}

/**
 * Check if cache service is available
 * Useful for conditional cache operations
 */
export function isCacheAvailable(): boolean {
  return globalCacheService !== null && globalCacheService.isAvailable();
}

/**
 * Close cache connection (for cleanup)
 */
export async function closeCacheService(): Promise<void> {
  if (globalCacheService) {
    await globalCacheService.close();
    globalCacheService = null;
    initializationPromise = null;
  }
}