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
  },

  'reporting_real_time': {
    description: 'Get real-time traffic and performance metrics',
    inputSchema: z.object({
      customer: z.string().optional(),
      metrics: z.array(z.enum(['requests_per_second', 'bandwidth', 'cache_hit_rate', 'error_rate'])).optional(),
      properties: z.array(z.string()).optional(),
      duration_minutes: z.number().default(5)
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getRealTimeMetrics(args)
  },

  'reporting_cost_analysis': {
    description: 'Analyze bandwidth and request costs',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      groupBy: z.array(z.enum(['property', 'cpcode', 'region', 'product'])).optional(),
      include_projections: z.boolean().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getCostAnalysis(args)
  },

  'reporting_origin_performance': {
    description: 'Analyze origin server performance',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      origins: z.array(z.string()).optional(),
      metrics: z.array(z.enum(['response_time', 'error_rate', 'timeout_rate', 'availability'])).optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getOriginPerformance(args)
  },

  'reporting_security_threats': {
    description: 'Get security threat analysis report',
    inputSchema: z.object({
      customer: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      threat_types: z.array(z.enum(['waf_attacks', 'bot_traffic', 'ddos', 'rate_limit_violations'])).optional(),
      groupBy: z.array(z.enum(['threat_type', 'source_country', 'target_hostname'])).optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.getSecurityThreats(args)
  },

  'reporting_custom_dashboard': {
    description: 'Create custom report dashboard',
    inputSchema: z.object({
      customer: z.string().optional(),
      dashboard_name: z.string(),
      widgets: z.array(z.object({
        type: z.enum(['traffic', 'cache', 'errors', 'geographic', 'security']),
        metrics: z.array(z.string()),
        filters: z.record(z.string()).optional(),
        visualization: z.enum(['line_chart', 'bar_chart', 'pie_chart', 'table', 'heatmap']).optional()
      })),
      start_date: z.string(),
      end_date: z.string()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.createCustomDashboard(args)
  },

  'reporting_export': {
    description: 'Export report data in various formats',
    inputSchema: z.object({
      customer: z.string().optional(),
      report_type: z.enum(['traffic', 'cache', 'errors', 'geographic', 'security', 'cost']),
      start_date: z.string(),
      end_date: z.string(),
      format: z.enum(['csv', 'json', 'pdf', 'excel']),
      email_to: z.string().email().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedReportingTools.exportReport(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  getTrafficReport,
  getCachePerformance,
  getGeographicDistribution,
  getErrorAnalysis,
  getRealTimeMetrics,
  getCostAnalysis,
  getOriginPerformance,
  getSecurityThreats,
  createCustomDashboard,
  exportReport
} = consolidatedReportingTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedReportingTools };
export { ConsolidatedReportingTools } from './consolidated-reporting-tools';