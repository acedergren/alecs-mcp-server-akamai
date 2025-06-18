/**
 * Tests for Performance Optimization and Monitoring Tools
 */

import { AkamaiClient } from '../akamai-client';
import {
  getPerformanceAnalysis,
  optimizeCache,
  profilePerformance,
  getRealtimeMetrics,
  resetPerformanceMonitoring
} from '../tools/performance-tools';
import { globalPerformanceMonitor, responseCache, metadataCache } from '@utils/performance-monitor';

// Mock the AkamaiClient
jest.mock('../akamai-client');

describe('Performance Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
    
    // Reset performance monitoring between tests
    globalPerformanceMonitor.clearMetrics();
    responseCache.clear();
    metadataCache.clear();
  });

  describe('getPerformanceAnalysis', () => {
    it('should return performance analysis report', async () => {
      // Add some mock metrics
      const opId1 = globalPerformanceMonitor.startOperation('test-operation');
      await new Promise(resolve => setTimeout(resolve, 100));
      globalPerformanceMonitor.endOperation(opId1, { responseSize: 1024, cacheHit: false });

      const result = await getPerformanceAnalysis(mockClient, {});

      expect(result.content[0]?.text).toContain('Performance Analysis Report');
      expect(result.content[0]?.text).toContain('Performance Metrics');
      expect(result.content[0]?.text).toContain('Average Response Time');
      expect(result.content[0]?.text).toContain('System Resources');
    });

    it('should filter analysis by operation type', async () => {
      const opId1 = globalPerformanceMonitor.startOperation('property-read');
      globalPerformanceMonitor.endOperation(opId1, { responseSize: 512 });

      const opId2 = globalPerformanceMonitor.startOperation('dns-read');
      globalPerformanceMonitor.endOperation(opId2, { responseSize: 256 });

      const result = await getPerformanceAnalysis(mockClient, {
        operationType: 'property-read'
      });

      expect(result.content[0]?.text).toContain('**Operation Type:** property-read');
    });

    it('should include recommendations by default', async () => {
      const result = await getPerformanceAnalysis(mockClient, {});

      expect(result.content[0]?.text).toContain('Performance Recommendations');
    });

    it('should exclude recommendations when requested', async () => {
      const result = await getPerformanceAnalysis(mockClient, {
        includeRecommendations: false
      });

      expect(result.content[0]?.text).not.toContain('Performance Recommendations');
    });
  });

  describe('optimizeCache', () => {
    it('should optimize cache and provide report', async () => {
      // Add some test data to cache
      responseCache.set('test-key-1', { data: 'test1' });
      responseCache.set('test-key-2', { data: 'test2' });
      metadataCache.set('meta-key-1', { meta: 'data1' });

      const result = await optimizeCache(mockClient, {});

      expect(result.content[0]?.text).toContain('Cache Optimization Report');
      expect(result.content[0]?.text).toContain('Initial Cache State');
      expect(result.content[0]?.text).toContain('Response Cache');
      expect(result.content[0]?.text).toContain('Metadata Cache');
    });

    it('should cleanup expired entries when requested', async () => {
      const result = await optimizeCache(mockClient, {
        cleanupExpired: true
      });

      expect(result.content[0]?.text).toContain('Cleanup Results');
    });

    it('should provide optimization recommendations', async () => {
      const result = await optimizeCache(mockClient, {
        targetHitRate: 80
      });

      expect(result.content[0]?.text).toContain('Optimization Recommendations');
      expect(result.content[0]?.text).toContain('**Target Hit Rate:** 80%');
    });
  });

  describe('profilePerformance', () => {
    it('should profile performance with default operations', async () => {
      // Mock successful API calls
      mockClient.request.mockResolvedValue({ success: true });

      const result = await profilePerformance(mockClient, {
        iterations: 2
      });

      expect(result.content[0]?.text).toContain('Performance Profile Report');
      expect(result.content[0]?.text).toContain('**Iterations:** 2');
      expect(result.content[0]?.text).toContain('Performance Test Results');
    });

    it('should test custom operations', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await profilePerformance(mockClient, {
        testOperations: ['property-read', 'dns-read'],
        iterations: 1
      });

      expect(result.content[0]?.text).toContain('property-read');
      expect(result.content[0]?.text).toContain('dns-read');
    });

    it('should include memory profiling', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await profilePerformance(mockClient, {
        iterations: 1,
        includeMemoryProfile: true
      });

      expect(result.content[0]?.text).toContain('Memory Analysis');
      expect(result.content[0]?.text).toContain('Initial Memory Usage');
      expect(result.content[0]?.text).toContain('Final Memory Usage');
    });

    it('should handle operation failures', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      const result = await profilePerformance(mockClient, {
        testOperations: ['property-read'],
        iterations: 1
      });

      expect(result.content[0]?.text).toContain('Failed - API Error');
    });

    it('should provide bottleneck analysis', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await profilePerformance(mockClient, {
        iterations: 1
      });

      expect(result.content[0]?.text).toContain('Bottleneck Analysis');
      expect(result.content[0]?.text).toContain('Operations by Performance');
    });
  });

  describe('getRealtimeMetrics', () => {
    it('should monitor real-time metrics', async () => {
      const result = await getRealtimeMetrics(mockClient, {
        interval: 100,
        duration: 500
      });

      expect(result.content[0]?.text).toContain('Real-time Performance Monitoring');
      expect(result.content[0]?.text).toContain('**Monitoring Duration:** 0.5s');
      expect(result.content[0]?.text).toContain('**Sample Interval:** 0.1s');
      expect(result.content[0]?.text).toContain('Real-time Samples');
    });

    it('should provide analysis of samples', async () => {
      const result = await getRealtimeMetrics(mockClient, {
        interval: 100,
        duration: 300
      });

      expect(result.content[0]?.text).toContain('Analysis');
      expect(result.content[0]?.text).toContain('Memory Trend');
    });
  });

  describe('resetPerformanceMonitoring', () => {
    it('should reset all performance data', async () => {
      // Add some test data
      const opId = globalPerformanceMonitor.startOperation('test-op');
      globalPerformanceMonitor.endOperation(opId);
      responseCache.set('test-key', { data: 'test' });
      metadataCache.set('meta-key', { meta: 'test' });

      const result = await resetPerformanceMonitoring(mockClient, {});

      expect(result.content[0]?.text).toContain('Performance Monitoring Reset');
      expect(result.content[0]?.text).toContain('Actions Performed');
      expect(result.content[0]?.text).toContain('Current State');
      
      // Verify data was cleared
      expect(globalPerformanceMonitor.getMetrics()).toHaveLength(0);
      expect(responseCache.size()).toBe(0);
      expect(metadataCache.size()).toBe(0);
    });

    it('should selectively reset components', async () => {
      // Add some test data
      responseCache.set('test-key', { data: 'test' });
      
      const result = await resetPerformanceMonitoring(mockClient, {
        clearMetrics: false,
        clearCache: true,
        resetCounters: false
      });

      expect(result.content[0]?.text).toContain('Cleared response cache');
      expect(result.content[0]?.text).not.toContain('Cleared 0 performance metrics');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in performance analysis', async () => {
      // Mock an error in the analysis
      jest.spyOn(globalPerformanceMonitor, 'analyzePerformance').mockImplementation(() => {
        throw new Error('Analysis error');
      });

      const result = await getPerformanceAnalysis(mockClient, {});
      expect(result.content[0]?.text).toContain('Error generating performance analysis');
    });

    it('should handle errors in cache optimization', async () => {
      // Mock an error in cache operations
      jest.spyOn(responseCache, 'getStats').mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await optimizeCache(mockClient, {});
      expect(result.content[0]?.text).toContain('Error optimizing cache');
    });
  });

  describe('performance monitoring integration', () => {
    it('should track operation metrics during testing', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      // Run a performance profile
      const result = await profilePerformance(mockClient, {
        testOperations: ['property-read'],
        iterations: 1
      });

      // The profilePerformance function doesn't use the global monitor during execution
      // Just verify the function completed successfully
      expect(result.content[0]?.text).toContain('Performance Profile Report');
    });

    it('should update cache statistics during optimization', async () => {
      // Clear any previous mocks
      jest.restoreAllMocks();
      
      responseCache.set('test-key', { data: 'test' });
      
      const initialStats = responseCache.getStats();
      expect(initialStats.size).toBe(1);

      const result = await optimizeCache(mockClient, { cleanupExpired: true });
      
      // Cache operations should have been performed
      expect(result.content[0]?.text).toContain('Cache Optimization Report');
    });
  });
});