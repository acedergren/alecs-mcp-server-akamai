/**
 * Reporting Tools Module Exports
 * 
 * Provides unified access to all reporting and analytics functionality
 */

import { consolidatedReportingTools } from './consolidated-reporting-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Reporting tool definitions for ALECSCore registration
 */
export const reportingTools = {
  'reporting_traffic': {
    description: 'Get traffic analytics report',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).optional(),
      metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth'])).optional(),
      groupBy: z.array(z.enum(['cpcode', 'hostname', 'status_code'])).optional(),
      filters: z.object({
        hostname: z.string().optional(),
        cpcode: z.string().optional(),
        status_code_class: z.enum(['2xx', '3xx', '4xx', '5xx']).optional()
      }).optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getTrafficReport(args)
  },

  'reporting_cache': {
    description: 'Get cache performance metrics',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      metrics: z.array(z.enum(['cache_hit_rate', 'cache_miss_rate', 'bandwidth_savings', 'origin_offload'])).optional(),
      groupBy: z.array(z.enum(['cpcode', 'hostname', 'cache_state'])).optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getCachePerformance(args)
  },

  'reporting_geographic': {
    description: 'Get geographic distribution of traffic',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      metrics: z.array(z.enum(['requests', 'bandwidth', 'unique_visitors'])).optional(),
      groupBy: z.array(z.enum(['country', 'region', 'city'])).optional(),
      limit: z.number().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getGeographicDistribution(args)
  },

  'reporting_errors': {
    description: 'Analyze error patterns and rates',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      error_types: z.array(z.enum(['4xx', '5xx', 'origin_timeout', 'edge_timeout', 'ssl_error'])).optional(),
      groupBy: z.array(z.enum(['error_code', 'hostname', 'path', 'user_agent'])).optional(),
      threshold: z.number().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getErrorAnalysis(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  getTrafficReport,
  getCachePerformance,
  getGeographicDistribution,
  getErrorAnalysis
} = consolidatedReportingTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedReportingTools };
export { ConsolidatedReportingTools } from './consolidated-reporting-tools';