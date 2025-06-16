/**
 * Performance Tests
 * Validates ALECS behavior under load
 */

import {
  createMockAkamaiClient,
  PerformanceTracker,
  TestData,
} from '../testing/test-utils.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import { logger } from '../observability/logger.js';

describe('Performance Tests', () => {
  let mockClient: jest.Mocked<any>;
  let perfTracker: PerformanceTracker;

  beforeEach(() => {
    mockClient = createMockAkamaiClient();
    perfTracker = new PerformanceTracker();
  });

  afterEach(() => {
    perfTracker.reset();
  });

  describe('Concurrent Tool Invocations', () => {
    it('should handle concurrent property list requests', async () => {
      const mockResponse = {
        properties: {
          items: Array(100).fill(null).map((_, i) => 
            TestData.property({ propertyId: `prp_${i}` })
          ),
        },
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const endTimer = perfTracker.startOperation('listProperties');
        const promise = propertyTools.listProperties(mockClient, {})
          .finally(endTimer);
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.content[0].text).toContain('100 properties');
      });

      // Check performance metrics
      const metrics = perfTracker.getMetrics('listProperties');
      expect(metrics).toBeDefined();
      expect(metrics!.count).toBe(concurrentRequests);
      expect(metrics!.avg).toBeLessThan(100); // Should be fast with mocks
    });

    it('should handle mixed concurrent operations', async () => {
      // Setup mocks for different operations
      mockClient.request.mockImplementation((config) => {
        if (config.path.includes('/properties')) {
          return Promise.resolve({
            properties: { items: [TestData.property()] },
          });
        } else if (config.path.includes('/zones')) {
          return Promise.resolve({
            zones: [TestData.zone()],
          });
        }
        return Promise.resolve({});
      });

      const operations = [
        // 5 property operations
        ...Array(5).fill(null).map(() => ({
          name: 'listProperties',
          fn: () => propertyTools.listProperties(mockClient, {}),
        })),
        // 5 DNS operations
        ...Array(5).fill(null).map(() => ({
          name: 'listZones',
          fn: () => dnsTools.listZones(mockClient, {}),
        })),
      ];

      const promises = operations.map(op => {
        const endTimer = perfTracker.startOperation(op.name);
        return op.fn().finally(endTimer);
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // Check both operation types completed
      const propMetrics = perfTracker.getMetrics('listProperties');
      const dnsMetrics = perfTracker.getMetrics('listZones');
      
      expect(propMetrics!.count).toBe(5);
      expect(dnsMetrics!.count).toBe(5);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large property lists efficiently', async () => {
      const largePropertyList = Array(1000).fill(null).map((_, i) => 
        TestData.property({
          propertyId: `prp_${i}`,
          propertyName: `property-${i}.example.com`,
        })
      );

      mockClient.request.mockResolvedValueOnce({
        properties: { items: largePropertyList },
      });

      const endTimer = perfTracker.startOperation('largeList');
      const result = await propertyTools.listProperties(mockClient, {});
      endTimer();

      expect(result.content[0].text).toContain('1000 properties');
      
      const metrics = perfTracker.getMetrics('largeList');
      expect(metrics!.avg).toBeLessThan(500); // Should process quickly
    });

    it('should handle large DNS record sets', async () => {
      const largeRecordSet = Array(500).fill(null).map((_, i) => 
        TestData.record({
          name: `host-${i}.example.com`,
          rdata: [`192.0.2.${i % 255}`],
        })
      );

      mockClient.request.mockResolvedValueOnce({
        recordsets: largeRecordSet,
      });

      const endTimer = perfTracker.startOperation('largeDNSList');
      const result = await dnsTools.listRecords(mockClient, {
        zone: 'example.com',
      });
      endTimer();

      expect(result.content[0].text).toContain('500 records');
    });
  });

  describe('Rate Limiting Behavior', () => {
    it('should handle rate limit responses gracefully', async () => {
      let callCount = 0;
      mockClient.request.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // First 3 calls are rate limited
          return Promise.reject({
            response: {
              status: 429,
              headers: { 'retry-after': '1' },
              data: { detail: 'Rate limit exceeded' },
            },
          });
        }
        // 4th call succeeds
        return Promise.resolve({
          properties: { items: [] },
        });
      });

      const result = await propertyTools.listProperties(mockClient, {});
      
      // Should handle rate limit error
      expect(result.content[0].text).toContain('Error');
      expect(callCount).toBe(1); // No automatic retry in tools
    });

    it('should track rate limit occurrences', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { detail: 'Rate limit exceeded' },
        },
      };

      mockClient.request
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ properties: { items: [] } });

      const operations = [];
      for (let i = 0; i < 3; i++) {
        const endTimer = perfTracker.startOperation('rateLimited');
        operations.push(
          propertyTools.listProperties(mockClient, {}).finally(endTimer)
        );
      }

      const results = await Promise.all(operations);
      
      const errorCount = results.filter(r => 
        r.content[0].text.includes('Error')
      ).length;
      
      expect(errorCount).toBe(2);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should not leak memory with repeated operations', async () => {
      mockClient.request.mockResolvedValue({
        properties: { items: [TestData.property()] },
      });

      const iterations = 100;
      const baseMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await propertyTools.listProperties(mockClient, {});
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - baseMemory;
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should maintain consistent response times', async () => {
      mockClient.request.mockImplementation(() => 
        new Promise(resolve => {
          // Simulate 50ms API latency
          setTimeout(() => {
            resolve({ properties: { items: [] } });
          }, 50);
        })
      );

      const iterations = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await propertyTools.listProperties(mockClient, {});
        responseTimes.push(Date.now() - start);
      }

      // Calculate statistics
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const stdDev = Math.sqrt(
        responseTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / responseTimes.length
      );

      // Response times should be consistent (low standard deviation)
      expect(stdDev).toBeLessThan(20);
      expect(avg).toBeGreaterThan(50); // At least the simulated latency
      expect(avg).toBeLessThan(100); // But not too much overhead
    });
  });

  describe('Long-Running Operations', () => {
    it('should handle operations that take several seconds', async () => {
      mockClient.request.mockImplementation(() => 
        new Promise(resolve => {
          // Simulate 2 second operation
          setTimeout(() => {
            resolve({
              activationLink: '/papi/v1/properties/prp_123/activations/atv_123',
            });
          }, 2000);
        })
      );

      const start = Date.now();
      const result = await propertyManagerTools.activateProperty(mockClient, {
        propertyId: 'prp_123',
        version: 1,
        network: 'STAGING',
        note: 'Test activation',
      });
      const duration = Date.now() - start;

      expect(result.content[0].text).toContain('Activation started');
      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources after operations', async () => {
      // Track active operations
      let activeOperations = 0;

      mockClient.request.mockImplementation(() => {
        activeOperations++;
        return new Promise((resolve) => {
          setTimeout(() => {
            activeOperations--;
            resolve({ properties: { items: [] } });
          }, 10);
        });
      });

      // Start multiple operations
      const promises = Array(5).fill(null).map(() => 
        propertyTools.listProperties(mockClient, {})
      );

      // Check active operations during execution
      expect(activeOperations).toBeGreaterThan(0);

      await Promise.all(promises);

      // All operations should be cleaned up
      expect(activeOperations).toBe(0);
    });
  });

  describe('Performance Under Load Summary', () => {
    afterAll(() => {
      // Log performance summary
      const operations = ['listProperties', 'listZones', 'largeList', 'largeDNSList'];
      
      console.log('\n=== Performance Test Summary ===');
      operations.forEach(op => {
        const metrics = perfTracker.getMetrics(op);
        if (metrics) {
          console.log(`${op}:`);
          console.log(`  Calls: ${metrics.count}`);
          console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`);
          console.log(`  Min: ${metrics.min}ms`);
          console.log(`  Max: ${metrics.max}ms`);
        }
      });
      console.log('==============================\n');
    });
  });
});