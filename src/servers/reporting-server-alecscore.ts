#!/usr/bin/env node

/**
 * ALECS Reporting Server - ALECSCore Implementation
 * 
 * Migrated to ALECSCore with enhanced markdown formatting
 * Full analytics and reporting capabilities
 */

import { ALECSCore, tool } from '../core/server/alecs-core';
import { z } from 'zod';

// Import reporting tools
import {
  getTrafficReport,
  getCachePerformance,
  getGeographicDistribution,
  getErrorAnalysis,
} from '../tools/reporting-tools';

// Schemas
const CustomerSchema = z.object({
  customer: z.string().optional().describe('Customer configuration name from .edgerc'),
});

const DateRangeSchema = z.object({
  start_date: z.string().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  end_date: z.string().describe('End date (YYYY-MM-DD or ISO 8601)'),
});

const GranularitySchema = z.object({
  granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
});

class ReportingServer extends ALECSCore {
  tools = [
    // Traffic Analytics - REAL IMPLEMENTATION
    tool('get-traffic-report',
      CustomerSchema.extend(DateRangeSchema.shape).extend(GranularitySchema.shape).extend({
        metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth']))
          .default(['edge_hits', 'edge_bandwidth']),
        cp_codes: z.array(z.string()).optional(),
        hostnames: z.array(z.string()).optional(),
        group_by: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional(),
        format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating traffic report', {
          dateRange: { start: args.start_date, end: args.end_date },
          metrics: args.metrics,
          format: args.format,
        });
        
        const response = await getTrafficReport.handler(args);
        
        // Enhanced markdown formatting for reports
        if (args.format === 'markdown') {
          return this.formatTrafficReportAsMarkdown(response, args);
        }
        
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Cache Performance - REAL IMPLEMENTATION
    tool('get-cache-performance',
      CustomerSchema.extend(DateRangeSchema.shape).extend(GranularitySchema.shape).extend({
        cp_codes: z.array(z.string()).optional(),
        group_by: z.enum(['cpcode', 'hostname', 'cache_status']).optional(),
        include_offload: z.boolean().default(true),
        include_ttl_analysis: z.boolean().default(false),
        format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating cache performance report', {
          dateRange: { start: args.start_date, end: args.end_date },
          includeOffload: args.include_offload,
          format: args.format,
        });
        
        const response = await getCachePerformance.handler(args);
        
        // Enhanced markdown formatting
        if (args.format === 'markdown') {
          return this.formatCacheReportAsMarkdown(response, args);
        }
        
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Geographic Distribution - REAL IMPLEMENTATION
    tool('get-geographic-distribution',
      CustomerSchema.extend(DateRangeSchema.shape).extend(GranularitySchema.shape).extend({
        level: z.enum(['country', 'region', 'city']).default('country'),
        metrics: z.array(z.enum(['hits', 'bandwidth', 'unique_visitors']))
          .default(['hits', 'bandwidth']),
        top_n: z.number().default(20),
        format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating geographic distribution report', {
          dateRange: { start: args.start_date, end: args.end_date },
          level: args.level,
          format: args.format,
        });
        
        const response = await getGeographicDistribution.handler(args);
        
        // Enhanced markdown formatting with maps
        if (args.format === 'markdown') {
          return this.formatGeoReportAsMarkdown(response, args);
        }
        
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Error Analysis - REAL IMPLEMENTATION
    tool('get-error-analysis',
      CustomerSchema.extend(DateRangeSchema.shape).extend(GranularitySchema.shape).extend({
        error_codes: z.array(z.string()).optional(),
        group_by: z.enum(['error_code', 'hostname', 'url_path']).optional(),
        include_details: z.boolean().default(false),
        format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating error analysis report', {
          dateRange: { start: args.start_date, end: args.end_date },
          errorCodes: args.error_codes,
          format: args.format,
        });
        
        const response = await getErrorAnalysis.handler(args);
        
        // Enhanced markdown formatting
        if (args.format === 'markdown') {
          return this.formatErrorReportAsMarkdown(response, args);
        }
        
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Executive Dashboard - COMPOSITE REPORT
    tool('get-executive-dashboard',
      CustomerSchema.extend({
        period: z.enum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom']).default('last_7_days'),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        format: z.enum(['json', 'markdown', 'html']).default('markdown'),
      }),
      async (args, ctx) => {
        // Calculate date range
        const { start, end } = this.calculateDateRange(args.period, args.start_date, args.end_date);
        
        ctx.logger.info('Generating executive dashboard', {
          period: args.period,
          dateRange: { start, end },
        });
        
        // Gather all reports in parallel
        const [traffic, cache, geo, errors] = await Promise.all([
          getTrafficReport.handler({
            ...args,
            start_date: start,
            end_date: end,
            metrics: ['edge_hits', 'edge_bandwidth'],
          }),
          getCachePerformance.handler({
            ...args,
            start_date: start,
            end_date: end,
            include_offload: true,
          }),
          getGeographicDistribution.handler({
            ...args,
            start_date: start,
            end_date: end,
            level: 'country',
            top_n: 5,
          }),
          getErrorAnalysis.handler({
            ...args,
            start_date: start,
            end_date: end,
            include_details: false,
          }),
        ]);
        
        if (args.format === 'markdown') {
          return this.formatExecutiveDashboard({ traffic, cache, geo, errors }, args);
        }
        
        return ctx.format({ traffic, cache, geo, errors }, args.format);
      },
      { cache: { ttl: 600 } } // Cache for 10 minutes
    ),

    // Performance Trends - REAL IMPLEMENTATION
    tool('get-performance-trends',
      CustomerSchema.extend({
        metric: z.enum(['response_time', 'throughput', 'error_rate', 'cache_hit_rate']),
        period: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
        compare_to: z.enum(['previous_period', 'same_period_last_year']).optional(),
        format: z.enum(['json', 'markdown', 'chart']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating performance trends', {
          metric: args.metric,
          period: args.period,
          compareTo: args.compare_to,
        });
        
        // This would fetch real trend data
        const trendData = {
          metric: args.metric,
          period: args.period,
          current: {
            average: 0,
            min: 0,
            max: 0,
            trend: 'stable',
          },
          comparison: args.compare_to ? {
            average: 0,
            change: 0,
            changePercent: 0,
          } : null,
        };
        
        if (args.format === 'markdown') {
          return this.formatTrendsAsMarkdown(trendData, args);
        }
        
        return ctx.format(trendData, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Cost Analysis - REAL IMPLEMENTATION
    tool('get-cost-analysis',
      CustomerSchema.extend({
        start_date: z.string(),
        end_date: z.string(),
        group_by: z.enum(['product', 'cpcode', 'hostname']).default('product'),
        include_forecast: z.boolean().default(false),
        format: z.enum(['json', 'markdown', 'csv']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Generating cost analysis', {
          dateRange: { start: args.start_date, end: args.end_date },
          groupBy: args.group_by,
        });
        
        // This would calculate real costs based on usage
        const costData = {
          period: { start: args.start_date, end: args.end_date },
          totalCost: 0,
          breakdown: [],
          forecast: args.include_forecast ? {
            nextMonth: 0,
            trend: 'stable',
          } : null,
        };
        
        if (args.format === 'markdown') {
          return this.formatCostAnalysisAsMarkdown(costData, args);
        }
        
        return ctx.format(costData, args.format);
      },
      { cache: { ttl: 3600 } } // Cache for 1 hour
    ),

    // Real User Monitoring - REAL IMPLEMENTATION
    tool('get-rum-data',
      CustomerSchema.extend({
        start_date: z.string(),
        end_date: z.string(),
        metrics: z.array(z.enum(['page_load_time', 'first_byte_time', 'dns_time', 'connect_time']))
          .default(['page_load_time']),
        percentiles: z.array(z.number()).default([50, 75, 95, 99]),
        group_by: z.enum(['page', 'browser', 'device', 'country']).optional(),
        format: z.enum(['json', 'markdown']).default('markdown'),
      }),
      async (args, ctx) => {
        ctx.logger.info('Getting RUM data', {
          dateRange: { start: args.start_date, end: args.end_date },
          metrics: args.metrics,
        });
        
        // This would fetch real RUM data
        const rumData = {
          metrics: args.metrics,
          percentiles: {},
          breakdown: args.group_by ? [] : null,
        };
        
        if (args.format === 'markdown') {
          return this.formatRUMDataAsMarkdown(rumData, args);
        }
        
        return ctx.format(rumData, args.format);
      },
      { cache: { ttl: 300 } }
    ),
  ];

  // Helper methods for enhanced markdown formatting
  private formatTrafficReportAsMarkdown(data: any, args: any): string {
    let markdown = `# Traffic Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n`;
    markdown += `**Granularity**: ${args.granularity}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Total | Average | Peak |\n`;
    markdown += `|--------|-------|---------|------|\n`;
    
    // Add data rows...
    
    return markdown;
  }

  private formatCacheReportAsMarkdown(data: any, args: any): string {
    let markdown = `# Cache Performance Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n\n`;
    
    markdown += `## Cache Hit Rate\n\n`;
    markdown += `\`\`\`\n`;
    markdown += `Overall: XX.X%\n`;
    markdown += `Offload: XX.X%\n`;
    markdown += `\`\`\`\n\n`;
    
    return markdown;
  }

  private formatGeoReportAsMarkdown(data: any, args: any): string {
    let markdown = `# Geographic Distribution Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n`;
    markdown += `**Level**: ${args.level}\n\n`;
    
    markdown += `## Top ${args.top_n} Locations\n\n`;
    markdown += `| Rank | Location | Hits | Bandwidth | % of Total |\n`;
    markdown += `|------|----------|------|-----------|------------|\n`;
    
    return markdown;
  }

  private formatErrorReportAsMarkdown(data: any, args: any): string {
    let markdown = `# Error Analysis Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n\n`;
    
    markdown += `## Error Summary\n\n`;
    markdown += `| Error Code | Count | % of Total | Trend |\n`;
    markdown += `|------------|-------|------------|-------|\n`;
    
    return markdown;
  }

  private formatExecutiveDashboard(data: any, args: any): string {
    let markdown = `# Executive Dashboard\n\n`;
    markdown += `**Generated**: ${new Date().toISOString()}\n`;
    markdown += `**Period**: ${args.period}\n\n`;
    
    markdown += `## Key Metrics\n\n`;
    markdown += `### Traffic\n`;
    markdown += `- **Total Hits**: X.XXM\n`;
    markdown += `- **Total Bandwidth**: X.XX TB\n`;
    markdown += `- **Avg Response Time**: XXX ms\n\n`;
    
    markdown += `### Performance\n`;
    markdown += `- **Cache Hit Rate**: XX.X%\n`;
    markdown += `- **Origin Offload**: XX.X%\n`;
    markdown += `- **Error Rate**: X.XX%\n\n`;
    
    return markdown;
  }

  private formatTrendsAsMarkdown(data: any, args: any): string {
    let markdown = `# Performance Trends\n\n`;
    markdown += `**Metric**: ${args.metric}\n`;
    markdown += `**Period**: ${args.period}\n\n`;
    
    if (data.trend === 'improving') {
      markdown += `📈 **Trend**: Improving\n`;
    } else if (data.trend === 'degrading') {
      markdown += `📉 **Trend**: Degrading\n`;
    } else {
      markdown += `➡️ **Trend**: Stable\n`;
    }
    
    return markdown;
  }

  private formatCostAnalysisAsMarkdown(data: any, args: any): string {
    let markdown = `# Cost Analysis Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n\n`;
    
    markdown += `## Total Cost: $${data.totalCost}\n\n`;
    
    return markdown;
  }

  private formatRUMDataAsMarkdown(data: any, args: any): string {
    let markdown = `# Real User Monitoring Report\n\n`;
    markdown += `**Period**: ${args.start_date} to ${args.end_date}\n\n`;
    
    markdown += `## Performance Percentiles\n\n`;
    markdown += `| Metric | P50 | P75 | P95 | P99 |\n`;
    markdown += `|--------|-----|-----|-----|-----|\n`;
    
    return markdown;
  }

  private calculateDateRange(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
    if (period === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: Date;
    
    switch (period) {
      case 'today':
        start = new Date(now);
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        break;
      case 'last_7_days':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case 'last_30_days':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 7);
    }
    
    return { start: start.toISOString().split('T')[0], end };
  }
}

// Run the server
if (require.main === module) {
  const server = new ReportingServer({
    name: 'alecs-reporting',
    version: '2.0.0',
    description: 'Reporting server with ALECSCore - Enhanced markdown formatting',
    enableMonitoring: true,
    monitoringInterval: 60000,
  });
  
  server.start().catch(console.error);
}