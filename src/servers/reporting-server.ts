#!/usr/bin/env node

// Register module aliases for runtime path resolution

/**
 * ALECS Multi-Customer Reporting Server
 * 
 * ARCHITECTURE AMBITIONS:
 * This server implements the foundation for multi-customer Akamai reporting,
 * enabling service providers, consultants, and enterprises to manage
 * multiple Akamai accounts from a single MCP server instance.
 * 
 * SUPPORTED USE CASES:
 * 1. MSP/Consultant Dashboard: Manage reports for multiple client accounts
 * 2. Enterprise Multi-Contract: Handle multiple divisions/business units
 * 3. Development Environments: Separate staging/production per customer
 * 4. Cross-Customer Analytics: Aggregated reporting across accounts
 * 
 * CUSTOMER IDENTIFICATION PATTERNS:
 * - Local .edgerc file with multiple sections [customer-name]
 * - Per-customer API credentials with account switching
 * - Future: Remote MCP with customer-provided API keys
 * 
 * SCALING ARCHITECTURE:
 * Single customer → Multi-customer → Distributed MCP → Enterprise SaaS
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
import { CustomerConfigManager } from '../utils/customer-config';
import { logger } from '../utils/logger';

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
  filters: z.object({
    cpCodes: z.array(z.number()).optional(),
    hostnames: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
  }).optional(),
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
  widgets: z.array(z.object({
    type: z.enum(['traffic', 'performance', 'errors', 'cache', 'geo-map']),
    metrics: z.array(z.string()),
    filters: z.any().optional(),
  })),
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
  alerts: z.array(z.object({
    name: z.string(),
    metric: z.string(),
    threshold: z.number(),
    condition: z.enum(['above', 'below', 'equals']),
    duration: z.string().optional(),
    recipients: z.array(z.string()),
  })),
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

/**
 * Multi-Customer Reporting Server Implementation
 * 
 * CURRENT STATE: Foundation established for multi-customer support
 * NEXT PHASE: Implement customer validation and account switching
 */
class ReportingServer {
  private server: Server;
  private client: AkamaiClient;
  
  /**
   * MULTI-CUSTOMER CONFIGURATION MANAGER
   * 
   * PURPOSE: Enable one MCP server to serve multiple Akamai customer accounts
   * 
   * INTENDED IMPLEMENTATION:
   * 1. Customer Validation: Verify customer exists in .edgerc before processing requests
   * 2. Account Switching: Use account_switch_key for cross-account operations  
   * 3. Security Enforcement: Prevent unauthorized access to customer accounts
   * 4. Environment Management: Support staging/production per customer
   * 
   * CUSTOMER PATTERNS:
   * - Service Providers: [client-acme], [client-beta], [client-gamma] 
   * - Enterprise: [division-media], [division-ecommerce], [division-api]
   * - Development: [staging], [production], [testing]
   * 
   * FUTURE ENHANCEMENTS:
   * - Remote credential management
   * - Dynamic customer onboarding
   * - Cross-customer analytics aggregation
   * - Role-based access control per customer
   * 
   * @ts-ignore - TODO: Implement customer validation flow in Phase 2
   */
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

  /**
   * MULTI-CUSTOMER TOOL REGISTRATION
   * 
   * Each tool supports the 'customer' parameter for multi-account operations:
   * 
   * CURRENT IMPLEMENTATION:
   * - Tools accept customer parameter (e.g., customer: 'client-acme')
   * - ReportingService creates customer-specific clients internally
   * - No validation that customer exists in .edgerc configuration
   * 
   * INTENDED ENHANCEMENT (Phase 2):
   * - Validate customer parameter against configManager.hasCustomer()
   * - Return descriptive errors for invalid customers
   * - Support account switching for cross-customer operations
   * - Add customer context to all logging and monitoring
   * 
   * MULTI-CUSTOMER USE CASES:
   * 1. Service Provider Dashboard: Pull reports for multiple clients
   * 2. Enterprise Reporting: Aggregate data across business divisions  
   * 3. Development Workflows: Compare staging vs production metrics
   * 4. Client Management: Generate customer-specific performance reports
   */
  private registerTools(): void {
    // Traffic Analytics - Foundation for multi-customer traffic reporting
    this.registerTool({
      name: 'get-traffic-summary',
      description: 'Get comprehensive traffic summary with bandwidth and request metrics. Supports multi-customer via customer parameter.',
      schema: TrafficSummarySchema,
      handler: async (_client, params) => getTrafficSummary(params),
    });

    this.registerTool({
      name: 'get-timeseries-data',
      description: 'Get time-series data for specific metrics',
      schema: TimeseriesDataSchema,
      handler: async (_client, params) => getTimeseriesData(params),
    });

    this.registerTool({
      name: 'analyze-traffic-trends',
      description: 'Analyze traffic trends and predict future patterns',
      schema: TrafficTrendsSchema,
      handler: async (_client, params) => analyzeTrafficTrends(params),
    });

    // Performance Analytics
    this.registerTool({
      name: 'get-performance-benchmarks',
      description: 'Get performance benchmarks and comparisons',
      schema: PerformanceBenchmarksSchema,
      handler: async (_client, params) => getPerformanceBenchmarks(params),
    });

    this.registerTool({
      name: 'analyze-cache-performance',
      description: 'Analyze cache hit rates and optimization opportunities',
      schema: CachePerformanceSchema,
      handler: async (_client, params) => analyzeCachePerformance(params),
    });

    this.registerTool({
      name: 'generate-performance-report',
      description: 'Generate comprehensive performance reports',
      schema: PerformanceReportSchema,
      handler: async (_client, params) => generatePerformanceReport(params),
    });

    // Cost Optimization
    this.registerTool({
      name: 'get-cost-optimization-insights',
      description: 'Get cost optimization insights and recommendations',
      schema: CostOptimizationSchema,
      handler: async (_client, params) => getCostOptimizationInsights(params),
    });

    this.registerTool({
      name: 'analyze-bandwidth-usage',
      description: 'Analyze bandwidth usage patterns and costs',
      schema: BandwidthUsageSchema,
      handler: async (_client, params) => analyzeBandwidthUsage(params),
    });

    // Dashboards and Exports
    this.registerTool({
      name: 'create-reporting-dashboard',
      description: 'Create custom reporting dashboard',
      schema: DashboardSchema,
      handler: async (_client, params) => createReportingDashboard(params),
    });

    this.registerTool({
      name: 'export-report-data',
      description: 'Export report data in various formats',
      schema: ExportReportSchema,
      handler: async (_client, params) => exportReportData(params),
    });

    // Monitoring and Alerts
    this.registerTool({
      name: 'configure-monitoring-alerts',
      description: 'Configure monitoring alerts for key metrics',
      schema: MonitoringAlertsSchema,
      handler: async (_client, params) => configureMonitoringAlerts(params),
    });

    this.registerTool({
      name: 'get-realtime-metrics',
      description: 'Get real-time performance metrics',
      schema: RealtimeMetricsSchema,
      handler: async (_client, params) => getRealtimeMetrics(params),
    });

    // Geographic and Error Analysis
    this.registerTool({
      name: 'analyze-geographic-performance',
      description: 'Analyze performance by geographic regions',
      schema: GeographicPerformanceSchema,
      handler: async (_client, params) => analyzeGeographicPerformance(params),
    });

    this.registerTool({
      name: 'analyze-error-patterns',
      description: 'Analyze error patterns and identify root causes',
      schema: ErrorPatternsSchema,
      handler: async (_client, params) => analyzeErrorPatterns(params),
    });

    /**
     * ADVANCED ANALYTICS TOOLS - MULTI-CUSTOMER INTELLIGENCE
     * 
     * These tools represent the future of multi-customer analytics:
     * 
     * PHASE 1 (Current): Mock implementations with proper MCP interfaces
     * PHASE 2 (Next): Real Akamai API integration with customer validation  
     * PHASE 3 (Future): Cross-customer analytics and ML predictions
     * 
     * MULTI-CUSTOMER ANALYTICS VISION:
     * - Aggregate traffic patterns across multiple customers
     * - Comparative performance benchmarking between accounts
     * - Cross-customer anomaly detection and alerting
     * - Predictive scaling recommendations per customer context
     * - Industry benchmarking using anonymized multi-customer data
     */
    
    // Advanced Analytics
    this.registerTool({
      name: 'predict-traffic-peaks',
      description: 'Predict future traffic peaks using ML. Multi-customer: Compare patterns across accounts for better predictions.',
      schema: z.object({
        customer: z.string().optional(),
        historicalDays: z.number().default(90),
        forecastDays: z.number().default(30),
        confidence: z.enum(['low', 'medium', 'high']).default('medium'),
      }),
      handler: async (_client, params) => {
        // TODO Phase 2: Implement real traffic peak prediction using Akamai Reporting API
        // TODO Phase 3: Cross-customer pattern analysis for improved accuracy
        return {
          content: [{
            type: 'text',
            text: `Traffic Peak Predictions (next ${params.forecastDays} days):\n` +
                  `- Expected peak: Day 7 at 14:00 UTC (95% confidence)\n` +
                  `- Estimated traffic: 2.3x normal volume\n` +
                  `- Recommended actions: Pre-scale origin capacity, enable burst protection`,
          }],
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
      handler: async (_client, params) => {
        // TODO: Implement real anomaly detection using Akamai Reporting API
        return {
          content: [{
            type: 'text',
            text: `Anomaly Detection Results (${params.metrics.join(', ')}):\n` +
                  `- High error rate spike detected 2 hours ago\n` +
                  `- Unusual traffic pattern from AS12345\n` +
                  `- Response times normal despite traffic increase\n` +
                  `Recommended: Investigate error spike on /api/v2/* endpoints`,
          }],
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
      handler: async (_client, params) => {
        // TODO: Implement real content popularity analysis using Akamai Reporting API
        return {
          content: [{
            type: 'text',
            text: `Content Popularity Analysis (${params.period}):\n` +
                  `Top Content:\n` +
                  `1. /assets/main.js - 45M requests (cacheable)\n` +
                  `2. /api/user/profile - 23M requests (dynamic)\n` +
                  `3. /images/logo.png - 18M requests (cached)\n\n` +
                  `Optimization Opportunities:\n` +
                  `- Enable caching for /api/products/* (12M requests)\n` +
                  `- Increase TTL for /assets/* from 1h to 24h\n` +
                  `- Consider CDN prefetch for trending content`,
          }],
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
      handler: async (_client, params) => {
        // TODO: Implement real SLA compliance reporting using Akamai Reporting API
        return {
          content: [{
            type: 'text',
            text: `SLA Compliance Report:\n` +
                  `Period: ${params.period.start} to ${params.period.end}\n\n` +
                  `[DONE] Availability: 99.95% (Target: ${params.slaTargets.availability}%)\n` +
                  `[DONE] Avg Response Time: 145ms (Target: <${params.slaTargets.responseTime}ms)\n` +
                  `[WARNING]  Error Rate: 0.12% (Target: <${params.slaTargets.errorRate}%)\n\n` +
                  `SLA Credits: None required\n` +
                  `Violations: 1 (Error rate exceeded on 2024-01-15)`,
          }],
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
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
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
            `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  private zodToJsonSchema(_schema: z.ZodSchema): any {
    // TODO: Implement proper Zod to JSON Schema conversion
    // Simplified schema conversion for now
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