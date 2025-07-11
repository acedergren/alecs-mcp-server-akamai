/**
 * Production-Scale Metrics Export for ALECS
 * 
 * This module provides Prometheus-compatible metrics export for production monitoring,
 * troubleshooting, and observability. It works with all major collectors including:
 * - Prometheus
 * - Grafana Agent
 * - Datadog Agent
 * - New Relic Infrastructure
 * - OpenTelemetry Collector
 * 
 * CODE KAI PRINCIPLES:
 * Key: Production-grade observability with minimal overhead
 * Approach: Real-time gauges + structured logging for complete picture
 * Implementation: Standard Prometheus format, privacy-safe, performance-first
 * 
 * METRICS STRATEGY:
 * Since MCP servers use stdio/pipe communication (not HTTP), we don't expose
 * a /metrics endpoint. Instead, all metrics are logged as structured JSON via Pino,
 * which can be collected by Loki/Promtail for querying with LogQL.
 * 
 * The recordToolExecution() method logs all tool metrics to stdout/stderr,
 * making them available for log-based metrics without the complexity of 
 * running an HTTP server alongside the MCP protocol.
 */

import { collectDefaultMetrics, Gauge, Counter, Registry } from 'prom-client';
import { createLogger } from './pino-logger';
import { MonitorMiddleware } from '../core/server/middleware/monitor.middleware';
import { SmartCache } from '../core/server/performance/smart-cache';
import { ConnectionPool } from '../core/server/performance/connection-pool';
import { RequestCoalescer } from '../core/server/performance/request-coalescer';
import { PerformanceMonitor } from './performance-monitor';
import crypto from 'crypto';

const logger = createLogger('export-metrics');

export interface MetricsConfig {
  enabled?: boolean;
  enableDefaultMetrics?: boolean;
  privacyMode?: boolean;
  prefix?: string;
  customerHashing?: boolean;
  collectInterval?: number;
}

export interface MetricsComponents {
  smartCache?: SmartCache;
  connectionPool?: ConnectionPool;
  requestCoalescer?: RequestCoalescer;
  performanceMonitor?: PerformanceMonitor;
  monitorMiddleware?: MonitorMiddleware;
}

export class ProductionMetricsExporter {
  private static instance: ProductionMetricsExporter;
  private registry: Registry;
  private enabled: boolean;
  private privacyMode: boolean;
  private prefix: string;
  private customerHashing: boolean;
  private collectInterval?: NodeJS.Timeout;
  
  // System Health Metrics
  private healthStatus!: Gauge<string>;
  private uptimeSeconds!: Gauge<string>;
  private memoryUsage!: Gauge<string>;
  
  // Cache Performance Metrics
  private cacheSize!: Gauge<string>;
  private cacheHitRatio!: Gauge<string>;
  private cacheEvictions!: Counter<string>;
  
  // Connection Management Metrics
  private connectionPoolActive!: Gauge<string>;
  private connectionPoolIdle!: Gauge<string>;
  private connectionPoolPending!: Gauge<string>;
  
  // Request Coalescing Metrics
  private coalescerPendingRequests!: Gauge<string>;
  private coalescerActiveBatches!: Gauge<string>;
  
  // Performance Metrics (from PerformanceMonitor)
  private performanceP95!: Gauge<string>;
  private performanceErrorRate!: Gauge<string>;
  private performanceThroughput!: Gauge<string>;
  
  // Components
  private components: MetricsComponents = {};
  
  private constructor(config: MetricsConfig = {}) {
    this.enabled = config.enabled !== false;
    this.privacyMode = config.privacyMode || true;
    this.prefix = config.prefix || 'alecs';
    this.customerHashing = config.customerHashing !== false;
    this.registry = new Registry();
    
    if (!this.enabled) {
      logger.info('Metrics export disabled');
      return;
    }
    
    // Enable default Node.js metrics
    if (config.enableDefaultMetrics !== false) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: `${this.prefix}_`
      });
    }
    
    this.initializeCustomMetrics();
    
    // Start periodic collection
    if (config.collectInterval) {
      this.startPeriodicCollection(config.collectInterval);
    }
    
    logger.info('Production metrics exporter initialized', {
      enabled: this.enabled,
      privacyMode: this.privacyMode,
      prefix: this.prefix
    });
  }
  
  static initialize(config: MetricsConfig = {}): ProductionMetricsExporter {
    // Always create a new instance to allow re-initialization
    ProductionMetricsExporter.instance = new ProductionMetricsExporter(config);
    return ProductionMetricsExporter.instance;
  }
  
  static getInstance(): ProductionMetricsExporter {
    if (!ProductionMetricsExporter.instance) {
      ProductionMetricsExporter.instance = new ProductionMetricsExporter();
    }
    return ProductionMetricsExporter.instance;
  }
  
  private initializeCustomMetrics(): void {
    // System Health Metrics
    this.healthStatus = new Gauge({
      name: `${this.prefix}_health_status`,
      help: 'System health status (0=healthy, 1=degraded, 2=unhealthy)',
      registers: [this.registry]
    });
    
    this.uptimeSeconds = new Gauge({
      name: `${this.prefix}_uptime_seconds`,
      help: 'System uptime in seconds',
      registers: [this.registry]
    });
    
    
    this.memoryUsage = new Gauge({
      name: `${this.prefix}_memory_usage_bytes`,
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    // Cache Performance Metrics
    this.cacheSize = new Gauge({
      name: `${this.prefix}_cache_size`,
      help: 'Current cache size',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    this.cacheHitRatio = new Gauge({
      name: `${this.prefix}_cache_hit_ratio`,
      help: 'Cache hit ratio (0.0 to 1.0)',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    this.cacheEvictions = new Counter({
      name: `${this.prefix}_cache_evictions_total`,
      help: 'Total number of cache evictions',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    // Connection Management Metrics
    this.connectionPoolActive = new Gauge({
      name: `${this.prefix}_connection_pool_active`,
      help: 'Number of active connections in the pool',
      registers: [this.registry]
    });
    
    this.connectionPoolIdle = new Gauge({
      name: `${this.prefix}_connection_pool_idle`,
      help: 'Number of idle connections in the pool',
      registers: [this.registry]
    });
    
    this.connectionPoolPending = new Gauge({
      name: `${this.prefix}_connection_pool_pending`,
      help: 'Number of pending connection requests',
      registers: [this.registry]
    });
    
    // Request Coalescing Metrics
    this.coalescerPendingRequests = new Gauge({
      name: `${this.prefix}_coalescer_pending_requests`,
      help: 'Number of pending requests in coalescer',
      registers: [this.registry]
    });
    
    this.coalescerActiveBatches = new Gauge({
      name: `${this.prefix}_coalescer_active_batches`,
      help: 'Number of active batches being processed',
      registers: [this.registry]
    });
    
    // Performance Metrics
    this.performanceP95 = new Gauge({
      name: `${this.prefix}_performance_p95_seconds`,
      help: 'P95 response time in seconds',
      labelNames: ['operation'],
      registers: [this.registry]
    });
    
    this.performanceErrorRate = new Gauge({
      name: `${this.prefix}_performance_error_rate`,
      help: 'Error rate (0.0 to 1.0)',
      labelNames: ['operation'],
      registers: [this.registry]
    });
    
    this.performanceThroughput = new Gauge({
      name: `${this.prefix}_performance_throughput_ops_per_second`,
      help: 'Operations per second throughput',
      labelNames: ['operation'],
      registers: [this.registry]
    });
  }
  
  /**
   * Register components for metrics collection
   */
  registerComponents(components: MetricsComponents): void {
    this.components = { ...this.components, ...components };
    logger.debug('Registered metrics components', {
      smartCache: !!components.smartCache,
      connectionPool: !!components.connectionPool,
      requestCoalescer: !!components.requestCoalescer,
      performanceMonitor: !!components.performanceMonitor,
      monitorMiddleware: !!components.monitorMiddleware
    });
  }
  
  /**
   * Update metrics with current values
   */
  updateMetrics(): void {
    if (!this.enabled) return;
    
    try {
      // Update system health metrics
      this.updateSystemHealthMetrics();
      
      // Update cache metrics
      this.updateCacheMetrics();
      
      // Update connection pool metrics
      this.updateConnectionPoolMetrics();
      
      // Update request coalescer metrics
      this.updateRequestCoalescerMetrics();
      
      // Update performance metrics
      this.updatePerformanceMetrics();
      
    } catch (error) {
      logger.error('Error updating metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private updateSystemHealthMetrics(): void {
    // Update uptime
    this.uptimeSeconds.set(process.uptime());
    
    // Update memory usage
    const memoryUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'heap' }, memoryUsage.heapUsed);
    this.memoryUsage.set({ type: 'rss' }, memoryUsage.rss);
    this.memoryUsage.set({ type: 'external' }, memoryUsage.external);
    
    // Update health status from MonitorMiddleware
    if (this.components.monitorMiddleware) {
      const health = this.components.monitorMiddleware.getHealth(
        this.components.smartCache,
        this.components.connectionPool
      );
      
      const statusValue = health.status === 'healthy' ? 0 : 
                         health.status === 'degraded' ? 1 : 2;
      this.healthStatus.set(statusValue);
    }
  }
  
  private updateCacheMetrics(): void {
    if (this.components.smartCache) {
      const stats = this.components.smartCache.stats();
      this.cacheSize.set({ type: 'smart' }, stats.entries);
      
      // Use hitRate from SmartCache stats
      this.cacheHitRatio.set({ type: 'smart' }, stats.hitRate);
    }
  }
  
  private updateConnectionPoolMetrics(): void {
    if (this.components.connectionPool) {
      const stats = this.components.connectionPool.getStats();
      this.connectionPoolActive.set(stats.active);
      this.connectionPoolIdle.set(stats.free); // ConnectionPool uses 'free' instead of 'idle'
      this.connectionPoolPending.set(0); // ConnectionPool doesn't track pending, set to 0
    }
  }
  
  private updateRequestCoalescerMetrics(): void {
    if (this.components.requestCoalescer) {
      const stats = this.components.requestCoalescer.getStats();
      this.coalescerPendingRequests.set(stats.pending);
      this.coalescerActiveBatches.set(stats.activeBatches);
    }
  }
  
  private updatePerformanceMetrics(): void {
    if (this.components.performanceMonitor) {
      const analysis = this.components.performanceMonitor.analyzePerformance();
      
      // Convert milliseconds to seconds for Prometheus best practices
      this.performanceP95.set({ operation: 'all' }, analysis.p95ResponseTime / 1000);
      this.performanceErrorRate.set({ operation: 'all' }, analysis.errorRate / 100);
      this.performanceThroughput.set({ operation: 'all' }, analysis.throughput);
    }
  }
  
  /**
   * Record tool execution metrics (called from ALECSCore)
   */
  recordToolExecution(toolName: string, duration: number, success: boolean, customer?: string): void {
    if (!this.enabled) return;
    
    // Privacy-safe customer identifier
    const customerLabel = this.privacyMode && customer ? 
      this.hashCustomer(customer) : (customer || 'default');
    
    // Log structured data for log-based metrics
    logger.info('Tool execution completed', {
      tool: toolName,
      duration,
      success,
      customer: customerLabel,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record cache operation metrics
   */
  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'evict', cacheType: string = 'smart'): void {
    if (!this.enabled) return;
    
    if (operation === 'evict') {
      this.cacheEvictions.inc({ type: cacheType });
    }
    
    // Log for external metrics collection
    logger.debug('Cache operation', {
      operation,
      cacheType,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Start periodic metrics collection
   */
  private startPeriodicCollection(intervalMs: number): void {
    this.collectInterval = setInterval(() => {
      this.updateMetrics();
    }, intervalMs);
    
    logger.info('Started periodic metrics collection', { intervalMs });
  }
  
  /**
   * Stop periodic metrics collection
   */
  stopPeriodicCollection(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = undefined;
      logger.info('Stopped periodic metrics collection');
    }
  }
  
  /**
   * Get Prometheus metrics string
   */
  getMetrics(): Promise<string> {
    if (!this.enabled) {
      return Promise.resolve('# Metrics disabled\n');
    }
    
    // Update metrics before export
    this.updateMetrics();
    
    return this.registry.metrics();
  }
  
  /**
   * Get metrics in JSON format for debugging
   */
  async getMetricsJSON(): Promise<any> {
    if (!this.enabled) {
      return { enabled: false };
    }
    
    this.updateMetrics();
    return this.registry.getMetricsAsJSON();
  }
  
  /**
   * Hash customer identifier for privacy
   */
  private hashCustomer(customer: string): string {
    if (!this.customerHashing) return customer;
    
    return crypto
      .createHash('sha256')
      .update(customer)
      .digest('hex')
      .substring(0, 8);
  }
  
  /**
   * Graceful shutdown
   */
  shutdown(): void {
    this.stopPeriodicCollection();
    this.registry.clear();
    logger.info('Metrics exporter shutdown complete');
  }
}

/**
 * Convenience function to initialize metrics
 */
export function initializeMetrics(config: MetricsConfig = {}): ProductionMetricsExporter {
  return ProductionMetricsExporter.initialize(config);
}

/**
 * Convenience function to get metrics instance
 */
export function getMetrics(): ProductionMetricsExporter {
  return ProductionMetricsExporter.getInstance();
}

// HTTP middleware functions archived to .archive/metrics-http/http-middleware.ts
// MCP servers use stdio/pipes, not HTTP. Metrics are logged via Pino for Loki collection.