/**
 * @fileoverview Unit tests for Akamai Reporting Tools
 * @module tests/unit/reporting-tools
 * 
 * CODE KAI STANDARDS: A+ Testing with full coverage
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  handleGetTrafficSummary,
  analyzeCachePerformance,
  getRealtimeMetrics,
  analyzeTrafficTrends,
  generatePerformanceReport,
  analyzeErrorPatterns,
} from '../../src/tools/reporting-tools';
import { ReportingService } from '../../src/services/ReportingService';

// Mock the ReportingService
jest.mock('../../src/services/ReportingService');
jest.mock('../../src/utils/logger');

describe('Reporting Tools', () => {
  let mockReportingService: jest.Mocked<ReportingService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ReportingService methods
    mockReportingService = {
      getTrafficSummary: jest.fn(),
      getTimeSeriesData: jest.fn(),
      getPerformanceBenchmarks: jest.fn(),
      getCostOptimizationInsights: jest.fn(),
      buildReportingParams: jest.fn(),
      fetchMetric: jest.fn(),
      aggregateMetric: jest.fn(),
    } as any;
    
    // Mock the constructor
    (ReportingService as jest.MockedClass<typeof ReportingService>).mockImplementation(() => mockReportingService);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleGetTrafficSummary', () => {
    it('should retrieve traffic summary successfully', async () => {
      const mockTrafficData = {
        bandwidth: 1000000,
        requests: 500000,
        cacheHitRatio: 85.5,
        errorRate: 0.5,
        responseTime: 120,
        origin: {
          bandwidth: 150000,
          requests: 75000,
          responseTime: 250,
        },
      };
      
      mockReportingService.getTrafficSummary.mockResolvedValue(mockTrafficData);
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'hour' as const,
        },
      };
      
      const result = await handleGetTrafficSummary(args);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrafficData);
      expect(result.message).toBe('Traffic summary retrieved successfully');
      expect(mockReportingService.getTrafficSummary).toHaveBeenCalledWith(args.period, undefined);
    });
    
    it('should handle errors gracefully', async () => {
      mockReportingService.getTrafficSummary.mockRejectedValue(new Error('API Error'));
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'hour' as const,
        },
      };
      
      const result = await handleGetTrafficSummary(args);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.details).toBe('Failed to retrieve traffic summary');
    });
  });

  describe('analyzeCachePerformance', () => {
    it('should analyze cache performance with recommendations', async () => {
      mockReportingService.buildReportingParams.mockReturnValue({ 
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z',
        granularity: 'hour',
      });
      
      mockReportingService.fetchMetric
        .mockResolvedValueOnce([{ timestamp: '2024-01-01T00:00:00Z', value: 75 }]) // cache-hit-ratio
        .mockResolvedValueOnce([{ timestamp: '2024-01-01T00:00:00Z', value: 25 }]) // cache-miss-ratio
        .mockResolvedValueOnce([{ timestamp: '2024-01-01T00:00:00Z', value: 100000 }]); // cacheable-responses
      
      mockReportingService.aggregateMetric
        .mockReturnValueOnce(75) // avgHitRatio
        .mockReturnValueOnce(25) // avgMissRatio
        .mockReturnValueOnce(100000); // totalCacheable
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'hour' as const,
        },
      };
      
      const result = await analyzeCachePerformance(args);
      
      expect(result.success).toBe(true);
      expect(result.data?.summary.averageHitRatio).toBe(75);
      expect(result.data?.summary.cacheEfficiency).toBe('Good');
      expect(result.data?.recommendations).toHaveLength(1);
      expect(result.data?.recommendations).toHaveLength(1);
      expect(result.data?.recommendations?.[0]?.issue).toBe('Low cache hit ratio');
    });
  });

  describe('getRealtimeMetrics', () => {
    it('should retrieve real-time metrics', async () => {
      const mockMetricData = [
        { timestamp: '2024-01-01T12:55:00Z', value: 1000 },
      ];
      
      mockReportingService.buildReportingParams.mockReturnValue({ 
        start: expect.any(String),
        end: expect.any(String),
        granularity: 'hour',
      });
      
      mockReportingService.fetchMetric.mockResolvedValue(mockMetricData);
      
      const args = {
        metrics: ['bandwidth', 'requests'],
        refreshInterval: 60,
      };
      
      const result = await getRealtimeMetrics(args);
      
      expect(result.success).toBe(true);
      expect(result.data?.metrics).toHaveProperty('bandwidth');
      expect(result.data?.metrics).toHaveProperty('requests');
      expect(result.data?.refreshInterval).toBe(60);
    });
  });

  describe('analyzeTrafficTrends', () => {
    it('should analyze traffic trends with predictions', async () => {
      const mockTimeSeriesData = {
        bandwidth: Array(10).fill(null).map((_, i) => ({
          timestamp: `2024-01-01T${i}:00:00Z`,
          value: 1000 + i * 100,
        })),
        requests: Array(10).fill(null).map((_, i) => ({
          timestamp: `2024-01-01T${i}:00:00Z`,
          value: 500 + i * 50,
        })),
        'cache-hit-ratio': Array(10).fill(null).map(() => ({
          timestamp: '2024-01-01T00:00:00Z',
          value: 85,
        })),
      };
      
      mockReportingService.getTimeSeriesData.mockResolvedValue(mockTimeSeriesData);
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T09:59:59Z',
          granularity: 'hour' as const,
        },
        includePredictions: true,
      };
      
      const result = await analyzeTrafficTrends(args);
      
      expect(result.success).toBe(true);
      expect(result.data?.trends).toHaveProperty('bandwidth');
      expect(result.data?.trends.bandwidth).toHaveProperty('trend');
      expect(result.data?.trends.bandwidth).toHaveProperty('prediction');
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      const mockTrafficSummary = {
        bandwidth: 1000000,
        requests: 500000,
        cacheHitRatio: 92,
        errorRate: 0.1,
        responseTime: 95,
        origin: {
          bandwidth: 80000,
          requests: 40000,
          responseTime: 150,
        },
      };
      
      const mockBenchmarks: any[] = [];
      // The benchmark structure in the actual service may differ
      
      mockReportingService.getTrafficSummary.mockResolvedValue(mockTrafficSummary);
      mockReportingService.getPerformanceBenchmarks.mockResolvedValue(mockBenchmarks);
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'day' as const,
        },
        includeRecommendations: true,
      };
      
      const result = await generatePerformanceReport(args);
      
      expect(result.success).toBe(true);
      expect(result.data?.scorecard.overall).toBe('Excellent');
      expect(result.data?.scorecard.categories.speed).toBe('A');
      expect(result.data?.scorecard.categories.caching).toBe('A');
      expect(result.data?.scorecard.categories.reliability).toBe('A');
      expect(result.data?.recommendations).toBeDefined();
    });
  });

  describe('analyzeErrorPatterns', () => {
    it('should analyze error patterns and identify trends', async () => {
      mockReportingService.buildReportingParams.mockReturnValue({ 
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T23:59:59Z',
        granularity: 'hour',
      });
      
      const mockErrorData = Array(10).fill(null).map((_, i) => ({
        timestamp: `2024-01-01T${i}:00:00Z`,
        value: i < 5 ? 10 : 20, // Increasing trend
      }));
      
      mockReportingService.fetchMetric
        .mockResolvedValueOnce(mockErrorData) // 4xx errors
        .mockResolvedValueOnce(mockErrorData); // 5xx errors
      
      mockReportingService.aggregateMetric
        .mockReturnValueOnce(150) // total
        .mockReturnValueOnce(15) // average
        .mockReturnValueOnce(20) // peak
        .mockReturnValueOnce(150) // total
        .mockReturnValueOnce(15) // average
        .mockReturnValueOnce(20); // peak
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'hour' as const,
        },
        errorTypes: ['4xx', '5xx'],
        includeRecommendations: true,
      };
      
      const result = await analyzeErrorPatterns(args);
      
      expect(result.success).toBe(true);
      expect(result.data?.patterns.trends['4xx']).toBe('increasing');
      expect(result.data?.patterns.trends['5xx']).toBe('increasing');
      expect(result.data?.recommendations).toBeDefined();
      expect(result.data?.recommendations?.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should handle missing required parameters', async () => {
      const result = await handleGetTrafficSummary({} as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('should use default values for optional parameters', async () => {
      mockReportingService.buildReportingParams.mockReturnValue({});
      mockReportingService.fetchMetric.mockResolvedValue([]);
      mockReportingService.aggregateMetric.mockReturnValue(0);
      
      const args = {
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          granularity: 'hour' as const,
        },
      };
      
      const result = await analyzeCachePerformance(args);
      
      expect(result.success).toBe(true);
      expect(ReportingService).toHaveBeenCalledWith('default');
    });
  });
});