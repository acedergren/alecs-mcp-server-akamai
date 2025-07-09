/**
 * Consolidated Reporting Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates all reporting and analytics tools
 * - Provides type-safe reporting API interactions
 * - Implements proper multi-tenant support
 * - Eliminates 'unknown' type errors through schemas
 * 
 * This module handles traffic analytics, cache performance,
 * geographic distribution, and error analysis.
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  type MCPToolResponse
} from '../common';

/**
 * Reporting-specific schemas
 */
const GranularitySchema = z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']);

const TrafficReportSchema = CustomerSchema.extend({
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
  granularity: GranularitySchema.default('DAY'),
  metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth']))
    .default(['edge_hits', 'edge_bandwidth']),
  cp_codes: z.array(z.string()).optional(),
  hostnames: z.array(z.string()).optional(),
  group_by: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional()
});

const CachePerformanceSchema = CustomerSchema.extend({
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
  granularity: GranularitySchema.default('DAY'),
  cp_codes: z.array(z.string()).optional(),
  group_by: z.enum(['cpcode', 'hostname', 'cache_status']).optional(),
  include_offload: z.boolean().default(true),
  include_ttl_analysis: z.boolean().default(false)
});

const GeographicDistributionSchema = CustomerSchema.extend({
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
  granularity: GranularitySchema.default('DAY'),
  level: z.enum(['country', 'region', 'city']).default('country'),
  metrics: z.array(z.enum(['hits', 'bandwidth', 'unique_visitors']))
    .default(['hits', 'bandwidth']),
  top_n: z.number().default(20)
});

const ErrorAnalysisSchema = CustomerSchema.extend({
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
  granularity: GranularitySchema.default('DAY'),
  error_codes: z.array(z.string()).optional(),
  group_by: z.enum(['error_code', 'hostname', 'url_path']).optional(),
  include_details: z.boolean().default(false)
});

/**
 * Reporting response schemas
 */
const MetricDataPointSchema = z.object({
  timestamp: z.string(),
  value: z.number()
});

const TrafficMetricsSchema = z.object({
  edge_hits: z.array(MetricDataPointSchema).optional(),
  edge_bandwidth: z.array(MetricDataPointSchema).optional(),
  origin_hits: z.array(MetricDataPointSchema).optional(),
  origin_bandwidth: z.array(MetricDataPointSchema).optional()
});

const CacheMetricsSchema = z.object({
  hit_rate: z.number(),
  offload_rate: z.number(),
  cache_hits: z.number(),
  cache_misses: z.number(),
  total_requests: z.number()
});

/**
 * Consolidated reporting tools implementation
 */
export class ConsolidatedReportingTools extends BaseTool {
  protected readonly domain = 'reporting';

  /**
   * Get comprehensive traffic analytics
   */
  async getTrafficReport(args: z.infer<typeof TrafficReportSchema>): Promise<MCPToolResponse> {
    const params = TrafficReportSchema.parse(args);

    return this.executeStandardOperation(
      'get-traffic-report',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/reporting-api/v1/reports/traffic/edge-metrics',
            method: 'GET',
            schema: z.object({
              data: z.array(z.object({
                cpcode: z.string().optional(),
                hostname: z.string().optional(),
                metrics: TrafficMetricsSchema
              })),
              summary: z.object({
                total_edge_hits: z.number(),
                total_edge_bandwidth: z.number(),
                total_origin_hits: z.number(),
                total_origin_bandwidth: z.number(),
                avg_offload_rate: z.number()
              })
            }),
            queryParams: {
              start: params.start_date,
              end: params.end_date,
              interval: params.granularity,
              metrics: params.metrics.join(','),
              ...(params.cp_codes && { cpcodes: params.cp_codes.join(',') }),
              ...(params.hostnames && { hostnames: params.hostnames.join(',') }),
              ...(params.group_by && { groupBy: params.group_by })
            }
          }
        );

        // Format the response data
        const formattedData = response.data.map(item => ({
          identifier: item.cpcode || item.hostname || 'aggregate',
          metrics: params.metrics.map(metric => ({
            name: metric,
            data: item.metrics[metric] || [],
            total: item.metrics[metric]?.reduce((sum, point) => sum + point.value, 0) || 0
          }))
        }));

        return {
          dateRange: {
            start: params.start_date,
            end: params.end_date
          },
          granularity: params.granularity,
          data: formattedData,
          summary: {
            totalEdgeHits: response.summary.total_edge_hits,
            totalEdgeBandwidth: response.summary.total_edge_bandwidth,
            totalOriginHits: response.summary.total_origin_hits,
            totalOriginBandwidth: response.summary.total_origin_bandwidth,
            averageOffloadRate: response.summary.avg_offload_rate
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `traffic:${p.start_date}:${p.end_date}:${p.granularity}:${p.metrics.join(',')}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Analyze cache hit rates and offload percentages
   */
  async getCachePerformance(args: z.infer<typeof CachePerformanceSchema>): Promise<MCPToolResponse> {
    const params = CachePerformanceSchema.parse(args);

    return this.executeStandardOperation(
      'get-cache-performance',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/reporting-api/v1/reports/cache-performance',
            method: 'GET',
            schema: z.object({
              data: z.array(z.object({
                identifier: z.string(),
                metrics: CacheMetricsSchema,
                ttl_distribution: z.record(z.number()).optional()
              })),
              summary: z.object({
                overall_hit_rate: z.number(),
                overall_offload_rate: z.number(),
                total_cache_hits: z.number(),
                total_requests: z.number()
              })
            }),
            queryParams: {
              start: params.start_date,
              end: params.end_date,
              interval: params.granularity,
              ...(params.cp_codes && { cpcodes: params.cp_codes.join(',') }),
              ...(params.group_by && { groupBy: params.group_by }),
              includeOffload: params.include_offload.toString(),
              includeTTL: params.include_ttl_analysis.toString()
            }
          }
        );

        return {
          dateRange: {
            start: params.start_date,
            end: params.end_date
          },
          performance: response.data.map(item => ({
            identifier: item.identifier,
            hitRate: `${(item.metrics.hit_rate * 100).toFixed(2)}%`,
            offloadRate: `${(item.metrics.offload_rate * 100).toFixed(2)}%`,
            cacheHits: item.metrics.cache_hits,
            cacheMisses: item.metrics.cache_misses,
            totalRequests: item.metrics.total_requests,
            ...(item.ttl_distribution && { ttlDistribution: item.ttl_distribution })
          })),
          summary: {
            overallHitRate: `${(response.summary.overall_hit_rate * 100).toFixed(2)}%`,
            overallOffloadRate: `${(response.summary.overall_offload_rate * 100).toFixed(2)}%`,
            totalCacheHits: response.summary.total_cache_hits,
            totalRequests: response.summary.total_requests
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `cache:${p.start_date}:${p.end_date}:${p.granularity}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Analyze traffic distribution by geography
   */
  async getGeographicDistribution(args: z.infer<typeof GeographicDistributionSchema>): Promise<MCPToolResponse> {
    const params = GeographicDistributionSchema.parse(args);

    return this.executeStandardOperation(
      'get-geo-distribution',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/reporting-api/v1/reports/geographic-distribution',
            method: 'GET',
            schema: z.object({
              data: z.array(z.object({
                location: z.object({
                  code: z.string(),
                  name: z.string(),
                  type: z.string()
                }),
                metrics: z.record(z.number())
              })),
              total_locations: z.number()
            }),
            queryParams: {
              start: params.start_date,
              end: params.end_date,
              interval: params.granularity,
              level: params.level,
              metrics: params.metrics.join(','),
              limit: params.top_n.toString()
            }
          }
        );

        // Sort by first metric and get top N
        const sortedData = response.data
          .sort((a, b) => (b.metrics[params.metrics?.[0] || 'hits'] || 0) - (a.metrics[params.metrics?.[0] || 'hits'] || 0))
          .slice(0, params.top_n);

        return {
          dateRange: {
            start: params.start_date,
            end: params.end_date
          },
          level: params.level,
          topLocations: sortedData.map((item, index) => ({
            rank: index + 1,
            location: item.location.name,
            code: item.location.code,
            metrics: params.metrics.reduce((acc, metric) => ({
              ...acc,
              [metric]: item.metrics[metric] || 0
            }), {})
          })),
          totalLocations: response.total_locations
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `geo:${p.start_date}:${p.end_date}:${p.level}:${p.metrics.join(',')}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Analyze HTTP error codes and patterns
   */
  async getErrorAnalysis(args: z.infer<typeof ErrorAnalysisSchema>): Promise<MCPToolResponse> {
    const params = ErrorAnalysisSchema.parse(args);

    return this.executeStandardOperation(
      'get-error-analysis',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/reporting-api/v1/reports/errors',
            method: 'GET',
            schema: z.object({
              data: z.array(z.object({
                error_code: z.string(),
                count: z.number(),
                percentage: z.number(),
                trend: z.enum(['increasing', 'decreasing', 'stable']),
                samples: z.array(z.object({
                  timestamp: z.string(),
                  url: z.string(),
                  user_agent: z.string().optional(),
                  client_ip: z.string().optional()
                })).optional()
              })),
              summary: z.object({
                total_errors: z.number(),
                error_rate: z.number(),
                most_common_errors: z.array(z.string())
              })
            }),
            queryParams: {
              start: params.start_date,
              end: params.end_date,
              interval: params.granularity,
              ...(params.error_codes && { errorCodes: params.error_codes.join(',') }),
              ...(params.group_by && { groupBy: params.group_by }),
              includeDetails: params.include_details.toString()
            }
          }
        );

        return {
          dateRange: {
            start: params.start_date,
            end: params.end_date
          },
          errors: response.data.map(error => ({
            code: error.error_code,
            count: error.count,
            percentage: `${(error.percentage * 100).toFixed(2)}%`,
            trend: error.trend,
            ...(error.samples && params.include_details && {
              samples: error.samples.slice(0, 5) // Limit to 5 samples
            })
          })),
          summary: {
            totalErrors: response.summary.total_errors,
            errorRate: `${(response.summary.error_rate * 100).toFixed(2)}%`,
            mostCommonErrors: response.summary.most_common_errors
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `errors:${p.start_date}:${p.end_date}:${p.granularity}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }
}

// Export singleton instance
export const consolidatedReportingTools = new ConsolidatedReportingTools();

// Export individual functions for backwards compatibility
export const getTrafficReport = consolidatedReportingTools.getTrafficReport.bind(consolidatedReportingTools);
export const getCachePerformance = consolidatedReportingTools.getCachePerformance.bind(consolidatedReportingTools);
export const getGeographicDistribution = consolidatedReportingTools.getGeographicDistribution.bind(consolidatedReportingTools);
export const getErrorAnalysis = consolidatedReportingTools.getErrorAnalysis.bind(consolidatedReportingTools);