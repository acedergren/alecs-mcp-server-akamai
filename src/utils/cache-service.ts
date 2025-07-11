/**
 * CACHE SERVICE
 * 
 * ARCHITECTURAL PURPOSE:
 * Provides a simple in-memory caching layer for frequently accessed data.
 * Helps reduce API calls and improve performance across the application.
 * 
 * KEY FEATURES:
 * 1. TTL-based expiration
 * 2. Size-based eviction (LRU)
 * 3. Type-safe get/set operations
 * 4. Namespace support for different cache domains
 * 5. Clear and stats operations
 */

import { createLogger } from './pino-logger';
import type { Logger } from 'pino';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  namespace?: string; // Cache namespace
}

interface CacheEntry<T> {
  value: T;
  expires: number;
  accessed: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private logger: Logger;
  private maxSize: number;
  private namespace: string;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.logger = createLogger('cache-service');
    this.maxSize = options.maxSize || 1000;
    this.namespace = options.namespace || 'default';
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(fullKey);
      this.logger.debug({ key: fullKey }, 'Cache entry expired');
      return null;
    }
    
    // Update access time
    entry.accessed = Date.now();
    
    this.logger.debug({ key: fullKey }, 'Cache hit');
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expires = Date.now() + (ttl || 3600000); // Default 1 hour
    
    // Check size limit and evict if necessary
    if (this.cache.size >= this.maxSize && !this.cache.has(fullKey)) {
      this.evictLRU();
    }
    
    this.cache.set(fullKey, {
      value,
      expires,
      accessed: Date.now(),
    });
    
    this.logger.debug({ key: fullKey, ttl }, 'Cache set');
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const result = this.cache.delete(fullKey);
    
    if (result) {
      this.logger.debug({ key: fullKey }, 'Cache entry deleted');
    }
    
    return result;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info({ entriesCleared: size }, 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; namespace: string } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      namespace: this.namespace,
    };
  }

  /**
   * Get full key with namespace
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    // Find LRU entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestAccess) {
        oldestAccess = entry.accessed;
        oldestKey = key;
      }
    }
    
    // Evict LRU entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug({ key: oldestKey }, 'Evicted LRU cache entry');
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug({ entriesCleaned: cleaned }, 'Cleaned expired cache entries');
    }
    
    return cleaned;
  }
}