/**
 * Export Metrics Tests
 * 
 * Tests for the ProductionMetricsExporter implementation
 */

import { ProductionMetricsExporter } from '../../src/utils/export-metrics';
import { SmartCache } from '../../src/core/server/performance/smart-cache';
import { ConnectionPool } from '../../src/core/server/performance/connection-pool';
import { RequestCoalescer } from '../../src/core/server/performance/request-coalescer';

describe('ProductionMetricsExporter', () => {
  let metricsExporter: ProductionMetricsExporter;
  let smartCache: SmartCache;
  let connectionPool: ConnectionPool;
  let requestCoalescer: RequestCoalescer;

  beforeEach(() => {
    // Initialize components
    smartCache = new SmartCache({ maxSize: 100, defaultTtl: 300 });
    connectionPool = new ConnectionPool({ maxSockets: 10 });
    requestCoalescer = new RequestCoalescer();
    
    // Initialize metrics exporter with unique prefix for each test
    metricsExporter = ProductionMetricsExporter.initialize({
      enabled: true,
      enableDefaultMetrics: false, // Disable to speed up tests
      privacyMode: false,
      prefix: 'test_alecs',
      customerHashing: false
    });
    
    // Register components
    metricsExporter.registerComponents({
      smartCache,
      connectionPool,
      requestCoalescer
    });
  });

  afterEach(() => {
    if (metricsExporter) {
      metricsExporter.shutdown();
    }
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = ProductionMetricsExporter.getInstance();
      const instance2 = ProductionMetricsExporter.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct configuration', () => {
      const metrics = ProductionMetricsExporter.initialize({
        enabled: true,
        prefix: 'custom_prefix'
      });
      expect(metrics).toBeDefined();
    });
  });

  describe('metrics collection', () => {
    it('should collect system metrics', async () => {
      // Create a fresh instance for this test
      const testExporter = ProductionMetricsExporter.initialize({
        enabled: true,
        enableDefaultMetrics: false,
        prefix: 'test_alecs_fresh'
      });
      
      testExporter.registerComponents({
        smartCache: new SmartCache({ maxSize: 100, defaultTtl: 300 }),
        connectionPool: new ConnectionPool({ maxSockets: 10 }),
        requestCoalescer: new RequestCoalescer()
      });
      
      testExporter.updateMetrics();
      
      const metrics = await testExporter.getMetrics();
      console.log('Metrics output:', metrics); // Debug log
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
      
      testExporter.shutdown();
    });

    it('should return metrics in JSON format', async () => {
      metricsExporter.updateMetrics();
      
      const metricsJSON = await metricsExporter.getMetricsJSON();
      expect(metricsJSON).toBeDefined();
      expect(Array.isArray(metricsJSON)).toBe(true);
    });

    it('should handle disabled metrics', async () => {
      const disabledExporter = ProductionMetricsExporter.initialize({
        enabled: false
      });
      
      const metrics = await disabledExporter.getMetrics();
      console.log('Disabled metrics output:', metrics); // Debug log
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      
      const metricsJSON = await disabledExporter.getMetricsJSON();
      console.log('Disabled metrics JSON:', metricsJSON);
      expect(metricsJSON).toEqual({ enabled: false });
    });
  });

  describe('tool execution tracking', () => {
    it('should record successful tool execution', () => {
      const toolName = 'test_tool';
      const duration = 123;
      const customer = 'test_customer';
      
      // This should not throw
      metricsExporter.recordToolExecution(toolName, duration, true, customer);
    });

    it('should record failed tool execution', () => {
      const toolName = 'test_tool';
      const duration = 0;
      const customer = 'test_customer';
      
      // This should not throw
      metricsExporter.recordToolExecution(toolName, duration, false, customer);
    });
  });

  describe('cache operations', () => {
    it('should record cache operations', () => {
      // This should not throw
      metricsExporter.recordCacheOperation('hit', 'smart');
      metricsExporter.recordCacheOperation('miss', 'smart');
      metricsExporter.recordCacheOperation('evict', 'smart');
    });
  });

  describe('component stats integration', () => {
    it('should read SmartCache stats', () => {
      const stats = smartCache.stats();
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('memory');
    });

    it('should read ConnectionPool stats', () => {
      const stats = connectionPool.getStats();
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('free');
      expect(stats).toHaveProperty('created');
      expect(stats).toHaveProperty('reused');
      expect(stats).toHaveProperty('reuseRate');
    });

    it('should read RequestCoalescer stats', () => {
      const stats = requestCoalescer.getStats();
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('activeBatches');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('coalescedRequests');
      expect(stats).toHaveProperty('coalescingRate');
    });
  });

  describe('periodic collection', () => {
    it('should start and stop periodic collection', (done) => {
      const testExporter = ProductionMetricsExporter.initialize({
        enabled: true,
        collectInterval: 100 // 100ms for testing
      });

      testExporter.registerComponents({
        smartCache,
        connectionPool,
        requestCoalescer
      });

      // Let it run for a short time
      setTimeout(() => {
        testExporter.stopPeriodicCollection();
        testExporter.shutdown();
        done();
      }, 250);
    });
  });
});