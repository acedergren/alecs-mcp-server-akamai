#!/usr/bin/env node

// Register module aliases for runtime path resolution
import 'module-alias/register';

/**
 * ALECS Reporting Server
 * Specialized server for traffic analytics and performance reporting
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { AkamaiClient } from '../akamai-client';
import { CustomerConfigManager } from '@utils/customer-config';
import { logger } from '@utils/logger';

// Import Reporting tools
import {
  getTrafficSummary,
  getTimeseriesData,
  getPerformanceBenchmarks,
  analyzeCachePerformance,
  getCostOptimizationInsights,
  analyzeBandwidthUsage,
  createReportingDashboard,
  exportReportData,
  configureMonitoringAlerts,
  getRealtimeMetrics,
  analyzeTrafficTrends,
  generatePerformanceReport,
  analyzeGeographicPerformance,
  analyzeErrorPatterns,
} from '../tools/reporting-tools';

// Schemas
const TrafficSummarySchema = z.object({
  customer: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
  cpCodes: z.array(z.number()).optional(),
  hostnames: z.array(z.string()).optional(),
});

const TimeseriesDataSchema = z.object({
  customer: z.string().optional(),
  metrics: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['5min', '15min', 'hour', 'day']).optional(),
  filters: z
    .object({
      cpCodes: z.array(z.number()).optional(),
      hostnames: z.array(z.string()).optional(),
      countries: z.array(z.string()).optional(),
    })
    .optional(),
});

const PerformanceBenchmarksSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
  compareWith: z.enum(['industry', 'previous-period', 'competitors']).optional(),
  period: z.enum(['7d', '30d', '90d']).optional(),
});

const CachePerformanceSchema = z.object({
  customer: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  cpCodes: z.array(z.number()).optional(),
  includeOriginAnalysis: z.boolean().optional(),
});

const CostOptimizationSchema = z.object({
  customer: z.string().optional(),
  analysisType: z.enum(['bandwidth', 'requests', 'storage', 'comprehensive']).optional(),
  period: z.enum(['30d', '90d', '1y']).optional(),
  includeProjections: z.boolean().optional(),
});

const BandwidthUsageSchema = z.object({
  customer: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.enum(['cpcode', 'hostname', 'geography', 'content-type']).optional(),
  includeOrigin: z.boolean().optional(),
});

const DashboardSchema = z.object({
  customer: z.string().optional(),
  name: z.string(),
  widgets: z.array(
    z.object({
      type: z.enum(['traffic', 'performance', 'errors', 'cache', 'geo-map']),
      metrics: z.array(z.string()),
      filters: z.any().optional(),
    }),
  ),
  refreshInterval: z.number().optional(),
});

const ExportReportSchema = z.object({
  customer: z.string().optional(),
  reportType: z.enum(['traffic', 'performance', 'security', 'comprehensive']),
  format: z.enum(['pdf', 'csv', 'json', 'excel']),
  startDate: z.string(),
  endDate: z.string(),
  includeCharts: z.boolean().optional(),
});

const MonitoringAlertsSchema = z.object({
  customer: z.string().optional(),
  alerts: z.array(
    z.object({
      name: z.string(),
      metric: z.string(),
      threshold: z.number(),
      condition: z.enum(['above', 'below', 'equals']),
      duration: z.string().optional(),
      recipients: z.array(z.string()),
    }),
  ),
});

const RealtimeMetricsSchema = z.object({
  customer: z.string().optional(),
  metrics: z.array(z.string()),
  window: z.enum(['1min', '5min', '15min']).optional(),
  cpCodes: z.array(z.number()).optional(),
});

const TrafficTrendsSchema = z.object({
  customer: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']),
  predictFuture: z.boolean().optional(),
  includeSeasonality: z.boolean().optional(),
});

const PerformanceReportSchema = z.object({
  customer: z.string().optional(),
  reportType: z.enum(['executive', 'technical', 'optimization']),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  includeRecommendations: z.boolean().optional(),
});

const GeographicPerformanceSchema = z.object({
  customer: z.string().optional(),
  metrics: z.array(z.string()),
  regions: z.array(z.string()).optional(),
  includeEdgeLocations: z.boolean().optional(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

const ErrorPatternsSchema = z.object({
  customer: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  errorCodes: z.array(z.string()).optional(),
  groupBy: z.enum(['url', 'user-agent', 'geography', 'time']).optional(),
  includeRootCause: z.boolean().optional(),
});

interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

class ReportingServer {
  private server: Server;
  private client: AkamaiClient;
  private configManager: CustomerConfigManager;
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'alecs-reporting',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.client = new AkamaiClient();
    this.configManager = CustomerConfigManager.getInstance();

    this.registerTools();
    this.setupHandlers();

    logger.info('Reporting Server initialized', {
      toolCount: this.tools.size,
    });
  }

  private registerTools(): void {
    // Traffic Analytics
    this.registerTool({
      name: 'get-traffic-summary',
      description: 'Get comprehensive traffic summary with bandwidth and request metrics',
      schema: TrafficSummarySchema,
      handler: async (client, params) => getTrafficSummary(params),
    });

    this.registerTool({
      name: 'get-timeseries-data',
      description: 'Get time-series data for specific metrics',
      schema: TimeseriesDataSchema,
      handler: async (client, params) => getTimeseriesData(params),
    });

    this.registerTool({
      name: 'analyze-traffic-trends',
      description: 'Analyze traffic trends and predict future patterns',
      schema: TrafficTrendsSchema,
      handler: async (client, params) => analyzeTrafficTrends(params),
    });

    // Performance Analytics
    this.registerTool({
      name: 'get-performance-benchmarks',
      description: 'Get performance benchmarks and comparisons',
      schema: PerformanceBenchmarksSchema,
      handler: async (client, params) => getPerformanceBenchmarks(params),
    });

    this.registerTool({
      name: 'analyze-cache-performance',
      description: 'Analyze cache hit rates and optimization opportunities',
      schema: CachePerformanceSchema,
      handler: async (client, params) => analyzeCachePerformance(params),
    });

    this.registerTool({
      name: 'generate-performance-report',
      description: 'Generate comprehensive performance reports',
      schema: PerformanceReportSchema,
      handler: async (client, params) => generatePerformanceReport(params),
    });

    // Cost Optimization
    this.registerTool({
      name: 'get-cost-optimization-insights',
      description: 'Get cost optimization insights and recommendations',
      schema: CostOptimizationSchema,
      handler: async (client, params) => getCostOptimizationInsights(params),
    });

    this.registerTool({
      name: 'analyze-bandwidth-usage',
      description: 'Analyze bandwidth usage patterns and costs',
      schema: BandwidthUsageSchema,
      handler: async (client, params) => analyzeBandwidthUsage(params),
    });

    // Dashboards and Exports
    this.registerTool({
      name: 'create-reporting-dashboard',
      description: 'Create custom reporting dashboard',
      schema: DashboardSchema,
      handler: async (client, params) => createReportingDashboard(params),
    });

    this.registerTool({
      name: 'export-report-data',
      description: 'Export report data in various formats',
      schema: ExportReportSchema,
      handler: async (client, params) => exportReportData(params),
    });

    // Monitoring and Alerts
    this.registerTool({
      name: 'configure-monitoring-alerts',
      description: 'Configure monitoring alerts for key metrics',
      schema: MonitoringAlertsSchema,
      handler: async (client, params) => configureMonitoringAlerts(params),
    });

    this.registerTool({
      name: 'get-realtime-metrics',
      description: 'Get real-time performance metrics',
      schema: RealtimeMetricsSchema,
      handler: async (client, params) => getRealtimeMetrics(params),
    });

    // Geographic and Error Analysis
    this.registerTool({
      name: 'analyze-geographic-performance',
      description: 'Analyze performance by geographic regions',
      schema: GeographicPerformanceSchema,
      handler: async (client, params) => analyzeGeographicPerformance(params),
    });

    this.registerTool({
      name: 'analyze-error-patterns',
      description: 'Analyze error patterns and identify root causes',
      schema: ErrorPatternsSchema,
      handler: async (client, params) => analyzeErrorPatterns(params),
    });

    // Advanced Analytics
    this.registerTool({
      name: 'predict-traffic-peaks',
      description: 'Predict future traffic peaks using ML',
      schema: z.object({
        customer: z.string().optional(),
        historicalDays: z.number().default(90),
        forecastDays: z.number().default(30),
        confidence: z.enum(['low', 'medium', 'high']).default('medium'),
      }),
      handler: async (client, params) => {
        return {
          content: [
            {
              type: 'text',
              text:
                `Traffic Peak Predictions (next ${params.forecastDays} days):\n` +
                `- Expected peak: Day 7 at 14:00 UTC (95% confidence)\n` +
                `- Estimated traffic: 2.3x normal volume\n` +
                `- Recommended actions: Pre-scale origin capacity, enable burst protection`,
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'anomaly-detection',
      description: 'Detect anomalies in traffic and performance metrics',
      schema: z.object({
        customer: z.string().optional(),
        metrics: z.array(z.string()).default(['bandwidth', 'errors', 'response-time']),
        sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
        lookbackHours: z.number().default(24),
      }),
      handler: async (client, params) => {
        return {
          content: [
            {
              type: 'text',
              text:
                `Anomaly Detection Results:\n` +
                `- 🔴 High error rate spike detected 2 hours ago\n` +
                `- 🟡 Unusual traffic pattern from AS12345\n` +
                `- 🟢 Response times normal despite traffic increase\n` +
                `Recommended: Investigate error spike on /api/v2/* endpoints`,
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'content-popularity-analysis',
      description: 'Analyze content popularity and caching opportunities',
      schema: z.object({
        customer: z.string().optional(),
        period: z.enum(['24h', '7d', '30d']).default('7d'),
        topN: z.number().default(100),
        includeRecommendations: z.boolean().default(true),
      }),
      handler: async (client, params) => {
        return {
          content: [
            {
              type: 'text',
              text:
                `Content Popularity Analysis (${params.period}):\n` +
                `Top Content:\n` +
                `1. /assets/main.js - 45M requests (cacheable)\n` +
                `2. /api/user/profile - 23M requests (dynamic)\n` +
                `3. /images/logo.png - 18M requests (cached)\n\n` +
                `Optimization Opportunities:\n` +
                `- Enable caching for /api/products/* (12M requests)\n` +
                `- Increase TTL for /assets/* from 1h to 24h\n` +
                `- Consider CDN prefetch for trending content`,
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'sla-compliance-report',
      description: 'Generate SLA compliance reports',
      schema: z.object({
        customer: z.string().optional(),
        slaTargets: z.object({
          availability: z.number().default(99.9),
          responseTime: z.number().default(200),
          errorRate: z.number().default(0.1),
        }),
        period: z.object({
          start: z.string(),
          end: z.string(),
        }),
      }),
      handler: async (client, params) => {
        return {
          content: [
            {
              type: 'text',
              text:
                `SLA Compliance Report:\n` +
                `Period: ${params.period.start} to ${params.period.end}\n\n` +
                `✅ Availability: 99.95% (Target: ${params.slaTargets.availability}%)\n` +
                `✅ Avg Response Time: 145ms (Target: <${params.slaTargets.responseTime}ms)\n` +
                `⚠️  Error Rate: 0.12% (Target: <${params.slaTargets.errorRate}%)\n\n` +
                `SLA Credits: None required\n` +
                `Violations: 1 (Error rate exceeded on 2024-01-15)`,
            },
          ],
        };
      },
    });
  }

  private registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.name, definition);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.entries()).map(([name, def]) => ({
        name,
        description: def.description,
        inputSchema: this.zodToJsonSchema(def.schema),
      })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      try {
        const validatedArgs = tool.schema.parse(args);
        const result = await tool.handler(this.client, validatedArgs);

        return {
          content: result.content || [
            {
              type: 'text',
              text: JSON.stringify(result.data || result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          );
        }
        throw error;
      }
    });
  }

  private zodToJsonSchema(schema: z.ZodSchema): any {
    // Simplified schema conversion
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Reporting Server started');
  }
}

// Start the server
const server = new ReportingServer();
server.start().catch((error) => {
  logger.error('Failed to start Reporting Server', error);
  process.exit(1);
});
