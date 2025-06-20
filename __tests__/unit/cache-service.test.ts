/**
 * Unit Tests for Cache Service
 * Tests cache logic without requiring a real Redis instance
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ValkeyCache, CacheTTL } from '../../src/services/valkey-cache-service';
import { AkamaiCacheService } from '../../src/services/akamai-cache-service';

// Mock ioredis
const mockRedisInstance = {
  connect: jest.fn(() => Promise.resolve()),
  get: jest.fn<(key: string) => Promise<string | null>>(),
  set: jest.fn<(key: string, value: string) => Promise<string>>(),
  setex: jest.fn<(key: string, ttl: number, value: string) => Promise<string>>(),
  del: jest.fn<(...keys: string[]) => Promise<number>>(),
  ttl: jest.fn<(key: string) => Promise<number>>(),
  mget: jest.fn<(...keys: string[]) => Promise<(string | null)[]>>(),
  expire: jest.fn<(key: string, ttl: number) => Promise<number>>(),
  hincrby: jest.fn<(key: string, field: string, increment: number) => Promise<number>>(),
  hgetall: jest.fn<(key: string) => Promise<Record<string, string>>>(),
  flushdb: jest.fn<() => Promise<string>>(),
  quit: jest.fn<() => Promise<string>>(),
  on: jest.fn(),
  status: 'ready',
  scanStream: jest.fn().mockReturnValue({
    on: jest.fn((event: string, callback: any) => {
      if (event === 'data') {
        callback(['test:customer1:search:key1', 'test:customer1:search:key2']);
      } else if (event === 'end') {
        callback();
      }
    }),
  }),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedisInstance),
  Cluster: jest.fn(() => mockRedisInstance),
}));

describe('Cache Service Unit Tests', () => {
  let cache: ValkeyCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new ValkeyCache({ keyPrefix: 'test:' });
  });

  describe('ValkeyCache', () => {
    it('should build keys with prefix', async () => {
      await cache.set('mykey', 'value', 60);
      
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:mykey',
        60,
        JSON.stringify('value')
      );
    });

    it('should handle get operations', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'test' }));
      
      const result = await cache.get('testkey');
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test:testkey');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for missing keys', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      
      const result = await cache.get('missing');
      
      expect(result).toBeNull();
    });

    it('should handle set operations', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      
      const result = await cache.set('key', { value: 123 }, 300);
      
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify({ value: 123 })
      );
      expect(result).toBe(true);
    });

    it('should warn about large values', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const largeValue = 'x'.repeat(60 * 1024 * 1024); // 60MB string
      
      await cache.set('large', largeValue, 60);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Valkey] Warning: Large value')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle TTL checks', async () => {
      mockRedisInstance.ttl.mockResolvedValue(120);
      
      const ttl = await cache.ttl('key');
      
      expect(mockRedisInstance.ttl).toHaveBeenCalledWith('test:key');
      expect(ttl).toBe(120);
    });

    it('should handle batch get operations', async () => {
      mockRedisInstance.mget.mockResolvedValue([
        JSON.stringify({ id: 1 }),
        null,
        JSON.stringify({ id: 3 }),
      ]);
      
      const result = await cache.mget(['key1', 'key2', 'key3']);
      
      expect(mockRedisInstance.mget).toHaveBeenCalledWith(
        'test:key1',
        'test:key2',
        'test:key3'
      );
      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual({ id: 1 });
      expect(result.get('key3')).toEqual({ id: 3 });
      expect(result.has('key2')).toBe(false);
    });

    it('should track metrics', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify('hit'))
        .mockResolvedValueOnce(null);
      
      await cache.get('exists');
      await cache.get('missing');
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(50);
    });
  });

  describe('Smart Refresh Logic', () => {
    it('should return cached value when fresh', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      mockRedisInstance.ttl.mockResolvedValue(50); // 50 seconds remaining
      
      const fetchFn = jest.fn<() => Promise<{ data: string }>>().mockResolvedValue({ data: 'fresh' });
      
      const result = await cache.getWithRefresh('key', 60, fetchFn as any);
      
      expect(result).toEqual({ data: 'cached' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should trigger background refresh at threshold', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      mockRedisInstance.ttl.mockResolvedValue(10); // Only 10 seconds remaining
      
      const fetchFn = jest.fn<() => Promise<{ data: string }>>().mockResolvedValue({ data: 'fresh' });
      
      const result = await cache.getWithRefresh('key', 60, fetchFn as any, {
        refreshThreshold: 0.2, // Refresh when 20% remains (12 seconds)
      });
      
      expect(result).toEqual({ data: 'cached' });
      
      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should fetch when cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.setex.mockResolvedValue('OK');
      
      const fetchFn = jest.fn<() => Promise<{ data: string }>>().mockResolvedValue({ data: 'fetched' });
      
      const result = await cache.getWithRefresh('key', 60, fetchFn as any);
      
      expect(result).toEqual({ data: 'fetched' });
      expect(fetchFn).toHaveBeenCalled();
      expect(mockRedisInstance.setex).toHaveBeenCalled();
    });
  });

  describe('AkamaiCacheService', () => {
    let akamaiCache: AkamaiCacheService;
    let mockClient: any;

    beforeEach(() => {
      akamaiCache = new AkamaiCacheService(cache);
      mockClient = {
        request: jest.fn(),
      };
    });

    it('should cache properties list', async () => {
      const mockProperties = [
        { propertyId: 'prp_123', propertyName: 'Test 1' },
        { propertyId: 'prp_456', propertyName: 'Test 2' },
      ];
      
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.ttl.mockResolvedValue(-1);
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockClient.request.mockResolvedValue({
        properties: { items: mockProperties },
      });
      
      const result = await akamaiCache.getProperties(mockClient, 'customer1');
      
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties',
        method: 'GET',
      });
      expect(result).toEqual(mockProperties);
    });

    it('should return cached properties on second call', async () => {
      const mockProperties = [{ propertyId: 'prp_123' }];
      
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockProperties));
      mockRedisInstance.ttl.mockResolvedValue(200);
      
      const result = await akamaiCache.getProperties(mockClient, 'customer1');
      
      expect(mockClient.request).not.toHaveBeenCalled();
      expect(result).toEqual(mockProperties);
    });

    it('should search with hostname optimization', async () => {
      const mockProperty = { propertyId: 'prp_123', propertyName: 'Test' };
      const mockHostname = { cnameFrom: 'www.example.com' };
      
      // First check - exact hostname match
      mockRedisInstance.get
        .mockResolvedValueOnce(JSON.stringify({ property: mockProperty, hostname: mockHostname }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      
      const results = await akamaiCache.search(mockClient, 'www.example.com');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('exact_hostname');
      expect(results[0].property).toEqual(mockProperty);
    });

    it('should handle property invalidation', async () => {
      mockRedisInstance.del.mockResolvedValue(3);
      (mockRedisInstance as any).scanStream = jest.fn().mockReturnValue({
        on: jest.fn((event: string, callback: any) => {
          if (event === 'data') {
            callback(['test:customer1:search:key1', 'test:customer1:search:key2']);
          } else if (event === 'end') {
            callback();
          }
        }),
      });
      
      await akamaiCache.invalidateProperty('prp_123', 'customer1');
      
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        expect.arrayContaining([
          'test:customer1:property:prp_123',
          'test:customer1:properties:all',
          'test:customer1:hostname:map',
        ])
      );
    });
  });

  describe('Cache Key Patterns', () => {
    it('should generate correct key patterns', () => {
      const patterns = [
        { input: 'properties:all', expected: 'test:properties:all' },
        { input: 'property:prp_123', expected: 'test:property:prp_123' },
        { input: 'hostname:www.example.com', expected: 'test:hostname:www.example.com' },
        { input: 'search:query', expected: 'test:search:query' },
      ];

      patterns.forEach(({ input, expected }) => {
        // Access private method through any type
        const key = (cache as any).buildKey(input);
        expect(key).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await cache.get('key');
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid json');
      
      const result = await cache.get('key');
      
      expect(result).toBeNull();
    });

    it('should continue on stats errors', async () => {
      mockRedisInstance.hincrby.mockRejectedValue(new Error('Stats error'));
      
      // Should not throw
      await expect(cache.get('key')).resolves.toBeNull();
    });
  });

  describe('TTL Configuration', () => {
    it('should have appropriate TTL values', () => {
      expect(CacheTTL.PROPERTIES_LIST).toBe(300); // 5 minutes
      expect(CacheTTL.PROPERTY_DETAILS).toBe(900); // 15 minutes
      expect(CacheTTL.HOSTNAMES).toBe(1800); // 30 minutes
      expect(CacheTTL.CONTRACTS).toBe(86400); // 24 hours
      expect(CacheTTL.GROUPS).toBe(86400); // 24 hours
    });
  });
});