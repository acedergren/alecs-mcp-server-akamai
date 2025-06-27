/**
 * @fileoverview Type definitions for Akamai Reporting API
 * @module types/reporting
 * 
 * CODE KAI STANDARDS: A+ TypeScript with full type safety
 */

import { z } from 'zod';

// Zod Schemas for Runtime Validation
export const ReportingPeriodSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
  granularity: z.enum(['hour', 'day', 'week', 'month']),
});

export const ReportingFilterSchema = z.object({
  cpCodes: z.array(z.number()).optional(),
  hostnames: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  httpStatus: z.array(z.string()).optional(),
  cacheStatus: z.array(z.string()).optional(),
});

export const ReportingMetricSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  dimensions: z.record(z.string()).optional(),
});

export const TrafficSummarySchema = z.object({
  bandwidth: z.number(),
  requests: z.number(),
  cacheHitRatio: z.number(),
  errorRate: z.number(),
  responseTime: z.number(),
  origin: z.object({
    bandwidth: z.number(),
    requests: z.number(),
    responseTime: z.number(),
  }),
});

export const PerformanceBenchmarkSchema = z.object({
  metric: z.string(),
  current: z.number(),
  benchmark: z.number(),
  percentile: z.number(),
  trend: z.enum(['improving', 'stable', 'degrading']),
  recommendation: z.string().optional(),
});

export const CostOptimizationInsightSchema = z.object({
  type: z.enum(['bandwidth', 'requests', 'cache_efficiency', 'origin_offload']),
  title: z.string(),
  description: z.string(),
  potentialSavings: z.number(),
  recommendation: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['easy', 'moderate', 'complex']),
});

// TypeScript Types (derived from Zod schemas)
export type ReportingPeriod = z.infer<typeof ReportingPeriodSchema>;
export type ReportingFilter = z.infer<typeof ReportingFilterSchema>;
export type ReportingMetric = z.infer<typeof ReportingMetricSchema>;
export type TrafficSummary = z.infer<typeof TrafficSummarySchema>;
export type PerformanceBenchmark = z.infer<typeof PerformanceBenchmarkSchema>;
export type CostOptimizationInsight = z.infer<typeof CostOptimizationInsightSchema>;

// Additional types for reporting tools
export interface CachePerformanceAnalysis {
  summary: {
    averageHitRatio: number;
    averageMissRatio: number;
    totalCacheableResponses: number;
    cacheEfficiency: 'Optimal' | 'Good' | 'Needs Improvement';
  };
  recommendations: Array<{
    issue: string;
    impact: string;
    suggestion: string;
  }>;
  timeSeriesData: {
    hitRatio: ReportingMetric[];
    missRatio: ReportingMetric[];
  };
}

export interface BandwidthAnalysis {
  summary: {
    totalBandwidth: number;
    edgeBandwidth: number;
    originBandwidth: number;
    originOffloadPercentage: number;
    estimatedCost: number;
  };
  breakdown: {
    byTime: ReportingMetric[];
    peak: number;
    average: number;
  };
  optimization: {
    potentialSavings: number;
    recommendations: string[];
  };
}

export interface RealtimeMetrics {
  metrics: Record<string, {
    current: number;
    timestamp: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  refreshInterval: number;
  lastUpdated: string;
}

export interface TrafficTrend {
  current: number;
  average: number;
  peak: number;
  minimum: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
  volatility: number;
  prediction?: {
    nextHour: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface PerformanceReport {
  metadata: {
    generatedAt: string;
    period: ReportingPeriod;
    customer: string;
  };
  summary: {
    traffic: TrafficSummary;
    performance: {
      averageResponseTime: number;
      cacheHitRatio: number;
      errorRate: number;
      originOffload: number;
    };
  };
  benchmarks: PerformanceBenchmark[];
  scorecard: {
    overall: string;
    categories: {
      speed: 'A' | 'B' | 'C' | 'D' | 'F';
      caching: 'A' | 'B' | 'C' | 'D' | 'F';
      reliability: 'A' | 'B' | 'C' | 'D' | 'F';
    };
  };
  recommendations?: Array<{
    area: string;
    priority: string;
    suggestion: string;
  }>;
}

export interface GeographicPerformance {
  metrics: Record<string, {
    average: number;
    peak: number;
    total: number;
  }>;
  performance: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
}

export interface ErrorPattern {
  summary: {
    totalErrors: number;
    errorRate: number;
    mostCommonType: string;
  };
  patterns: {
    byType: Record<string, {
      total: number;
      average: number;
      peak: number;
      timeSeries: ReportingMetric[];
    }>;
    trends: Record<string, 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'>;
    hotspots: Array<{
      type: string;
      severity: string;
      peakToAverageRatio: number;
    }>;
  };
  recommendations?: Array<{
    type: string;
    priority: string;
    suggestion: string;
  }>;
}

// Input filter type that matches what comes from MCP tools
export interface ReportingFilterInput {
  cpCodes?: number[] | undefined;
  hostnames?: string[] | undefined;
  countries?: string[] | undefined;
  regions?: string[] | undefined;
  userAgents?: string[] | undefined;
  httpStatus?: string[] | undefined;
  cacheStatus?: string[] | undefined;
}

// Tool argument types
export interface GetTrafficSummaryArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
}

export interface GetTimeseriesDataArgs {
  customer?: string;
  metrics: string[];
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
}

export interface AnalyzeCachePerformanceArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
}

export interface AnalyzeBandwidthUsageArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
  groupBy?: 'cpcode' | 'hostname' | 'geography' | 'content-type';
}

export interface GetRealtimeMetricsArgs {
  customer?: string;
  metrics?: string[];
  refreshInterval?: number;
}

export interface AnalyzeTrafficTrendsArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
  includePredictions?: boolean;
}

export interface GeneratePerformanceReportArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
  includeRecommendations?: boolean;
}

export interface AnalyzeGeographicPerformanceArgs {
  customer?: string;
  period: ReportingPeriod;
  regions?: string[];
  metrics?: string[];
}

export interface AnalyzeErrorPatternsArgs {
  customer?: string;
  period: ReportingPeriod;
  filter?: ReportingFilterInput;
  errorTypes?: string[];
  includeRecommendations?: boolean;
}