/**
 * Unit Tests for Cache Service
 * Tests cache logic for SmartCache implementation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SmartCache } from '../../src/utils/smart-cache';
import { AkamaiCacheService } from '../../src/services/akamai-cache-service';

describe('Cache Service Unit Tests', () => {
  let cache: SmartCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new SmartCache({ 
      maxSize: 100,
      defaultTTL: 60,
      enableMetrics: true 
    });
  });

  afterEach(async () => {
    await cache.close();
  });

  describe('SmartCache', () => {
    it('should set and get values', async () => {
      await cache.set('mykey', 'value', 60);
      const result = await cache.get('mykey');
      expect(result).toBe('value');
    });

    it('should handle JSON values', async () => {
      const obj = { name: 'test', value: 123 };
      await cache.set('json', obj, 60);
      
      const result = await cache.get('json');
      expect(result).toEqual(obj);
    });

    it('should respect TTL', async () => {
      jest.useFakeTimers();
      
      await cache.set('ttl-test', 'value', 1); // 1 second TTL
      
      let result = await cache.get('ttl-test');
      expect(result).toBe('value');
      
      // Fast forward 2 seconds
      jest.advanceTimersByTime(2000);
      
      result = await cache.get('ttl-test');
      expect(result).toBeNull();
      
      jest.useRealTimers();
    });

    it('should delete keys', async () => {
      await cache.set('delete-me', 'value', 60);
      let result = await cache.get('delete-me');
      expect(result).toBe('value');
      
      await cache.del('delete-me');
      result = await cache.get('delete-me');
      expect(result).toBeNull();
    });

    it('should handle mget for multiple keys', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);
      
      const results = await cache.mget(['key1', 'key2', 'key3', 'missing']);
      expect(results).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should track cache metrics', async () => {
      await cache.set('metric-test', 'value', 60);
      
      // Hit
      await cache.get('metric-test');
      
      // Miss
      await cache.get('non-existent');
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
    });

    it('should handle large values with compression', async () => {
      const largeValue = 'x'.repeat(10240); // 10KB
      await cache.set('large', largeValue, 60);
      
      const result = await cache.get('large');
      expect(result).toBe(largeValue);
    });

    it('should handle eviction based on maxSize', async () => {
      const smallCache = new SmartCache({ maxSize: 3, defaultTTL: 60 });
      
      await smallCache.set('key1', 'value1', 60);
      await smallCache.set('key2', 'value2', 60);
      await smallCache.set('key3', 'value3', 60);
      await smallCache.set('key4', 'value4', 60); // Should evict key1
      
      const result1 = await smallCache.get('key1');
      expect(result1).toBeNull(); // Evicted
      
      const result4 = await smallCache.get('key4');
      expect(result4).toBe('value4'); // Still present
      
      await smallCache.close();
    });
  });

  describe('AkamaiCacheService', () => {
    let cacheService: AkamaiCacheService;
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        makeRequest: jest.fn(),
      };
      cacheService = new AkamaiCacheService(cache);
    });

    it('should cache API responses', async () => {
      const mockResponse = { data: 'test' };
      mockClient.makeRequest.mockResolvedValueOnce(mockResponse);

      // First call - should hit API
      const result1 = await cacheService.cached(
        'test-key',
        () => mockClient.makeRequest('/test'),
        300,
      );
      expect(result1).toEqual(mockResponse);
      expect(mockClient.makeRequest).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      const result2 = await cacheService.cached(
        'test-key',
        () => mockClient.makeRequest('/test'),
        300,
      );
      expect(result2).toEqual(mockResponse);
      expect(mockClient.makeRequest).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should bypass cache when disabled', async () => {
      const mockResponse = { data: 'test' };
      mockClient.makeRequest.mockResolvedValue(mockResponse);

      // First call
      await cacheService.cached(
        'bypass-key',
        () => mockClient.makeRequest('/test'),
        300,
        { bypass: true },
      );
      expect(mockClient.makeRequest).toHaveBeenCalledTimes(1);

      // Second call with bypass
      await cacheService.cached(
        'bypass-key',
        () => mockClient.makeRequest('/test'),
        300,
        { bypass: true },
      );
      expect(mockClient.makeRequest).toHaveBeenCalledTimes(2);
    });
  });
});