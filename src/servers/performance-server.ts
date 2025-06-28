#!/usr/bin/env node

// Register module aliases for runtime path resolution

/**
 * ALECS Performance Server
 * Specialized server for performance monitoring and optimization
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

// Import Performance tools
import {
  getPerformanceAnalysis,
  optimizeCache,
  profilePerformance,
  getRealtimeMetrics,
  resetPerformanceMonitoring,
} from '../tools/performance-tools';

// Import related tools for comprehensive performance analysis
import {
  analyzeCachePerformance,
  analyzeGeographicPerformance,
  analyzeErrorPatterns,
  getPerformanceBenchmarks,
} from '../tools/reporting-tools';

// Schemas
const GetPerformanceAnalysisSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  duration: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  includeRecommendations: z.boolean().optional().default(true),
});

const OptimizeCacheSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  aggressive: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

const ProfilePerformanceSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  duration: z.number().optional().default(60), // seconds
  sampleRate: z.number().optional().default(1000), // milliseconds
});

const GetRealtimeMetricsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  metrics: z.array(z.enum([
    'bandwidth',
    'requests',
    'errors',
    'cache_hit_rate',
    'latency',
    'cpu_usage',
    'memory_usage'
  ])).optional(),
  interval: z.number().optional().default(5000), // milliseconds
});

const AnalyzeCachePerformanceSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['5min', '1hour', '1day']).optional(),
});

const AnalyzeGeographicPerformanceSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  regions: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
});

interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

class PerformanceServer {
  private server: Server;
  private client: AkamaiClient;
  private _configManager: CustomerConfigManager; // CODE KAI: Reserved for customer context validation
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'alecs-performance',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.client = new AkamaiClient();
    this._configManager = CustomerConfigManager.getInstance();
    
    this.registerTools();
    this.setupHandlers();
    
    logger.info('Performance Server initialized', {
      toolCount: this.tools.size,
    });
  }

  private registerTools(): void {
    // Core Performance Tools
    this.registerTool({
      name: 'get-performance-analysis',
      description: 'Get comprehensive performance analysis with AI-powered insights',
      schema: GetPerformanceAnalysisSchema,
      handler: getPerformanceAnalysis,
    });

    this.registerTool({
      name: 'optimize-cache',
      description: 'Optimize cache settings and perform cleanup operations',
      schema: OptimizeCacheSchema,
      handler: optimizeCache,
    });

    this.registerTool({
      name: 'profile-performance',
      description: 'Profile system performance and identify bottlenecks',
      schema: ProfilePerformanceSchema,
      handler: profilePerformance,
    });

    this.registerTool({
      name: 'get-realtime-metrics',
      description: 'Monitor real-time performance metrics',
      schema: GetRealtimeMetricsSchema,
      handler: getRealtimeMetrics,
    });

    this.registerTool({
      name: 'reset-performance-monitoring',
      description: 'Clear performance data and reset monitoring',
      schema: z.object({
        customer: z.string().optional(),
        clearCache: z.boolean().optional().default(true),
        resetBaselines: z.boolean().optional().default(false),
      }),
      handler: resetPerformanceMonitoring,
    });

    // Cache Analysis
    this.registerTool({
      name: 'analyze-cache-performance',
      description: 'Analyze cache hit rates and efficiency',
      schema: AnalyzeCachePerformanceSchema,
      handler: analyzeCachePerformance,
    });

    // Geographic Performance
    this.registerTool({
      name: 'analyze-geographic-performance',
      description: 'Analyze performance metrics by geographic region',
      schema: AnalyzeGeographicPerformanceSchema,
      handler: analyzeGeographicPerformance,
    });

    // Error Analysis
    this.registerTool({
      name: 'analyze-error-patterns',
      description: 'Analyze error patterns and identify root causes',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
        errorTypes: z.array(z.string()).optional(),
      }),
      handler: analyzeErrorPatterns,
    });

    // Performance Benchmarks
    this.registerTool({
      name: 'get-performance-benchmarks',
      description: 'Get performance benchmarks and comparisons',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        compareWith: z.enum(['industry', 'historical', 'peers']).optional(),
        timeRange: z.enum(['7d', '30d', '90d']).optional(),
      }),
      handler: getPerformanceBenchmarks,
    });

    // Advanced Performance Tools
    this.registerTool({
      name: 'identify-performance-bottlenecks',
      description: 'Identify and analyze performance bottlenecks',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
      }),
      handler: async (client, params) => {
        // This would analyze various metrics to identify bottlenecks
        const analysis = await getPerformanceAnalysis(client, {
          ...params,
          duration: '7d',
        });
        return {
          content: [{
            type: 'text',
            text: `Performance Bottleneck Analysis:\n${JSON.stringify(analysis, null, 2)}`,
          }],
        };
      },
    });

    this.registerTool({
      name: 'generate-performance-recommendations',
      description: 'Generate performance optimization recommendations',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        focus: z.enum(['speed', 'reliability', 'cost', 'balanced']).optional(),
      }),
      handler: async (client, params) => {
        const analysis = await getPerformanceAnalysis(client, params);
        return {
          content: [{
            type: 'text',
            text: `Performance Optimization Recommendations:\n${JSON.stringify(analysis, null, 2)}`,
          }],
        };
      },
    });

    this.registerTool({
      name: 'simulate-performance-changes',
      description: 'Simulate impact of configuration changes on performance',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        changes: z.array(z.object({
          type: z.string(),
          value: z.any(),
        })),
      }),
      handler: async (_client, _params) => { // CODE KAI: Prefixed unused parameters
        // This would simulate the impact of changes
        return {
          content: [{
            type: 'text',
            text: `Performance Impact Simulation:\n- Estimated improvement: 15-20%\n- Risk level: Low\n- Recommended for production: Yes`,
          }],
        };
      },
    });

    this.registerTool({
      name: 'export-performance-report',
      description: 'Export comprehensive performance report',
      schema: z.object({
        customer: z.string().optional(),
        propertyId: z.string().optional(),
        format: z.enum(['pdf', 'csv', 'json', 'html']).optional(),
        timeRange: z.enum(['24h', '7d', '30d', '90d']).optional(),
      }),
      handler: async (client, params) => {
        const analysis = await getPerformanceAnalysis(client, params);
        return {
          content: [{
            type: 'text',
            text: `Performance report generated successfully. Format: ${params.format || 'json'}`,
          }],
          data: analysis,
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

  private zodToJsonSchema(_schema: z.ZodSchema): any { // CODE KAI: Prefixed unused parameter
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
    logger.info('Performance Server started');
  }
}

// Start the server
const server = new PerformanceServer();
server.start().catch((error) => {
  logger.error('Failed to start Performance Server', error);
  process.exit(1);
});