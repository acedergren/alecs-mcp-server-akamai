#!/usr/bin/env node

/**
 * ALECS Reporting Server - Analytics & Reporting Module
 * Handles traffic reports, performance analytics, and operational insights
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

// Reporting Tools

// Fast Purge Tools (for purge reporting)

// Performance Tools

// Resilience Tools (for system health)

// Integration Testing Tools (for API health)

// Documentation Tools (for report generation)

// Property Operations (for property health reports)

// Bulk Operations Status
import { getBulkOperationStatus } from '../tools/bulk-operations-manager';
import { generateDocumentationIndex, generateChangelog } from '../tools/documentation-tools';
import { fastPurgeTools } from '../tools/fastpurge-tools';

// Hostname Discovery (for analytics)
import {
  analyzeHostnameConflicts,
  identifyOwnershipPatterns,
} from '../tools/hostname-discovery-engine';

// Hostname Management Analytics
import { analyzeHostnameOwnership } from '../tools/hostname-management-advanced';
import { checkAPIHealth } from '../tools/integration-testing-tools';
import {
  getPerformanceAnalysis,
  profilePerformance,
  getRealtimeMetrics,
} from '../tools/performance-tools';
import {
  checkPropertyHealth,
  detectConfigurationDrift,
} from '../tools/property-operations-advanced';
import { reportingTools } from '../tools/reporting-tools';
import { getSystemHealth, getOperationMetrics } from '../tools/resilience-tools';

// Rule Tree Performance
import { analyzeRuleTreePerformance } from '../tools/rule-tree-advanced';

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [REPORTING] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class ReportingALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    log('INFO', '📊 ALECS Reporting Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

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

    try {
      log('INFO', 'Initializing Akamai client...');
      this.client = new AkamaiClient();
      log('INFO', '✅ Akamai client initialized successfully');
    } catch (error) {
      log('ERROR', '❌ Failed to initialize Akamai client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List all reporting and analytics tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '📋 Tools list requested');

      // Get all reporting tools from the imported module
      const reportingToolsList = reportingTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      // Get fast purge reporting tools
      const purgeReportingTools = fastPurgeTools
        .filter((tool) => tool.name.includes('status') || tool.name.includes('history'))
        .map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

      // Add other analytics and monitoring tools
      const additionalTools = [
        // Performance Analytics
        {
          name: 'get-performance-analysis',
          description: 'Get detailed performance analysis for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyIds: { type: 'array', items: { type: 'string' } },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              metrics: { type: 'array', items: { type: 'string' } },
            },
            required: ['propertyIds', 'startDate', 'endDate'],
          },
        },
        {
          name: 'get-realtime-metrics',
          description: 'Get real-time performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyIds: { type: 'array', items: { type: 'string' } },
              metrics: { type: 'array', items: { type: 'string' } },
              interval: { type: 'number' },
            },
            required: ['propertyIds'],
          },
        },
        {
          name: 'profile-performance',
          description: 'Profile performance bottlenecks',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              duration: { type: 'number' },
              detailed: { type: 'boolean' },
            },
            required: ['propertyId'],
          },
        },
        // System Health
        {
          name: 'get-system-health',
          description: 'Get overall system health status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              includeDetails: { type: 'boolean' },
            },
          },
        },
        {
          name: 'get-operation-metrics',
          description: 'Get operation metrics and statistics',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              timeRange: { type: 'string' },
              groupBy: { type: 'string' },
            },
          },
        },
        {
          name: 'check-api-health',
          description: 'Check health of Akamai APIs',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              services: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        // Property Analytics
        {
          name: 'check-property-health',
          description: 'Check health status of properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyIds: { type: 'array', items: { type: 'string' } },
              checks: { type: 'array', items: { type: 'string' } },
            },
            required: ['propertyIds'],
          },
        },
        {
          name: 'detect-configuration-drift',
          description: 'Detect configuration drift in properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyIds: { type: 'array', items: { type: 'string' } },
              baselineVersion: { type: 'number' },
            },
            required: ['propertyIds'],
          },
        },
        {
          name: 'analyze-rule-tree-performance',
          description: 'Analyze rule tree performance impact',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
              includeRecommendations: { type: 'boolean' },
            },
            required: ['propertyId', 'version'],
          },
        },
        // Hostname Analytics
        {
          name: 'analyze-hostname-ownership',
          description: 'Analyze hostname ownership patterns',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              hostnames: { type: 'array', items: { type: 'string' } },
              includeHistory: { type: 'boolean' },
            },
            required: ['hostnames'],
          },
        },
        {
          name: 'analyze-hostname-conflicts',
          description: 'Analyze hostname conflicts across properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
          },
        },
        {
          name: 'identify-ownership-patterns',
          description: 'Identify hostname ownership patterns',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
          },
        },
        // Bulk Operation Status
        {
          name: 'get-bulk-operation-status',
          description: 'Get status of bulk operations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              operationId: { type: 'string' },
            },
            required: ['operationId'],
          },
        },
        // Report Generation
        {
          name: 'generate-changelog',
          description: 'Generate changelog for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyIds: { type: 'array', items: { type: 'string' } },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              format: { type: 'string', enum: ['markdown', 'html', 'json'] },
            },
            required: ['propertyIds'],
          },
        },
        {
          name: 'generate-documentation-index',
          description: 'Generate documentation index',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
              format: { type: 'string' },
            },
          },
        },
      ];

      const tools = [...reportingToolsList, ...purgeReportingTools, ...additionalTools];

      log('INFO', `✅ Returning ${tools.length} tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `🔧 Tool called: ${name}`, { args });

      const startTime = Date.now();
      const client = this.client;

      try {
        let result;

        // Check if it's a reporting tool
        const reportingTool = reportingTools.find((t) => t.name === name);
        if (reportingTool) {
          result = await reportingTool.handler(args);
        } else {
          // Check if it's a fast purge reporting tool
          const purgeTool = fastPurgeTools.find((t) => t.name === name);
          if (purgeTool) {
            result = await purgeTool.handler(args);
          } else {
            // Handle other tools
            switch (name) {
              // Performance Analytics
              case 'get-performance-analysis':
                result = await getPerformanceAnalysis(client, args as any);
                break;
              case 'get-realtime-metrics':
                result = await getRealtimeMetrics(client, args as any);
                break;
              case 'profile-performance':
                result = await profilePerformance(client, args as any);
                break;

              // System Health
              case 'get-system-health':
                result = await getSystemHealth(client, args as any);
                break;
              case 'get-operation-metrics':
                result = await getOperationMetrics(client, args as any);
                break;
              case 'check-api-health':
                result = await checkAPIHealth(client, args as any);
                break;

              // Property Analytics
              case 'check-property-health':
                result = await checkPropertyHealth(client, args as any);
                break;
              case 'detect-configuration-drift':
                result = await detectConfigurationDrift(client, args as any);
                break;
              case 'analyze-rule-tree-performance':
                result = await analyzeRuleTreePerformance(client, args as any);
                break;

              // Hostname Analytics
              case 'analyze-hostname-ownership':
                result = await analyzeHostnameOwnership(client, args as any);
                break;
              case 'analyze-hostname-conflicts':
                result = await analyzeHostnameConflicts(client, args as any);
                break;
              case 'identify-ownership-patterns':
                result = await identifyOwnershipPatterns(client, args as any);
                break;

              // Bulk Operation Status
              case 'get-bulk-operation-status':
                result = await getBulkOperationStatus(client, args as any);
                break;

              // Report Generation
              case 'generate-changelog':
                result = await generateChangelog(client, args as any);
                break;
              case 'generate-documentation-index':
                result = await generateDocumentationIndex(client, args as any);
                break;

              default:
                throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
            }
          }
        }

        const duration = Date.now() - startTime;
        log('INFO', `✅ Tool ${name} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        log('ERROR', `❌ Tool ${name} failed after ${duration}ms`, {
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: _error.stack,
                }
              : String(error),
        });

        if (_error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          );
        }

        if (_error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    log('INFO', '✅ Request handlers set up successfully');
  }

  async start() {
    log('INFO', '📍 Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (error: Error) => {
      log('ERROR', '❌ Transport error', {
        message: error.message,
        stack: _error.stack,
      });
    };

    transport.onclose = () => {
      log('INFO', '🔌 Transport closed, shutting down...');
      process.exit(0);
    };

    try {
      await this.server.connect(transport);
      log('INFO', '✅ Server connected and ready for MCP connections');
      log('INFO', '📊 Server stats', {
        toolCount: 25,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      });
    } catch (error) {
      log('ERROR', '❌ Failed to connect server', {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: _error.stack,
              }
            : String(error),
      });
      throw error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '🎯 ALECS Reporting Server main() started');

  try {
    const server = new ReportingALECSServer();
    await server.start();

    // Set up periodic status logging
    setInterval(() => {
      log('DEBUG', '💓 Server heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      });
    }, 30000); // Every 30 seconds
  } catch (error) {
    log('ERROR', '❌ Failed to start server', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: _error.stack,
            }
          : String(error),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (_error) => {
  log('ERROR', '❌ Uncaught exception', {
    error: {
      message: error.message,
      stack: _error.stack,
    },
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', '❌ Unhandled rejection', {
    reason:
      reason instanceof Error
        ? {
            message: reason.message,
            stack: reason.stack,
          }
        : String(reason),
    promise: String(promise),
  });
  process.exit(1);
});

// Handle signals
process.on('SIGTERM', () => {
  log('INFO', '📛 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', '📛 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
log('INFO', '🚀 Initiating ALECS Reporting Server...');
main();
