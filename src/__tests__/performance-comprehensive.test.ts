/**
 * Comprehensive Performance Tests
 * Validates ALECS behavior under realistic operational loads
 */

import {
  createMockAkamaiClient,
  createTestServer,
  TestDataGenerators,
  PerformanceTracker,
  LoadTestRunner,
  MemoryMonitor,
  ConcurrencyController
} from '../testing/test-utils.js';
import * as propertyTools from '../tools/property-tools.js';
import * as dnsTools from '../tools/dns-tools.js';
import * as cpsTools from '../tools/cps-tools.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  singleOperation: 500, // ms
  bulkOperation: 2000, // ms
  concurrentOperations: 1000, // ms per operation
  memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
  maxResponseTime: 5000, // ms
  minThroughput: 10, // operations per second
};

describe('Performance Tests', () => {
  const mockClient = createMockAkamaiClient();
  const testServer = createTestServer();
  const perfTracker = new PerformanceTracker();
  const loadTester = new LoadTestRunner();
  const memoryMonitor = new MemoryMonitor();
  const concurrencyController = new ConcurrencyController();

  beforeEach(() => {
    jest.clearAllMocks();
    perfTracker.reset();
    memoryMonitor.startMonitoring();
  });

  afterEach(() => {
    memoryMonitor.stopMonitoring();
    // Ensure no memory leaks
    const memoryUsage = memoryMonitor.getMemoryUsage();
    if (memoryUsage.increase > PERFORMANCE_THRESHOLDS.memoryLeakThreshold) {
      console.warn(`Memory leak detected: ${memoryUsage.increase / 1024 / 1024}MB increase`);
    }
  });

  describe('Single Operation Performance', () => {
    it('should execute property list within performance threshold', async () => {
      const properties = TestDataGenerators.generateProperties(100);
      mockClient.request.mockResolvedValueOnce({
        properties: { items: properties },
      });

      perfTracker.start('propertyList');
      const result = await propertyTools.listProperties(mockClient, {});
      const duration = perfTracker.end('propertyList');

      expect(result.content[0].text).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
    });

    it('should handle large property rules efficiently', async () => {
      const largeRules = TestDataGenerators.generatePropertyRules(200); // Large rule tree
      
      mockClient.request.mockResolvedValueOnce({
        rules: largeRules,
      });

      perfTracker.start('largeRules');
      const result = await propertyTools.getPropertyRules(mockClient, {
        propertyId: 'prp_123',
      });
      const duration = perfTracker.end('largeRules');

      expect(result.content[0].text).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
    });

    it('should process complex DNS records quickly', async () => {
      const manyRecords = TestDataGenerators.generateDNSRecords(500);
      
      mockClient.request.mockResolvedValueOnce({
        recordsets: manyRecords,
      });

      perfTracker.start('dnsRecords');
      const result = await dnsTools.listRecords(mockClient, {
        zone: 'example.com',
      });
      const duration = perfTracker.end('dnsRecords');

      expect(result.content[0].text).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
    });

    it('should validate response formatting performance', async () => {
      const hugeDataset = TestDataGenerators.generateProperties(1000);
      
      mockClient.request.mockResolvedValueOnce({
        properties: { items: hugeDataset },
      });

      perfTracker.start('formatting');
      const result = await propertyTools.listProperties(mockClient, {});
      const duration = perfTracker.end('formatting');

      // Should format large datasets efficiently
      expect(result.content[0].text.length).toBeLessThan(50000); // Reasonable size
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should handle bulk property search efficiently', async () => {
      const searchTerms = Array.from({ length: 50 }, (_, i) => `site${i}.com`);
      
      // Mock responses for each search
      searchTerms.forEach(() => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(5) },
        });
      });

      perfTracker.start('bulkSearch');
      
      const promises = searchTerms.map(term =>
        propertyTools.searchProperties(mockClient, {
          propertyName: term,
        })
      );

      const results = await Promise.all(promises);
      const duration = perfTracker.end('bulkSearch');

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperation);
    });

    it('should batch DNS record operations efficiently', async () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        name: `record${i}`,
        type: 'A' as const,
        ttl: 300,
        rdata: [`192.0.2.${i % 254 + 1}`],
      }));

      // Mock changelist operations
      mockClient.request
        .mockResolvedValueOnce({ changelists: [] }) // Get changelists
        .mockResolvedValueOnce({}) // Create changelist
        .mockResolvedValueOnce({}) // Submit changelist
        .mockResolvedValueOnce({}); // Activate changelist

      perfTracker.start('bulkDNS');
      const result = await dnsTools.bulkCreateRecords(mockClient, {
        zone: 'example.com',
        records,
      });
      const duration = perfTracker.end('bulkDNS');

      expect(result.content[0].text).toContain('100 records');
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperation);
    });

    it('should handle certificate batch operations', async () => {
      const domains = Array.from({ length: 20 }, (_, i) => `secure${i}.example.com`);
      
      perfTracker.start('batchCerts');
      
      const enrollments = domains.map(domain => ({
        commonName: domain,
        adminContact: TestDataGenerators.generateContact(),
        techContact: TestDataGenerators.generateContact(),
        contractId: 'C-123',
      }));

      // Mock enrollment responses
      enrollments.forEach((_, i) => {
        mockClient.request.mockResolvedValueOnce({
          enrollmentId: 10000 + i,
        });
      });

      const promises = enrollments.map(enrollment =>
        cpsTools.createDVEnrollment(mockClient, enrollment)
      );

      const results = await Promise.all(promises);
      const duration = perfTracker.end('batchCerts');

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperation);
    });
  });

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent property operations', async () => {
      const concurrentOps = 10;
      const operationsPerType = 5;

      // Setup mock responses for all operations
      for (let i = 0; i < concurrentOps * operationsPerType; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(10) },
        });
      }

      perfTracker.start('concurrent');

      const operationTypes = [
        () => propertyTools.listProperties(mockClient, {}),
        () => propertyTools.searchProperties(mockClient, { propertyName: 'test' }),
        () => propertyTools.getProperty(mockClient, { propertyId: 'prp_test' }),
      ];

      const allPromises = [];
      for (let i = 0; i < concurrentOps; i++) {
        const randomOp = operationTypes[i % operationTypes.length];
        allPromises.push(randomOp());
      }

      const results = await Promise.all(allPromises);
      const duration = perfTracker.end('concurrent');

      expect(results).toHaveLength(concurrentOps);
      expect(duration / concurrentOps).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
    });

    it('should manage connection pooling efficiently', async () => {
      const connections = 20;
      
      // Test rapid-fire requests
      const promises = Array.from({ length: connections }, (_, i) => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });
        
        return propertyTools.listProperties(mockClient, {
          contractId: `C-${i}`,
        });
      });

      perfTracker.start('connectionPool');
      await Promise.all(promises);
      const duration = perfTracker.end('connectionPool');

      // Should handle many concurrent connections efficiently
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations * 2);
    });

    it('should handle rate limiting gracefully under load', async () => {
      const requestCount = 15;
      let rateLimitHit = false;

      // First few requests succeed, then rate limit, then recover
      for (let i = 0; i < 5; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });
      }
      
      // Rate limit responses
      for (let i = 5; i < 10; i++) {
        mockClient.request.mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '1' },
          },
        });
      }
      
      // Recovery responses
      for (let i = 10; i < requestCount; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });
      }

      perfTracker.start('rateLimitHandling');

      const results = await Promise.allSettled(
        Array.from({ length: requestCount }, () =>
          propertyTools.listProperties(mockClient, {
            retryOnRateLimit: true,
            maxRetries: 3,
          })
        )
      );

      const duration = perfTracker.end('rateLimitHandling');

      // Should handle rate limiting without catastrophic failure
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(requestCount * 0.6); // At least 60% success
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(50) },
        });

        await propertyTools.listProperties(mockClient, {});
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold);
    });

    it('should handle large response payloads without memory issues', async () => {
      const hugeProp = {
        ...TestDataGenerators.generateProperties(1)[0],
        rules: TestDataGenerators.generatePropertyRules(1000), // Very large rule tree
      };

      mockClient.request.mockResolvedValueOnce({
        properties: hugeProp,
      });

      const beforeMemory = process.memoryUsage().heapUsed;

      const result = await propertyTools.getProperty(mockClient, {
        propertyId: 'prp_huge',
      });

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryDelta = afterMemory - beforeMemory;

      expect(result.content[0].text).toBeDefined();
      expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should clean up resources after failed operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate failures with large payloads
      for (let i = 0; i < 50; i++) {
        mockClient.request.mockRejectedValueOnce({
          response: {
            status: 500,
            data: TestDataGenerators.generateLargeErrorResponse(),
          },
        });

        try {
          await propertyTools.listProperties(mockClient, {});
        } catch (error) {
          // Expected to fail
        }
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not accumulate memory from failed operations
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const testDuration = 5000; // 5 seconds
      const operationsPerSecond = 10;
      const totalOperations = Math.floor((testDuration / 1000) * operationsPerSecond);

      // Setup responses
      for (let i = 0; i < totalOperations; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(5) },
        });
      }

      const startTime = Date.now();
      const results = [];

      while (Date.now() - startTime < testDuration) {
        const batchPromises = [];
        
        for (let i = 0; i < operationsPerSecond && Date.now() - startTime < testDuration; i++) {
          batchPromises.push(
            propertyTools.listProperties(mockClient, {})
          );
        }

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay to maintain target rate
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const actualDuration = Date.now() - startTime;
      const actualThroughput = results.length / (actualDuration / 1000);

      expect(actualThroughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.minThroughput);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should scale with increasing concurrent users', async () => {
      const userCounts = [1, 5, 10, 20];
      const operationsPerUser = 5;

      for (const userCount of userCounts) {
        const totalOps = userCount * operationsPerUser;
        
        // Setup responses
        for (let i = 0; i < totalOps; i++) {
          mockClient.request.mockResolvedValueOnce({
            properties: { items: TestDataGenerators.generateProperties(3) },
          });
        }

        perfTracker.start(`users_${userCount}`);

        // Simulate concurrent users
        const userPromises = Array.from({ length: userCount }, async () => {
          const userOps = Array.from({ length: operationsPerUser }, () =>
            propertyTools.listProperties(mockClient, {})
          );
          return Promise.all(userOps);
        });

        const results = await Promise.all(userPromises);
        const duration = perfTracker.end(`users_${userCount}`);

        expect(results.flat()).toHaveLength(totalOps);
        
        // Performance should degrade gracefully
        const throughput = totalOps / (duration / 1000);
        expect(throughput).toBeGreaterThan(userCount * 2); // Reasonable throughput
      }
    });
  });

  describe('Response Time Analysis', () => {
    it('should maintain consistent response times', async () => {
      const measurements = [];
      const iterations = 20;

      // Setup responses
      for (let i = 0; i < iterations; i++) {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: TestDataGenerators.generateProperties(10) },
        });
      }

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await propertyTools.listProperties(mockClient, {});
        const end = performance.now();
        
        measurements.push(end - start);
      }

      // Calculate statistics
      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const max = Math.max(...measurements);
      const min = Math.min(...measurements);
      const variance = measurements.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / measurements.length;
      const stdDev = Math.sqrt(variance);

      // Response times should be consistent
      expect(avg).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
      expect(max).toBeLessThan(PERFORMANCE_THRESHOLDS.maxResponseTime);
      expect(stdDev / avg).toBeLessThan(0.5); // Coefficient of variation < 50%
    });

    it('should handle response time outliers', async () => {
      const measurements = [];
      const iterations = 50;

      // Setup responses with some slow ones
      for (let i = 0; i < iterations; i++) {
        const delay = i % 10 === 0 ? 1000 : 0; // Every 10th request is slow
        
        mockClient.request.mockImplementationOnce(async () => {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          return { properties: { items: [] } };
        });
      }

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await propertyTools.listProperties(mockClient, {});
        const end = performance.now();
        
        measurements.push(end - start);
      }

      // Calculate percentiles
      const sorted = measurements.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      // Most requests should be fast
      expect(p50).toBeLessThan(PERFORMANCE_THRESHOLDS.singleOperation);
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.maxResponseTime);
      
      // Even outliers should be reasonable
      expect(p99).toBeLessThan(PERFORMANCE_THRESHOLDS.maxResponseTime * 2);
    });
  });

  describe('Resource Utilization', () => {
    it('should efficiently utilize CPU during intensive operations', async () => {
      const cpuUsageBefore = process.cpuUsage();
      
      // CPU-intensive operation: processing large rule trees
      const largeTasks = Array.from({ length: 20 }, () => {
        const rules = TestDataGenerators.generatePropertyRules(500);
        mockClient.request.mockResolvedValueOnce({ rules });
        
        return propertyTools.getPropertyRules(mockClient, {
          propertyId: 'prp_cpu_test',
        });
      });

      await Promise.all(largeTasks);
      
      const cpuUsageAfter = process.cpuUsage(cpuUsageBefore);
      const totalCpuTime = cpuUsageAfter.user + cpuUsageAfter.system;
      
      // Should complete efficiently without excessive CPU usage
      expect(totalCpuTime).toBeLessThan(2000000); // Less than 2 seconds of CPU time
    });

    it('should handle file descriptor limits gracefully', async () => {
      const concurrentConnections = 100; // More than typical ulimit
      
      // Setup many concurrent requests
      const promises = Array.from({ length: concurrentConnections }, (_, i) => {
        mockClient.request.mockResolvedValueOnce({
          properties: { items: [] },
        });
        
        return propertyTools.listProperties(mockClient, {
          customer: `customer_${i % 10}`, // Different customers
        });
      });

      perfTracker.start('fileDescriptors');
      const results = await Promise.allSettled(promises);
      const duration = perfTracker.end('fileDescriptors');

      // Should handle many connections without errors
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(concurrentConnections * 0.9); // 90% success rate
      expect(duration).toBeLessThan(10000); // Complete within 10 seconds
    });
  });

  describe('Benchmarking', () => {
    it('should benchmark against baseline performance', async () => {
      const benchmarks = {
        propertyList: { baseline: 200, target: 150 }, // ms
        dnsRecords: { baseline: 300, target: 200 },
        ruleProcessing: { baseline: 500, target: 300 },
      };

      // Property list benchmark
      mockClient.request.mockResolvedValueOnce({
        properties: { items: TestDataGenerators.generateProperties(100) },
      });

      perfTracker.start('benchmark_propertyList');
      await propertyTools.listProperties(mockClient, {});
      const propertyListTime = perfTracker.end('benchmark_propertyList');

      // DNS records benchmark  
      mockClient.request.mockResolvedValueOnce({
        recordsets: TestDataGenerators.generateDNSRecords(200),
      });

      perfTracker.start('benchmark_dnsRecords');
      await dnsTools.listRecords(mockClient, { zone: 'example.com' });
      const dnsRecordsTime = perfTracker.end('benchmark_dnsRecords');

      // Rule processing benchmark
      mockClient.request.mockResolvedValueOnce({
        rules: TestDataGenerators.generatePropertyRules(100),
      });

      perfTracker.start('benchmark_ruleProcessing');
      await propertyTools.getPropertyRules(mockClient, { propertyId: 'prp_123' });
      const ruleProcessingTime = perfTracker.end('benchmark_ruleProcessing');

      // Compare against targets
      expect(propertyListTime).toBeLessThan(benchmarks.propertyList.target);
      expect(dnsRecordsTime).toBeLessThan(benchmarks.dnsRecords.target);
      expect(ruleProcessingTime).toBeLessThan(benchmarks.ruleProcessing.target);

      // Log performance improvements
      console.log('Performance Benchmarks:');
      console.log(`Property List: ${propertyListTime}ms (target: ${benchmarks.propertyList.target}ms)`);
      console.log(`DNS Records: ${dnsRecordsTime}ms (target: ${benchmarks.dnsRecords.target}ms)`);
      console.log(`Rule Processing: ${ruleProcessingTime}ms (target: ${benchmarks.ruleProcessing.target}ms)`);
    });
  });
});