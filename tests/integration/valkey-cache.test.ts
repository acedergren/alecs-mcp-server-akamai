/**
 * Valkey Cache Integration Tests
 * Tests the cache functionality with a real Redis/Valkey instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ValkeyCache, CacheTTL } from '../../src/services/valkey-cache-service';
import { AkamaiCacheService } from '../../src/services/akamai-cache-service';
import { AkamaiClient } from '../../src/akamai-client';
import Redis from 'ioredis';

// Skip tests if Redis/Valkey is not available
const REDIS_HOST = process.env.VALKEY_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.VALKEY_PORT || '6379');

describe('Valkey Cache Integration Tests', () => {
  let cache: ValkeyCache;
  let akamaiCache: AkamaiCacheService;
  let testClient: Redis;
  let isRedisAvailable = false;

  beforeAll(async () => {
    // Check if Redis/Valkey is available
    testClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    try {
      await testClient.connect();
      await testClient.ping();
      isRedisAvailable = true;
      await testClient.quit();
    } catch (err) {
      console.log('Redis/Valkey not available, skipping integration tests');
    }

    if (isRedisAvailable) {
      cache = new ValkeyCache({
        mode: 'single',
        keyPrefix: 'test:akamai:',
        nodes: [{ host: REDIS_HOST, port: REDIS_PORT }],
      });
      await cache.connect();
      
      akamaiCache = new AkamaiCacheService(cache);
      await akamaiCache.initialize();
    }
  });

  afterAll(async () => {
    if (isRedisAvailable && cache) {
      await cache.flushAll();
      await cache.close();
    }
  });

  beforeEach(async () => {
    if (isRedisAvailable && cache) {
      await cache.flushAll();
    }
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values', async () => {
      if (!isRedisAvailable) return;

      const key = 'test:key';
      const value = { name: 'test', data: [1, 2, 3] };

      await cache.set(key, value, 60);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      if (!isRedisAvailable) return;

      const result = await cache.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      if (!isRedisAvailable) return;

      const key = 'ttl:test';
      await cache.set(key, 'value', 1); // 1 second TTL

      const immediate = await cache.get(key);
      expect(immediate).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const expired = await cache.get(key);
      expect(expired).toBeNull();
    });

    it('should handle large values', async () => {
      if (!isRedisAvailable) return;

      const largeObject = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A'.repeat(100),
        })),
      };

      await cache.set('large:object', largeObject, 60);
      const retrieved = await cache.get('large:object');

      expect(retrieved).toEqual(largeObject);
    });
  });

  describe('Smart Refresh Pattern', () => {
    it('should return cached value when fresh', async () => {
      if (!isRedisAvailable) return;

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fresh' };
      };

      // First call should fetch
      const result1 = await cache.getWithRefresh('refresh:test', 60, fetchFn);
      expect(result1).toEqual({ data: 'fresh' });
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await cache.getWithRefresh('refresh:test', 60, fetchFn);
      expect(result2).toEqual({ data: 'fresh' });
      expect(fetchCount).toBe(1); // No additional fetch
    });

    it('should trigger background refresh when approaching TTL', async () => {
      if (!isRedisAvailable) return;

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { data: `fetch-${fetchCount}` };
      };

      // Initial fetch
      await cache.getWithRefresh('threshold:test', 2, fetchFn, {
        refreshThreshold: 0.6, // Refresh when 60% of TTL remains
      });
      expect(fetchCount).toBe(1);

      // Wait until we're in the refresh threshold
      await new Promise(resolve => setTimeout(resolve, 1000));

      // This should trigger background refresh
      const result = await cache.getWithRefresh('threshold:test', 2, fetchFn, {
        refreshThreshold: 0.6,
      });
      
      expect(result).toEqual({ data: 'fetch-1' }); // Still returns old value
      
      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fetchCount).toBe(2); // Background refresh happened
    });

    it('should handle stale-while-revalidate', async () => {
      if (!isRedisAvailable) return;

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Slow fetch
        return { data: `fetch-${fetchCount}` };
      };

      // Initial fetch
      await cache.set('stale:test', { data: 'stale' }, -1); // Already expired
      
      const result = await cache.getWithRefresh('stale:test', 60, fetchFn, {
        softTTL: 300, // Serve stale for 5 minutes
      });

      expect(result).toEqual({ data: 'stale' }); // Returns stale immediately
      expect(fetchCount).toBe(0); // Background refresh started but not completed

      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(fetchCount).toBe(1); // Background refresh completed
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple keys efficiently', async () => {
      if (!isRedisAvailable) return;

      const testData = {
        'batch:1': { id: 1, name: 'Item 1' },
        'batch:2': { id: 2, name: 'Item 2' },
        'batch:3': { id: 3, name: 'Item 3' },
      };

      // Set all values
      for (const [key, value] of Object.entries(testData)) {
        await cache.set(key, value, 60);
      }

      // Batch get
      const result = await cache.mget(Object.keys(testData));

      expect(result.size).toBe(3);
      expect(result.get('batch:1')).toEqual(testData['batch:1']);
      expect(result.get('batch:2')).toEqual(testData['batch:2']);
      expect(result.get('batch:3')).toEqual(testData['batch:3']);
    });

    it('should handle partial hits in batch get', async () => {
      if (!isRedisAvailable) return;

      await cache.set('exists:1', { data: 'one' }, 60);
      await cache.set('exists:3', { data: 'three' }, 60);

      const result = await cache.mget(['exists:1', 'exists:2', 'exists:3']);

      expect(result.size).toBe(2);
      expect(result.has('exists:1')).toBe(true);
      expect(result.has('exists:2')).toBe(false);
      expect(result.has('exists:3')).toBe(true);
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', async () => {
      if (!isRedisAvailable) return;

      // Set multiple keys
      await cache.set('pattern:test:1', 'value1', 60);
      await cache.set('pattern:test:2', 'value2', 60);
      await cache.set('pattern:test:3', 'value3', 60);
      await cache.set('other:key', 'other', 60);

      // Delete by pattern
      const deleted = await cache.scanAndDelete('pattern:test:*');

      expect(deleted).toBe(3);

      // Verify deletion
      expect(await cache.get('pattern:test:1')).toBeNull();
      expect(await cache.get('pattern:test:2')).toBeNull();
      expect(await cache.get('pattern:test:3')).toBeNull();
      expect(await cache.get('other:key')).toBe('other'); // Should still exist
    });
  });

  describe('Cache Metrics', () => {
    it('should track hits and misses', async () => {
      if (!isRedisAvailable) return;

      // Reset metrics
      await cache.flushAll();
      const freshCache = new ValkeyCache({
        mode: 'single',
        keyPrefix: 'metrics:test:',
        nodes: [{ host: REDIS_HOST, port: REDIS_PORT }],
      });
      await freshCache.connect();

      // Generate some hits and misses
      await freshCache.set('exists', 'value', 60);
      
      await freshCache.get('exists'); // Hit
      await freshCache.get('exists'); // Hit
      await freshCache.get('missing'); // Miss
      await freshCache.get('missing2'); // Miss
      await freshCache.get('missing3'); // Miss

      const metrics = freshCache.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(3);
      expect(metrics.hitRate).toBeCloseTo(40, 0); // 40% hit rate

      await freshCache.close();
    });
  });

  describe('Lock-based Stampede Prevention', () => {
    it('should prevent multiple simultaneous fetches', async () => {
      if (!isRedisAvailable) return;

      let fetchCount = 0;
      let activeCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        activeCount++;
        
        if (activeCount > 1) {
          throw new Error('Multiple simultaneous fetches detected!');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        activeCount--;
        return { data: 'result' };
      };

      // Launch multiple requests simultaneously
      const promises = Array(5).fill(0).map(() => 
        cache.getWithRefresh('stampede:test', 60, fetchFn)
      );

      const results = await Promise.all(promises);

      // All should get the same result
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual({ data: 'result' });
      });

      // Only one fetch should have occurred
      expect(fetchCount).toBe(1);
    });
  });

  describe('Akamai Cache Service', () => {
    it('should cache property search results', async () => {
      if (!isRedisAvailable) return;

      // Mock search results
      const mockResults = [
        {
          type: 'exact_hostname' as const,
          property: { propertyId: 'prp_123', propertyName: 'Test Property' },
          hostname: { cnameFrom: 'www.example.com' },
        },
      ];

      // Store in cache
      await akamaiCache['cache'].set('test:search:www.example.com', mockResults, 300);

      // Retrieve from cache
      const cached = await akamaiCache['cache'].get('test:search:www.example.com');
      expect(cached).toEqual(mockResults);
    });

    it('should build proper cache keys', async () => {
      if (!isRedisAvailable) return;

      const testData = {
        'customer1:properties:all': ['prop1', 'prop2'],
        'customer1:property:prp_123': { id: 'prp_123' },
        'customer1:hostname:www.example.com': { hostname: 'www.example.com' },
      };

      for (const [key, value] of Object.entries(testData)) {
        await akamaiCache['cache'].set(key, value, 60);
      }

      // Verify keys exist
      for (const key of Object.keys(testData)) {
        const value = await akamaiCache['cache'].get(key);
        expect(value).toBeTruthy();
      }
    });

    it('should handle cache invalidation cascade', async () => {
      if (!isRedisAvailable) return;

      // Set up related cache entries
      await akamaiCache['cache'].set('test:property:prp_123', { id: 'prp_123' }, 60);
      await akamaiCache['cache'].set('test:property:prp_123:hostnames', ['host1'], 60);
      await akamaiCache['cache'].set('test:properties:all', ['prp_123'], 60);
      await akamaiCache['cache'].set('test:search:example', [{ property: 'prp_123' }], 60);

      // Invalidate property
      await akamaiCache.invalidateProperty('prp_123', 'test');

      // Verify all related entries are deleted
      expect(await akamaiCache['cache'].get('test:property:prp_123')).toBeNull();
      expect(await akamaiCache['cache'].get('test:property:prp_123:hostnames')).toBeNull();
      expect(await akamaiCache['cache'].get('test:properties:all')).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high throughput', async () => {
      if (!isRedisAvailable) return;

      const iterations = 1000;
      const startTime = Date.now();

      // Parallel writes
      const writePromises = Array(iterations).fill(0).map((_, i) => 
        cache.set(`perf:test:${i}`, { index: i }, 60)
      );
      await Promise.all(writePromises);

      // Parallel reads
      const readPromises = Array(iterations).fill(0).map((_, i) => 
        cache.get(`perf:test:${i}`)
      );
      const results = await Promise.all(readPromises);

      const duration = Date.now() - startTime;
      const opsPerSecond = (iterations * 2) / (duration / 1000);

      console.log(`Performance: ${opsPerSecond.toFixed(0)} ops/second`);

      // Verify all reads succeeded
      expect(results.filter(r => r !== null)).toHaveLength(iterations);
      expect(opsPerSecond).toBeGreaterThan(1000); // Should handle >1000 ops/sec
    });

    it('should efficiently handle large batch operations', async () => {
      if (!isRedisAvailable) return;

      const batchSize = 100;
      const keys: string[] = [];
      const values: Record<string, any> = {};

      // Prepare test data
      for (let i = 0; i < batchSize; i++) {
        const key = `batch:perf:${i}`;
        keys.push(key);
        values[key] = { id: i, data: `Data for item ${i}` };
        await cache.set(key, values[key], 60);
      }

      const startTime = Date.now();
      const result = await cache.mget(keys);
      const duration = Date.now() - startTime;

      expect(result.size).toBe(batchSize);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
      
      // Verify all values match
      for (const [key, value] of result) {
        expect(value).toEqual(values[key]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle connection failures', async () => {
      if (!isRedisAvailable) return;

      const failingCache = new ValkeyCache({
        mode: 'single',
        keyPrefix: 'fail:test:',
        nodes: [{ host: 'invalid-host', port: 9999 }],
        connectTimeout: 100,
      });

      // Should not throw, but return null/false
      const getResult = await failingCache.get('any:key');
      expect(getResult).toBeNull();

      const setResult = await failingCache.set('any:key', 'value', 60);
      expect(setResult).toBe(false);

      await failingCache.close();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      if (!isRedisAvailable) return;

      // Manually set invalid JSON
      const redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
      });
      await redis.set('test:akamai:invalid:json', '{invalid json}');
      await redis.quit();

      const result = await cache.get('invalid:json');
      expect(result).toBeNull();
    });
  });
});