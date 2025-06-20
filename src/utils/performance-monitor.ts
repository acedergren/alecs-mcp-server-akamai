/**
 * Performance Monitoring and Optimization System
 * Advanced performance tracking, analysis, and optimization for Akamai MCP operations
 */

// Performance metrics interfaces
export interface PerformanceMetrics {
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  responseSize?: number;
  cacheHit?: boolean;
  errorOccurred?: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceAnalysis {
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  slowestOperations: PerformanceMetrics[];
  recommendations: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccessed: number;
}

export interface PerformanceThresholds {
  slowOperationMs: number;
  highErrorRatePercent: number;
  lowCacheHitRatePercent: number;
  highMemoryUsageMB: number;
}

// Performance monitoring class
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, PerformanceMetrics> = new Map();
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      slowOperationMs: 5000,
      highErrorRatePercent: 10,
      lowCacheHitRatePercent: 60,
      highMemoryUsageMB: 500,
      ...thresholds,
    };
  }

  startOperation(operationType: string, metadata?: Record<string, any>): string {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetrics = {
      operationType,
      startTime: Date.now(),
      metadata,
    };

    this.activeOperations.set(operationId, metric);
    return operationId;
  }

  endOperation(
    operationId: string,
    options?: {
      responseSize?: number;
      cacheHit?: boolean;
      errorOccurred?: boolean;
      additionalMetadata?: Record<string, any>;
    },
  ): PerformanceMetrics | null {
    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.responseSize = options?.responseSize;
    metric.cacheHit = options?.cacheHit;
    metric.errorOccurred = options?.errorOccurred;

    if (options?.additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...options.additionalMetadata };
    }

    this.metrics.push({ ...metric });
    this.activeOperations.delete(operationId);

    // Keep only recent metrics (last 1000 operations)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    return metric;
  }

  getMetrics(operationType?: string, timeWindowMs?: number): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;

    if (timeWindowMs) {
      const cutoff = Date.now() - timeWindowMs;
      filteredMetrics = filteredMetrics.filter((m) => m.startTime >= cutoff);
    }

    if (operationType) {
      filteredMetrics = filteredMetrics.filter((m) => m.operationType === operationType);
    }

    return filteredMetrics;
  }

  analyzePerformance(operationType?: string, timeWindowMs?: number): PerformanceAnalysis {
    const metrics = this.getMetrics(operationType, timeWindowMs);

    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        cacheHitRate: 0,
        slowestOperations: [],
        recommendations: ['No performance data available'],
      };
    }

    // Calculate response time percentiles
    const responseTimes = metrics
      .filter((m) => m.duration !== undefined)
      .map((m) => m.duration!)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p50ResponseTime = this.calculatePercentile(responseTimes, 0.5);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 0.95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 0.99);

    // Calculate throughput (operations per second)
    const timeSpanMs =
      timeWindowMs ||
      (metrics.length > 0 ? Date.now() - Math.min(...metrics.map((m) => m.startTime)) : 1000);
    const throughput = (metrics.length / timeSpanMs) * 1000;

    // Calculate error rate
    const errorCount = metrics.filter((m) => m.errorOccurred).length;
    const errorRate = (errorCount / metrics.length) * 100;

    // Calculate cache hit rate
    const cacheableMetrics = metrics.filter((m) => m.cacheHit !== undefined);
    const cacheHits = cacheableMetrics.filter((m) => m.cacheHit).length;
    const cacheHitRate =
      cacheableMetrics.length > 0 ? (cacheHits / cacheableMetrics.length) * 100 : 0;

    // Find slowest operations
    const slowestOperations = metrics
      .filter((m) => m.duration !== undefined)
      .sort((a, b) => b.duration! - a.duration!)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      cacheHitRate,
      slowestOperations,
    });

    return {
      averageResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      cacheHitRate,
      slowestOperations,
      recommendations,
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) {
return 0;
}
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  private generateRecommendations(analysis: Partial<PerformanceAnalysis>): string[] {
    const recommendations: string[] = [];

    if (analysis.averageResponseTime! > this.thresholds.slowOperationMs) {
      recommendations.push(
        `Average response time (${analysis.averageResponseTime!.toFixed(0)}ms) exceeds threshold. Consider enabling caching or optimizing API calls.`,
      );
    }

    if (analysis.p95ResponseTime! > this.thresholds.slowOperationMs * 2) {
      recommendations.push(
        `P95 response time (${analysis.p95ResponseTime!.toFixed(0)}ms) is very high. Investigate slowest operations and consider request batching.`,
      );
    }

    if (analysis.errorRate! > this.thresholds.highErrorRatePercent) {
      recommendations.push(
        `Error rate (${analysis.errorRate!.toFixed(1)}%) is high. Check circuit breaker status and API health.`,
      );
    }

    if (analysis.cacheHitRate! < this.thresholds.lowCacheHitRatePercent) {
      recommendations.push(
        `Cache hit rate (${analysis.cacheHitRate!.toFixed(1)}%) is low. Review cache strategy and TTL settings.`,
      );
    }

    if (analysis.slowestOperations && analysis.slowestOperations.length > 0) {
      const slowestOp = analysis.slowestOperations[0];
      if (slowestOp?.duration && slowestOp.duration > this.thresholds.slowOperationMs) {
        recommendations.push(
          `Slowest operation (${slowestOp.operationType}) took ${slowestOp.duration}ms. Consider optimization.`,
        );
      }
    }

    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.thresholds.highMemoryUsageMB) {
      recommendations.push(
        `Memory usage (${memoryUsageMB.toFixed(1)}MB) is high. Consider implementing memory-efficient caching.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! All metrics are within healthy thresholds.');
    }

    return recommendations;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }
}

// Smart caching system
export class SmartCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number;
  private maxSize: number;
  private performanceMonitor?: PerformanceMonitor;

  constructor(options?: {
    defaultTtl?: number;
    maxSize?: number;
    performanceMonitor?: PerformanceMonitor;
  }) {
    this.defaultTtl = options?.defaultTtl || 300000; // 5 minutes
    this.maxSize = options?.maxSize || 1000;
    this.performanceMonitor = options?.performanceMonitor;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.performanceMonitor?.startOperation('cache-miss');
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.performanceMonitor?.startOperation('cache-expired');
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = Date.now();

    this.performanceMonitor?.startOperation('cache-hit');
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
      hitCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    size: number;
    totalHits: number;
    averageHitCount: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    if (this.cache.size === 0) {
      return {
        size: 0,
        totalHits: 0,
        averageHitCount: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }

    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const averageHitCount = totalHits / entries.length;
    const timestamps = entries.map((e) => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      size: this.cache.size,
      totalHits,
      averageHitCount,
      oldestEntry: Date.now() - oldestEntry,
      newestEntry: Date.now() - newestEntry,
    };
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Request optimization utilities
export class RequestOptimizer {
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private maxBatchSize: number;
  private batchTimeoutMs: number;

  constructor(options?: { maxBatchSize?: number; batchTimeoutMs?: number }) {
    this.maxBatchSize = options?.maxBatchSize || 10;
    this.batchTimeoutMs = options?.batchTimeoutMs || 100;
  }

  // Add request to batch queue
  addToBatch<T>(
    batchKey: string,
    _request: T,
    processor: (requests: T[]) => Promise<any[]>,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      const batch = this.batchQueue.get(batchKey)!;
      batch.push({ request, resolve, reject });

      // Process immediately if batch is full
      if (batch.length >= this.maxBatchSize) {
        this.processBatch(batchKey, processor);
      } else {
        // Set timeout to process batch
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.processBatch(batchKey, processor);
          }, this.batchTimeoutMs);
          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  private async processBatch<T>(
    batchKey: string,
    processor: (requests: T[]) => Promise<any[]>,
  ): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear batch and timer
    this.batchQueue.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    try {
      const requests = batch.map((item) => item.request);
      const results = await processor(requests);

      // Resolve each promise with corresponding result
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (_error) {
      // Reject all promises with the _error
      batch.forEach((item) => {
        item.reject(_error);
      });
    }
  }

  // Force process all pending batches
  flushAll(): void {
    for (const batchKey of this.batchQueue.keys()) {
      const timer = this.batchTimers.get(batchKey);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(batchKey);
      }
    }
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Global cache instances
export const responseCache = new SmartCache<any>({
  defaultTtl: 300000, // 5 minutes
  maxSize: 500,
  performanceMonitor: globalPerformanceMonitor,
});

export const metadataCache = new SmartCache<any>({
  defaultTtl: 600000, // 10 minutes
  maxSize: 1000,
  performanceMonitor: globalPerformanceMonitor,
});

// Global request optimizer
export const globalRequestOptimizer = new RequestOptimizer({
  maxBatchSize: 5,
  batchTimeoutMs: 50,
});

// Performance decorator for automatic monitoring
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  operationType: string,
  fn: T,
  options?: {
    enableCaching?: boolean;
    cacheKeyGenerator?: (...args: any[]) => string;
    cacheTtl?: number;
  },
): T {
  return (async (...args: any[]) => {
    // Check cache first if enabled
    if (options?.enableCaching && options?.cacheKeyGenerator) {
      const cacheKey = options.cacheKeyGenerator(...args);
      const cached = responseCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const operationId = globalPerformanceMonitor.startOperation(operationType, {
      args: args.length,
    });

    try {
      const result = await fn(...args);

      globalPerformanceMonitor.endOperation(operationId, {
        responseSize: JSON.stringify(result).length,
        cacheHit: false,
        errorOccurred: false,
      });

      // Cache result if enabled
      if (options?.enableCaching && options?.cacheKeyGenerator) {
        const cacheKey = options.cacheKeyGenerator(...args);
        responseCache.set(cacheKey, result, options?.cacheTtl);
      }

      return result;
    } catch (_error) {
      globalPerformanceMonitor.endOperation(operationId, {
        errorOccurred: true,
      });
      throw _error;
    }
  }) as T;
}
