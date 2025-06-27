/**
 * Smart Cache - In-Memory LRU Cache with Advanced Features
 * Drop-in replacement for external cache with zero external dependencies
 * 
 * Features:
 * - Multiple eviction policies (LRU, LFU, FIFO)
 * - Automatic compression for large values
 * - Request coalescing to prevent cache stampedes
 * - Adaptive TTL based on update patterns
 * - Negative caching for non-existent keys
 * - Optional persistence to disk
 * - Memory-based size limits
 * - Pattern-based key tracking
 * - Event-driven architecture
 * 
 * @example
 * ```typescript
 * const cache = new SmartCache({
 *   maxSize: 10000,
 *   enableCompression: true,
 *   adaptiveTTL: true
 * });
 * 
 * // Basic usage
 * await cache.set('key', 'value', 300);
 * const value = await cache.get('key');
 * 
 * // With refresh function
 * const data = await cache.getWithRefresh('api-data', 600, async () => {
 *   return await fetchFromAPI();
 * });
 * ```
 */

import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BloomFilter } from './bloom-filter';
import { CircuitBreaker } from './circuit-breaker';
import { KeyStore } from './key-store';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Internal cache entry structure
 */
export interface CacheEntry<T> {
  data: T;                      // The cached value
  timestamp: number;            // When the entry was created
  ttl: number;                 // Time to live in seconds
  hitCount: number;            // Number of cache hits
  lastAccessed: number;        // Last access timestamp for LRU
  size?: number;               // Size in bytes (if tracked)
  compressed?: boolean;        // Whether data is compressed
  updateCount?: number;        // Number of updates (for adaptive TTL)
  lastUpdateInterval?: number; // Time between last two updates
  accessHistory?: number[];    // Access history for LRU-K (K most recent accesses)
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  errors: number;
  apiCallsSaved: number;
  hitRate: number;
  memoryUsage: number;
  totalEntries: number;
}

/**
 * Configuration options for SmartCache
 */
export interface SmartCacheOptions {
  maxSize?: number;              // Maximum number of entries (default: 10000)
  maxMemoryMB?: number;          // Maximum memory usage in MB (default: 100)
  defaultTTL?: number;           // Default TTL in seconds (default: 300)
  enableCompression?: boolean;   // Enable compression for large values (default: false)
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO' | 'LRU-K'; // Eviction strategy (default: 'LRU')
  refreshThreshold?: number;     // Refresh when TTL < this percentage (default: 0.2)
  enableMetrics?: boolean;       // Track cache performance metrics (default: true)
  compressionThreshold?: number; // Compress values larger than this (default: 10KB)
  enablePersistence?: boolean;   // Save cache to disk on shutdown (default: false)
  persistencePath?: string;      // Where to save cache (default: '.cache/smart-cache.json')
  adaptiveTTL?: boolean;         // Adjust TTL based on update patterns (default: true)
  requestCoalescing?: boolean;   // Merge duplicate in-flight requests (default: true)
  enableCircuitBreaker?: boolean; // Use circuit breaker for fetch operations (default: true)
  enableSegmentation?: boolean;  // Enable cache segmentation (default: true)
  segmentSize?: number;          // Max entries per segment (default: 1000)
  enableKeyStore?: boolean;      // Use memory-efficient key storage (default: true)
  lruKValue?: number;            // K value for LRU-K algorithm (default: 2)
}

interface PendingRequest<T> {
  promise: Promise<T>;
  callbacks: Array<{
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }>;
}

/**
 * High-performance in-memory cache with advanced features
 * @extends EventEmitter - Emits 'hit', 'miss', 'eviction', 'error' events
 */
/**
 * Cache segment for organizing entries
 */
interface CacheSegment<T> {
  entries: Map<string, CacheEntry<T>>;
  accessCount: number;
  lastAccessed: number;
}

export class SmartCache<T = any> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();              // Main cache storage
  private segments: Map<string, CacheSegment<T>> = new Map();         // Segmented cache storage
  private keyToSegment: Map<string, string> = new Map();              // Key to segment mapping
  private keysByPattern: Map<string, Set<string>> = new Map();        // Track keys by patterns
  private refreshingKeys: Set<string> = new Set();                    // Keys being refreshed
  private pendingRequests: Map<string, PendingRequest<T>> = new Map(); // Request coalescing
  private negativeCache: Set<string> = new Set();                     // Track non-existent keys
  private negativeCacheBloom: BloomFilter;                            // Bloom filter for negative cache
  private circuitBreaker: CircuitBreaker;                             // Circuit breaker for fetch operations
  private keyStore: KeyStore;                                         // Memory-efficient key storage
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    errors: 0,
    apiCallsSaved: 0,
    hitRate: 0,
    memoryUsage: 0,
    totalEntries: 0,
  };
  
  private readonly options: Required<SmartCacheOptions>;
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(options: SmartCacheOptions = {}) {
    super();
    this.options = {
      maxSize: options.maxSize || 10000,
      maxMemoryMB: options.maxMemoryMB || 100,
      defaultTTL: options.defaultTTL || 300, // 5 minutes in seconds
      enableCompression: options.enableCompression || false,
      evictionPolicy: options.evictionPolicy || 'LRU',
      refreshThreshold: options.refreshThreshold || 0.2,
      enableMetrics: options.enableMetrics !== false,
      compressionThreshold: options.compressionThreshold || 10240, // 10KB
      enablePersistence: options.enablePersistence || false,
      persistencePath: options.persistencePath || '.cache/smart-cache.json',
      adaptiveTTL: options.adaptiveTTL !== false,
      requestCoalescing: options.requestCoalescing !== false,
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      enableSegmentation: options.enableSegmentation !== false,
      segmentSize: options.segmentSize || 1000,
      enableKeyStore: options.enableKeyStore !== false,
      lruKValue: options.lruKValue || 2,
    };
    
    // Initialize bloom filter for negative cache
    // Size for expected 10k non-existent keys with 1% false positive rate
    this.negativeCacheBloom = new BloomFilter(10000, 0.01);
    
    // Initialize circuit breaker for fetch operations
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,        // 30 seconds
      maxTimeout: 300000,    // 5 minutes
      windowSize: 60000,     // 1 minute window
      volumeThreshold: 10
    });
    
    // Initialize memory-efficient key storage
    this.keyStore = new KeyStore();
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
    
    // Load persisted cache if enabled
    if (this.options.enablePersistence) {
      this.loadCache().catch(err => this.emit('load-error', err));
      // Save periodically
      setInterval(() => {
        this.saveCache().catch(err => this.emit('save-error', err));
      }, 60000);
    }
  }

  /**
   * Get value from cache (async for compatibility)
   */
  async get<V = T>(key: string): Promise<V | null> {
    // Check bloom filter first for negative cache
    if (this.negativeCacheBloom.has(key)) {
      // Might be in negative cache, verify with actual set
      if (this.negativeCache.has(key)) {
        this.metrics.hits++; // Negative hit is still a hit
        this.updateHitRate();
        return null;
      }
    }
    
    const entry = this.options.enableSegmentation ? this.getFromSegment(key) : this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now > entry.timestamp + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.removeFromPatterns(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Decompress if needed
    let data = entry.data;
    if (entry.compressed && Buffer.isBuffer(data)) {
      try {
        const decompressed = await gunzip(data as any);
        data = JSON.parse(decompressed.toString());
      } catch (error) {
        this.emit('decompress-error', { key, error });
        return null;
      }
    }
    
    // Update access info
    entry.hitCount++;
    entry.lastAccessed = now;
    
    // Update access history for LRU-K
    if (this.options.evictionPolicy === 'LRU-K') {
      if (!entry.accessHistory) {
        entry.accessHistory = [];
      }
      entry.accessHistory.push(now);
      // Keep only K most recent accesses
      if (entry.accessHistory.length > this.options.lruKValue) {
        entry.accessHistory.shift();
      }
    }
    
    this.metrics.hits++;
    this.metrics.apiCallsSaved++;
    this.updateHitRate();
    
    this.emit('hit', key);
    return data as unknown as V;
  }

  /**
   * Set value in cache with TTL (async for compatibility)
   */
  async set<V = T>(key: string, value: V, ttl?: number): Promise<boolean> {
    try {
      let dataToStore: any = value;
      let compressed = false;
      const size = this.estimateSize(value);
      
      // Compress large values if enabled
      if (this.options.enableCompression && size > this.options.compressionThreshold) {
        try {
          const jsonStr = JSON.stringify(value);
          const compressedData = await gzip(Buffer.from(jsonStr));
          if (compressedData.length < size * 0.8) { // Only use if 20%+ savings
            dataToStore = compressedData;
            compressed = true;
            this.emit('compressed', { key, original: size, compressed: compressedData.length });
          }
        } catch (error) {
          this.emit('compress-error', { key, error });
        }
      }
      
      // Calculate adaptive TTL
      const actualTTL = this.calculateAdaptiveTTL(key, ttl || this.options.defaultTTL);
      
      // Check memory limit
      const finalSize = compressed ? (dataToStore as Buffer).length : size;
      if (this.shouldEvictForMemory(finalSize)) {
        this.evictUntilMemoryAvailable(finalSize);
      }
      
      // Check size limit
      if (this.cache.size >= this.options.maxSize) {
        this.evict();
      }
      
      // Track update patterns
      const existing = this.cache.get(key);
      const updateCount = existing ? (existing.updateCount || 0) + 1 : 1;
      const lastUpdateInterval = existing ? Date.now() - existing.timestamp : undefined;
      
      const entry: CacheEntry<V> = {
        data: dataToStore,
        timestamp: Date.now(),
        ttl: actualTTL,
        hitCount: 0,
        lastAccessed: Date.now(),
        size: finalSize,
        compressed,
        updateCount,
        lastUpdateInterval,
      };
      
      if (this.options.enableSegmentation) {
        this.setInSegment(key, entry as unknown as CacheEntry<T>);
      } else {
        this.cache.set(key, entry as unknown as CacheEntry<T>);
      }
      
      // Track key in KeyStore if enabled
      if (this.options.enableKeyStore) {
        this.keyStore.add(key);
      } else {
        this.addToPatterns(key);
      }
      
      this.updateMetrics();
      
      // Remove from negative cache
      this.negativeCache.delete(key);
      
      this.emit('set', key);
      return true;
    } catch (error) {
      this.metrics.errors++;
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Delete key(s) from cache (async for compatibility)
   */
  async del(keys: string | string[]): Promise<number> {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    let deleted = 0;
    
    for (const key of keysArray) {
      let wasDeleted = false;
      
      if (this.options.enableSegmentation) {
        const segmentName = this.keyToSegment.get(key);
        if (segmentName) {
          const segment = this.segments.get(segmentName);
          if (segment && segment.entries.delete(key)) {
            this.keyToSegment.delete(key);
            wasDeleted = true;
          }
        }
      } else {
        wasDeleted = this.cache.delete(key);
      }
      
      if (wasDeleted) {
        // Remove from KeyStore or patterns
        if (this.options.enableKeyStore) {
          this.keyStore.delete(key);
        } else {
          this.removeFromPatterns(key);
        }
        deleted++;
        this.emit('delete', key);
      }
    }
    
    this.updateMetrics();
    return deleted;
  }

  /**
   * Get remaining TTL for a key (async for compatibility)
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    
    const now = Date.now();
    const expiresAt = entry.timestamp + (entry.ttl * 1000);
    
    if (now > expiresAt) return -1; // Expired
    
    return Math.floor((expiresAt - now) / 1000);
  }

  /**
   * Smart get with automatic refresh
   */
  async getWithRefresh<V>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<V>,
    options: { refreshThreshold?: number; softTTL?: number } = {}
  ): Promise<V> {
    // Check for pending request (request coalescing)
    if (this.options.requestCoalescing && this.pendingRequests.has(key)) {
      const pending = this.pendingRequests.get(key)!;
      this.emit('coalesce', key);
      
      return new Promise<V>((resolve, reject) => {
        pending.callbacks.push({ resolve: resolve as any, reject });
      });
    }
    
    const cached = await this.get<V>(key);
    const ttlRemaining = await this.ttl(key);
    
    // Return cached if still fresh
    if (cached && ttlRemaining > 0) {
      // Trigger background refresh if approaching expiry
      const refreshAt = ttl * (options.refreshThreshold || this.options.refreshThreshold);
      if (ttlRemaining < refreshAt && !this.refreshingKeys.has(key)) {
        this.refreshInBackground(key, ttl, fetchFn);
      }
      return cached;
    }
    
    // Use stale-while-revalidate pattern
    if (cached && options.softTTL && ttlRemaining > -options.softTTL) {
      if (!this.refreshingKeys.has(key)) {
        this.refreshInBackground(key, ttl, fetchFn);
      }
      return cached;
    }
    
    // Fetch with request coalescing
    if (this.options.requestCoalescing) {
      // Check if we're already fetching this key
      if (!this.pendingRequests.has(key)) {
        // Create new pending request with circuit breaker if enabled
        const fetchPromise = this.options.enableCircuitBreaker
          ? this.circuitBreaker.execute(() => fetchFn())
          : fetchFn();
        
        const pendingRequest: PendingRequest<V> = {
          promise: fetchPromise,
          callbacks: [],
        };
        
        this.pendingRequests.set(key, pendingRequest as any);
      }
      
      const pendingRequest = this.pendingRequests.get(key)!;
      
      try {
        const result = await pendingRequest.promise;
        await this.set(key, result, ttl);
        
        // Resolve all waiting callbacks
        for (const { resolve } of pendingRequest.callbacks) {
          resolve(result);
        }
        
        return result;
      } catch (error) {
        // Reject all waiting callbacks
        for (const { reject } of pendingRequest.callbacks) {
          reject(error);
        }
        
        // Add to negative cache with bloom filter
        this.negativeCache.add(key);
        this.negativeCacheBloom.add(key);
        setTimeout(() => this.negativeCache.delete(key), 60000); // Clear after 1 min
        
        if (cached) return cached; // Return stale on error
        throw error;
      } finally {
        this.pendingRequests.delete(key);
      }
    } else {
      // No coalescing
      try {
        const fresh = this.options.enableCircuitBreaker
          ? await this.circuitBreaker.execute(() => fetchFn())
          : await fetchFn();
        await this.set(key, fresh, ttl);
        return fresh;
      } catch (error) {
        // Add to negative cache
        this.negativeCache.add(key);
        this.negativeCacheBloom.add(key);
        setTimeout(() => this.negativeCache.delete(key), 60000); // Clear after 1 min
        
        if (cached) return cached; // Return stale on error
        throw error;
      }
    }
  }

  /**
   * Scan and delete keys matching pattern
   */
  async scanAndDelete(pattern: string): Promise<number> {
    let keysToDelete: string[] = [];
    
    if (this.options.enableKeyStore) {
      // Use KeyStore's efficient pattern matching
      keysToDelete = this.keyStore.getByPattern(pattern);
    } else {
      // Fallback to regex matching
      const regex = this.patternToRegex(pattern);
      
      if (this.options.enableSegmentation) {
        for (const segment of this.segments.values()) {
          for (const key of segment.entries.keys()) {
            if (regex.test(key)) {
              keysToDelete.push(key);
            }
          }
        }
      } else {
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }
      }
    }
    
    return this.del(keysToDelete);
  }

  /**
   * Clear all cache entries
   */
  async flushAll(): Promise<void> {
    this.cache.clear();
    this.keysByPattern.clear();
    this.refreshingKeys.clear();
    this.resetMetrics();
    this.emit('flush');
  }

  /**
   * Check if cache is available (always true for in-memory)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Batch get multiple keys
   */
  async mget<V = T>(keys: string[]): Promise<Map<string, V>> {
    const result = new Map<string, V>();
    
    for (const key of keys) {
      const value = await this.get<V>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }
    
    return result;
  }

  /**
   * Close cache (cleanup intervals)
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }

  // Private helper methods

  private async refreshInBackground<V>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<V>
  ): Promise<void> {
    this.refreshingKeys.add(key);
    
    try {
      const fresh = await fetchFn();
      await this.set(key, fresh, ttl);
      this.emit('refresh', key);
    } catch (error) {
      this.emit('refresh-error', { key, error });
    } finally {
      this.refreshingKeys.delete(key);
    }
  }

  private evict(): void {
    let keyToEvict: string | null = null;
    
    switch (this.options.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.findLRUKey();
        break;
      case 'LFU':
        keyToEvict = this.findLFUKey();
        break;
      case 'FIFO':
        keyToEvict = this.findFIFOKey();
        break;
      case 'LRU-K':
        keyToEvict = this.findLRUKKey();
        break;
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      if (this.options.enableKeyStore) {
        this.keyStore.delete(keyToEvict);
      } else {
        this.removeFromPatterns(keyToEvict);
      }
      this.metrics.evictions++;
      this.emit('evict', keyToEvict);
    }
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    return lruKey;
  }

  private findLFUKey(): string | null {
    let lfuKey: string | null = null;
    let lfuCount = Infinity;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.hitCount < lfuCount) {
        lfuCount = entry.hitCount;
        lfuKey = key;
      }
    }
    
    return lfuKey;
  }

  private findFIFOKey(): string | null {
    // Map maintains insertion order
    const firstKey = Array.from(this.cache.keys())[0];
    return firstKey || null;
  }

  private findLRUKKey(): string | null {
    let lruKKey: string | null = null;
    let oldestKthAccess = Date.now();
    
    // Get entries from appropriate source
    const entries = this.options.enableSegmentation 
      ? this.getAllSegmentEntries()
      : Array.from(this.cache.entries());
    
    for (const [key, entry] of entries) {
      // For entries with less than K accesses, use creation time
      if (!entry.accessHistory || entry.accessHistory.length < this.options.lruKValue) {
        const compareTime = entry.timestamp;
        if (compareTime < oldestKthAccess) {
          oldestKthAccess = compareTime;
          lruKKey = key;
        }
      } else {
        // Use the Kth most recent access
        const kthAccess = entry.accessHistory[0]; // Oldest in the K-sized window
        if (kthAccess < oldestKthAccess) {
          oldestKthAccess = kthAccess;
          lruKKey = key;
        }
      }
    }
    
    return lruKKey;
  }
  
  private getAllSegmentEntries(): Array<[string, CacheEntry<T>]> {
    const allEntries: Array<[string, CacheEntry<T>]> = [];
    for (const segment of this.segments.values()) {
      for (const [key, entry] of segment.entries) {
        allEntries.push([key, entry]);
      }
    }
    return allEntries;
  }

  private cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        this.cache.delete(key);
        this.removeFromPatterns(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.updateMetrics();
      this.emit('cleanup', removed);
    }
    
    return removed;
  }

  private estimateSize(value: any): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(value);
    return str.length * 2; // Assuming UTF-16
  }

  private shouldEvictForMemory(newSize: number): boolean {
    const currentMemoryMB = this.metrics.memoryUsage / 1024 / 1024;
    const newMemoryMB = (this.metrics.memoryUsage + newSize) / 1024 / 1024;
    return newMemoryMB > this.options.maxMemoryMB;
  }

  private evictUntilMemoryAvailable(requiredSize: number): void {
    while (this.shouldEvictForMemory(requiredSize) && this.cache.size > 0) {
      this.evict();
    }
  }

  private addToPatterns(key: string): void {
    // Store key references for pattern matching
    const parts = key.split(':');
    for (let i = 1; i <= parts.length; i++) {
      const pattern = parts.slice(0, i).join(':') + ':*';
      if (!this.keysByPattern.has(pattern)) {
        this.keysByPattern.set(pattern, new Set());
      }
      this.keysByPattern.get(pattern)!.add(key);
    }
  }

  private removeFromPatterns(key: string): void {
    for (const [_pattern, keys] of Array.from(this.keysByPattern.entries())) {
      keys.delete(key);
    }
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert glob-style pattern to regex
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }

  private updateMetrics(): void {
    if (this.options.enableSegmentation) {
      this.metrics.totalEntries = 0;
      this.metrics.memoryUsage = 0;
      
      for (const segment of this.segments.values()) {
        this.metrics.totalEntries += segment.entries.size;
        for (const entry of segment.entries.values()) {
          this.metrics.memoryUsage += entry.size || 0;
        }
      }
    } else {
      this.metrics.totalEntries = this.cache.size;
      this.metrics.memoryUsage = 0;
      
      for (const entry of Array.from(this.cache.values())) {
        this.metrics.memoryUsage += entry.size || 0;
      }
    }
    
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) : 0;
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      errors: 0,
      apiCallsSaved: 0,
      hitRate: 0,
      memoryUsage: 0,
      totalEntries: 0,
    };
  }

  /**
   * Pre-warm cache with data
   */
  async warmCache(data: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const { key, value, ttl } of data) {
      await this.set(key, value, ttl);
    }
    this.emit('warm', data.length);
  }

  /**
   * Get cache statistics with additional details
   */
  getDetailedStats(): any {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const stats = {
      ...this.metrics,
      averageHitCount: entries.length > 0 
        ? entries.reduce((sum, e) => sum + e.hitCount, 0) / entries.length 
        : 0,
      oldestEntryAge: entries.length > 0
        ? Math.max(...entries.map(e => now - e.timestamp))
        : 0,
      newestEntryAge: entries.length > 0
        ? Math.min(...entries.map(e => now - e.timestamp))
        : 0,
      expiringInNext5Min: entries.filter(e => {
        const ttlRemaining = (e.timestamp + e.ttl * 1000 - now) / 1000;
        return ttlRemaining > 0 && ttlRemaining < 300;
      }).length,
    };
    
    // Add circuit breaker status if enabled
    if (this.options.enableCircuitBreaker) {
      stats.circuitBreaker = this.circuitBreaker.getStatus();
    }
    
    // Add segmentation stats if enabled
    if (this.options.enableSegmentation) {
      stats.segments = {
        count: this.segments.size,
        details: Array.from(this.segments.entries()).map(([name, segment]) => ({
          name,
          entries: segment.entries.size,
          accessCount: segment.accessCount,
          lastAccessed: segment.lastAccessed
        })).sort((a, b) => b.accessCount - a.accessCount).slice(0, 10) // Top 10 segments
      };
    }
    
    // Add KeyStore stats if enabled
    if (this.options.enableKeyStore) {
      stats.keyStore = this.keyStore.getStats();
    }
    
    return stats;
  }

  /**
   * Get segment name for a key
   */
  private getSegmentName(key: string): string {
    // Use first part of key as segment (e.g., "property:123" -> "property")
    const parts = key.split(':');
    return parts[0] || 'default';
  }
  
  /**
   * Get entry from segmented cache
   */
  private getFromSegment(key: string): CacheEntry<T> | undefined {
    const segmentName = this.keyToSegment.get(key);
    if (!segmentName) return undefined;
    
    const segment = this.segments.get(segmentName);
    if (!segment) return undefined;
    
    // Update segment access stats
    segment.accessCount++;
    segment.lastAccessed = Date.now();
    
    return segment.entries.get(key);
  }
  
  /**
   * Set entry in segmented cache
   */
  private setInSegment(key: string, entry: CacheEntry<T>): void {
    const segmentName = this.getSegmentName(key);
    
    // Get or create segment
    let segment = this.segments.get(segmentName);
    if (!segment) {
      segment = {
        entries: new Map(),
        accessCount: 0,
        lastAccessed: Date.now()
      };
      this.segments.set(segmentName, segment);
    }
    
    // Check segment size limit
    if (segment.entries.size >= this.options.segmentSize) {
      this.evictFromSegment(segment);
    }
    
    segment.entries.set(key, entry);
    this.keyToSegment.set(key, segmentName);
  }
  
  /**
   * Evict from a specific segment
   */
  private evictFromSegment(segment: CacheSegment<T>): void {
    let keyToEvict: string | null = null;
    let oldestTime = Date.now();
    
    // Find LRU key in segment
    for (const [key, entry] of segment.entries) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        keyToEvict = key;
      }
    }
    
    if (keyToEvict) {
      segment.entries.delete(keyToEvict);
      this.keyToSegment.delete(keyToEvict);
      this.removeFromPatterns(keyToEvict);
      this.metrics.evictions++;
      this.emit('evict', keyToEvict);
    }
  }

  /**
   * Calculate adaptive TTL based on update patterns
   */
  private calculateAdaptiveTTL(key: string, baseTTL: number): number {
    if (!this.options.adaptiveTTL) {
      return baseTTL;
    }

    const entry = this.cache.get(key);
    if (!entry || !entry.lastUpdateInterval) {
      return baseTTL;
    }

    // If updates are frequent, use shorter TTL
    const updateInterval = entry.lastUpdateInterval;
    if (updateInterval < baseTTL * 500) { // Updates more than twice per TTL
      return Math.max(60, Math.floor(updateInterval / 1000 * 2)); // 2x update interval, min 60s
    }

    // If rarely updated, extend TTL
    if (updateInterval > baseTTL * 2000) {
      return Math.min(baseTTL * 2, 3600); // Double TTL, max 1 hour
    }

    return baseTTL;
  }

  /**
   * Save cache to disk for persistence
   */
  private async saveCache(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        entries: Array.from(this.cache.entries()).map(([key, entry]) => {
          // Don't persist compressed data or very large entries
          if (entry.compressed || (entry.size && entry.size > 100000)) {
            return null;
          }
          return { key, entry };
        }).filter(Boolean),
      };

      const dir = path.dirname(this.options.persistencePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.options.persistencePath,
        JSON.stringify(data),
        'utf-8'
      );
      
      this.emit('saved', data.entries.length);
    } catch (error) {
      this.emit('save-error', error);
    }
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      const content = await fs.readFile(this.options.persistencePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.version !== '1.0') {
        throw new Error('Incompatible cache version');
      }

      // Only load entries that aren't expired
      const now = Date.now();
      let loaded = 0;
      
      for (const { key, entry } of data.entries) {
        if (now < entry.timestamp + (entry.ttl * 1000)) {
          this.cache.set(key, entry);
          loaded++;
        }
      }

      this.emit('loaded', loaded);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as any).code !== 'ENOENT') {
        this.emit('load-error', error);
      }
    }
  }
}