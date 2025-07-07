/**
 * Cache Middleware
 * 
 * Provides response caching with TTL and size management
 */

import { createHash } from 'crypto';
import { Middleware } from '../base-mcp-server';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  ttl?: number; // Default TTL in seconds
  maxSize?: number; // Max cache entries
  keyGenerator?: (request: any) => string;
  excludeTools?: string[]; // Tools to exclude from caching
}

export function cacheMiddleware(config: CacheConfig = {}): Middleware {
  const cache = new Map<string, CacheEntry>();
  const { ttl = 300, maxSize = 1000, excludeTools = [] } = config;
  
  const generateKey = config.keyGenerator || ((request) => {
    const { name, args } = request;
    const hash = createHash('sha256')
      .update(JSON.stringify({ name, args }))
      .digest('hex');
    return `${name}:${hash}`;
  });
  
  const isExpired = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  };
  
  const evictOldest = () => {
    if (cache.size >= maxSize) {
      const oldest = Array.from(cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        cache.delete(oldest[0]);
      }
    }
  };
  
  return {
    name: 'cache',
    before: async (request) => {
      const { name } = request;
      
      // Skip excluded tools
      if (excludeTools.includes(name)) {
        return request;
      }
      
      const key = generateKey(request);
      const entry = cache.get(key);
      
      if (entry && !isExpired(entry)) {
        // Return cached response
        return {
          ...request,
          cached: true,
          cachedResponse: entry.data,
        };
      }
      
      // Remove expired entry
      if (entry) {
        cache.delete(key);
      }
      
      return request;
    },
    after: async (response) => {
      const request = response._request;
      
      // Don't cache if explicitly disabled or already cached
      if (!request || request.cached || excludeTools.includes(request.name)) {
        return response;
      }
      
      const key = generateKey(request);
      
      // Evict oldest if at capacity
      evictOldest();
      
      // Cache the response
      cache.set(key, {
        data: response,
        timestamp: Date.now(),
        ttl: response._cacheTtl || ttl,
      });
      
      return response;
    },
  };
}