/**
 * Enhanced Smart Cache - In-Memory LRU Cache with Advanced Features
 * Drop-in replacement for ValkeyCache with zero external dependencies
 */

import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccessed: number;
  size?: number;
  compressed?: boolean;
  updateCount?: number;
  lastUpdateInterval?: number;
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

export interface SmartCacheOptions {
  maxSize?: number;
  maxMemoryMB?: number;
  defaultTTL?: number;
  enableCompression?: boolean;
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
  refreshThreshold?: number;
  enableMetrics?: boolean;
  compressionThreshold?: number;
  enablePersistence?: boolean;
  persistencePath?: string;
  adaptiveTTL?: boolean;
  requestCoalescing?: boolean;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  callbacks: Array<{
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }>;
}

export class EnhancedSmartCache<T = any> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private keysByPattern: Map<string, Set<string>> = new Map();
  private refreshingKeys: Set<string> = new Set();
  private pendingRequests: Map<string, PendingRequest<T>> = new Map();
  private negativeCache: Set<string> = new Set(); // Track non-existent keys
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
    };
    
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
    // Check negative cache first
    if (this.negativeCache.has(key)) {
      this.metrics.hits++; // Negative hit is still a hit
      this.updateHitRate();
      return null;
    }
    
    const entry = this.cache.get(key);
    
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
      
      this.cache.set(key, entry as unknown as CacheEntry<T>);
      this.addToPatterns(key);
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
      if (this.cache.delete(key)) {
        this.removeFromPatterns(key);
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
   * Smart get with automatic refresh (compatible with ValkeyCache)
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
      const pendingRequest: PendingRequest<V> = {
        promise: fetchFn(),
        callbacks: [],
      };
      
      this.pendingRequests.set(key, pendingRequest as any);
      
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
        
        // Add to negative cache
        this.negativeCache.add(key);
        setTimeout(() => this.negativeCache.delete(key), 60000); // Clear after 1 min
        
        if (cached) return cached; // Return stale on error
        throw error;
      } finally {
        this.pendingRequests.delete(key);
      }
    } else {
      // No coalescing
      try {
        const fresh = await fetchFn();
        await this.set(key, fresh, ttl);
        return fresh;
      } catch (error) {
        if (cached) return cached; // Return stale on error
        throw error;
      }
    }
  }

  /**
   * Scan and delete keys matching pattern
   */
  async scanAndDelete(pattern: string): Promise<number> {
    const regex = this.patternToRegex(pattern);
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
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
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.removeFromPatterns(keyToEvict);
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
    this.metrics.totalEntries = this.cache.size;
    this.metrics.memoryUsage = 0;
    
    for (const entry of Array.from(this.cache.values())) {
      this.metrics.memoryUsage += entry.size || 0;
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
    
    return {
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