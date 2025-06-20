/**
 * MCP Server Observability Integration
 * Enhances the main MCP server with comprehensive observability capabilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types';

import type ObservabilityStack from './index';
import { ObservabilityFactory, DestinationFactory } from './index';

export interface InstrumentedServerConfig {
  observability: {
    enabled: boolean;
    environment: 'development' | 'production' | 'minimal';
    destinations?: Array<{
      type: 'prometheus' | 'datadog' | 'newrelic' | 'webhook';
      name: string;
      config: Record<string, any>;
    }>;
  };
  server: {
    name: string;
    version: string;
    capabilities: any;
  };
}

export class InstrumentedMCPServer {
  private server: Server;
  private observability: ObservabilityStack | null = null;
  private requestCounter = 0;

  constructor(private config: InstrumentedServerConfig) {
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: config.server.capabilities,
      },
    );

    this.initializeObservability();
    this.setupServerInstrumentation();
  }

  private initializeObservability(): void {
    if (!this.config.observability.enabled) {
      console.log('📊 Observability disabled');
      return;
    }

    try {
      // Create destinations from config
      const destinations = this.createDestinationsFromConfig();

      // Initialize observability stack based on environment
      switch (this.config.observability.environment) {
        case 'production':
          this.observability = ObservabilityFactory.createProduction(destinations);
          break;
        case 'minimal':
          this.observability = ObservabilityFactory.createMinimal();
          break;
        default:
          this.observability = ObservabilityFactory.createDevelopment();
      }

      this.setupCustomHealthChecks();
      this.setupCustomAlerts();

      console.log(
        `📊 Observability initialized for ${this.config.observability.environment} environment`,
      );
    } catch (_error) {
      console.error('❌ Failed to initialize observability:', _error);
    }
  }

  private createDestinationsFromConfig(): any[] {
    if (!this.config.observability.destinations) {
      return [];
    }

    return this.config.observability.destinations.map((dest) => {
      switch (dest.type) {
        case 'prometheus':
          return DestinationFactory.createPrometheus(
            dest.name,
            dest.config.url,
            dest.config.job || 'alecs-mcp-akamai',
            dest.config.instance,
          );
        case 'datadog':
          return DestinationFactory.createDataDog(dest.name, dest.config.apiKey, dest.config.site);
        case 'newrelic':
          return DestinationFactory.createNewRelic(
            dest.name,
            dest.config.licenseKey,
            dest.config.region,
          );
        case 'webhook':
          return DestinationFactory.createWebhook(
            dest.name,
            dest.config.url,
            dest.config.authentication,
            dest.config.format,
          );
        default:
          throw new Error(`Unknown destination type: ${dest.type}`);
      }
    });
  }

  private setupCustomHealthChecks(): void {
    if (!this.observability) {
return;
}

    // MCP Server connectivity health check
    this.observability.diagnostics.registerHealthCheck({
      name: 'mcp_server_connectivity',
      category: 'application',
      async execute() {
        try {
          // Test basic server responsiveness
          const isResponsive = true; // Would implement actual connectivity test

          return {
            name: 'mcp_server_connectivity',
            status: isResponsive ? 'healthy' : 'critical',
            message: isResponsive ? 'MCP server is responsive' : 'MCP server connectivity issues',
            lastCheck: Date.now(),
            duration: 0,
            metadata: { serverActive: isResponsive },
          };
        } catch (_error) {
          return {
            name: 'mcp_server_connectivity',
            status: 'critical',
            message: `Health check failed: ${_error instanceof Error ? _error.message : String(_error)}`,
            lastCheck: Date.now(),
            duration: 0,
          };
        }
      },
    });

    // Tool execution health check
    this.observability.diagnostics.registerHealthCheck({
      name: 'tool_execution_health',
      category: 'application',
      execute: async () => {
        // Check for recent tool execution errors
        const recentEvents = this.observability!.debug.getRecentEvents(100);
        const errorEvents = recentEvents.filter(
          (e) => e.level === 'error' && e.category === 'tool-execution',
        );
        const errorRate = errorEvents.length / Math.max(recentEvents.length, 1);

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = 'Tool execution is healthy';

        if (errorRate > 0.2) {
          status = 'critical';
          message = `High tool execution error rate: ${(errorRate * 100).toFixed(1)}%`;
        } else if (errorRate > 0.1) {
          status = 'warning';
          message = `Elevated tool execution error rate: ${(errorRate * 100).toFixed(1)}%`;
        }

        return {
          name: 'tool_execution_health',
          status,
          message,
          lastCheck: Date.now(),
          duration: 0,
          metadata: { errorRate, recentErrors: errorEvents.length },
        };
      },
    });
  }

  private setupCustomAlerts(): void {
    if (!this.observability) {
return;
}

    // High error rate alert
    this.observability.diagnostics.registerAlertRule({
      name: 'high_tool_error_rate',
      condition: () => {
        const recentEvents = this.observability!.debug.getRecentEvents(50);
        const errorEvents = recentEvents.filter((e) => e.level === 'error');
        return errorEvents.length / Math.max(recentEvents.length, 1) > 0.15;
      },
      severity: 'warning',
      message: 'High error rate detected in tool executions',
      cooldownMs: 300000, // 5 minutes
    });

    // Memory usage alert
    this.observability.diagnostics.registerAlertRule({
      name: 'high_memory_usage',
      condition: (diagnostics) => {
        const memUsage = diagnostics.process.memoryUsage;
        return memUsage.heapUsed / memUsage.heapTotal > 0.9;
      },
      severity: 'critical',
      message: 'Critical memory usage detected',
      cooldownMs: 180000, // 3 minutes
    });

    // Request timeout alert
    this.observability.diagnostics.registerAlertRule({
      name: 'request_timeouts',
      condition: () => {
        const recentEvents = this.observability!.debug.getRecentEvents(100);
        const timeoutEvents = recentEvents.filter(
          (e) =>
            e.message.toLowerCase().includes('timeout') ||
            e.message.toLowerCase().includes('timed out'),
        );
        return timeoutEvents.length > 5;
      },
      severity: 'warning',
      message: 'Multiple request timeouts detected',
      cooldownMs: 600000, // 10 minutes
    });
  }

  private setupServerInstrumentation(): void {
    if (!this.observability) {
      this.setupBasicHandlers();
      return;
    }

    // Instrument list tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const instrumentation = this.observability!.instrumentMCPRequest('list_tools', undefined, {
        requestId: this.generateRequestId(),
      });

      try {
        const tools = await this.getAvailableTools();

        instrumentation.finish(undefined, { toolCount: tools.length });

        return { tools };
      } catch (_error) {
        instrumentation.finish(error as Error);
        throw _error;
      }
    });

    // Instrument tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: toolArgs } = request.params;
      const customer = (toolArgs as any)?.customer || 'default';

      const instrumentation = this.observability!.instrumentMCPRequest(toolName, customer, {
        requestId: this.generateRequestId(),
        toolArgs: Object.keys(toolArgs || {}),
      });

      try {
        this.observability!.debug.logEvent(
          'info',
          'tool-execution',
          `Executing tool: ${toolName}`,
          { toolName, customer, argsKeys: Object.keys(toolArgs || {}) },
          'mcp-server',
          instrumentation.traceId,
          instrumentation.spanId,
        );

        // Execute the tool with instrumentation
        const result = await this.executeToolWithInstrumentation(
          toolName,
          toolArgs,
          customer,
          instrumentation,
        );

        // Record successful tool execution
        this.observability!.metrics.incrementCounter('akamai_mcp_tool_executions_total', 1, {
          tool: toolName,
          customer,
          status: 'success',
        });

        instrumentation.finish(undefined, result);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (_error) {
        // Record failed tool execution
        this.observability!.metrics.incrementCounter('akamai_mcp_tool_executions_total', 1, {
          tool: toolName,
          customer,
          status: 'error',
        });

        this.observability!.debug.logEvent(
          'error',
          'tool-execution',
          `Tool execution failed: ${toolName}`,
          {
            toolName,
            customer,
            error: (error as Error).message,
            stack: (error as Error).stack,
          },
          'mcp-server',
          instrumentation.traceId,
          instrumentation.spanId,
        );

        instrumentation.finish(error as Error);

        // Re-throw to maintain MCP error handling
        throw _error;
      }
    });
  }

  private setupBasicHandlers(): void {
    // Setup handlers without instrumentation for when observability is disabled
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.getAvailableTools();
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: toolArgs } = request.params;
      const customer = (toolArgs as any)?.customer || 'default';

      const result = await this.executeToolWithoutInstrumentation(toolName, toolArgs, customer);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private async executeToolWithInstrumentation(
    toolName: string,
    toolArgs: any,
    customer: string,
    instrumentation: { traceId: string; spanId: string },
  ): Promise<any> {
    // This would integrate with your existing tool implementations
    // For now, we'll simulate the execution

    if (toolName.includes('akamai') || toolName.includes('property') || toolName.includes('dns')) {
      // Instrument Akamai API calls
      const [service, operation] = this.parseToolName(toolName);

      const apiInstrumentation = this.observability!.instrumentAkamaiAPIRequest(
        service,
        operation,
        customer,
        { originalTool: toolName },
      );

      try {
        // Log API call details
        this.observability!.debug.logToSpan(instrumentation.traceId, instrumentation.spanId, {
          action: 'calling_akamai_api',
          service,
          operation,
          customer,
        });

        // Execute the actual tool (would call your existing tool functions)
        const result = await this.simulateToolExecution(toolName, toolArgs, customer);

        apiInstrumentation.finish(undefined, result);

        return result;
      } catch (_error) {
        apiInstrumentation.finish(error as Error);
        throw _error;
      }
    }

    // For non-Akamai tools, execute directly
    return await this.simulateToolExecution(toolName, toolArgs, customer);
  }

  private async executeToolWithoutInstrumentation(
    toolName: string,
    toolArgs: any,
    customer: string,
  ): Promise<any> {
    return await this.simulateToolExecution(toolName, toolArgs, customer);
  }

  private parseToolName(toolName: string): [string, string] {
    // Parse tool name to extract service and operation
    if (toolName.startsWith('property.')) {
      return ['papi', toolName.substring(9)];
    } else if (toolName.startsWith('dns.')) {
      return ['edgedns', toolName.substring(4)];
    } else if (toolName.startsWith('purge.')) {
      return ['fastpurge', toolName.substring(6)];
    } else if (toolName.startsWith('cps.')) {
      return ['cps', toolName.substring(4)];
    }

    return ['unknown', toolName];
  }

  private async simulateToolExecution(
    toolName: string,
    toolArgs: any,
    customer: string,
  ): Promise<any> {
    // Simulate execution time
    const executionTime = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise((resolve) => setTimeout(resolve, executionTime));

    // Record tool execution metrics
    if (this.observability) {
      this.observability.metrics.recordHistogram(
        'akamai_mcp_tool_duration_seconds',
        executionTime / 1000,
        { tool: toolName, customer },
      );
    }

    // Simulate occasional failures
    if (Math.random() < 0.03) {
      // 3% failure rate
      throw new McpError(ErrorCode.InternalError, `Simulated failure for tool ${toolName}`);
    }

    // Return mock result
    return {
      tool: toolName,
      customer,
      arguments: toolArgs,
      result: 'success',
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
    };
  }

  private async getAvailableTools(): Promise<any[]> {
    // This would return your actual tool definitions
    // For now, returning a subset as an example
    return [
      {
        name: 'property.list',
        description: 'List CDN properties',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Customer account' },
            contractId: { type: 'string', description: 'Contract ID filter' },
            groupId: { type: 'string', description: 'Group ID filter' },
          },
        },
      },
      {
        name: 'dns.zone.list',
        description: 'List DNS zones',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Customer account' },
            search: { type: 'string', description: 'Search term' },
          },
        },
      },
      // Add more tools as needed
    ];
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${(++this.requestCounter).toString().padStart(4, '0')}`;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    if (this.observability) {
      // Wait for observability initialization
      await new Promise<void>((resolve) => {
        this.observability!.once('initialized', resolve);
      });

      this.observability.debug.logEvent(
        'info',
        'server',
        'MCP Server starting with observability',
        {
          environment: this.config.observability.environment,
          observabilityEnabled: true,
        },
        'mcp-server',
      );
    }

    await this.server.connect(transport);

    console.log(
      `🚀 Akamai MCP Server started with ${this.observability ? 'full' : 'basic'} observability`,
    );

    if (this.observability) {
      this.observability.debug.logEvent(
        'info',
        'server',
        'MCP Server started successfully',
        { transport: 'stdio' },
        'mcp-server',
      );
    }
  }

  async stop(): Promise<void> {
    if (this.observability) {
      this.observability.debug.logEvent('info', 'server', 'MCP Server stopping', {}, 'mcp-server');

      // Export final metrics before shutdown
      try {
        await this.observability.generateHealthReport();
        console.log('📊 Final observability report generated');

        // Optionally export to file or send to monitoring
        if (process.env.EXPORT_ON_SHUTDOWN === 'true') {
          await this.observability.exportObservabilityData();
          console.log('📤 Observability data exported on shutdown');
        }
      } catch (_error) {
        console.error('❌ Failed to generate final report:', _error);
      }

      this.observability.stop();
    }

    console.log('🛑 MCP Server stopped');
  }

  getObservability(): ObservabilityStack | null {
    return this.observability;
  }

  getHealthStatus(): Promise<any> {
    if (!this.observability) {
      return Promise.resolve({ overall: 'unknown', message: 'Observability disabled' });
    }

    return this.observability.generateHealthReport();
  }
}

// Factory functions for common configurations
export class ServerFactory {
  static createDevelopmentServer(): InstrumentedMCPServer {
    const config: InstrumentedServerConfig = {
      observability: {
        enabled: true,
        environment: 'development',
      },
      server: {
        name: 'alecs-mcp-akamai-server',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      },
    };

    return new InstrumentedMCPServer(config);
  }

  static createProductionServer(destinations: any[] = []): InstrumentedMCPServer {
    const config: InstrumentedServerConfig = {
      observability: {
        enabled: true,
        environment: 'production',
        destinations: destinations.map((dest) => ({
          type: dest.type,
          name: dest.name,
          config: dest.config,
        })),
      },
      server: {
        name: 'alecs-mcp-akamai-server',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      },
    };

    return new InstrumentedMCPServer(config);
  }

  static createMinimalServer(): InstrumentedMCPServer {
    const config: InstrumentedServerConfig = {
      observability: {
        enabled: true,
        environment: 'minimal',
      },
      server: {
        name: 'alecs-mcp-akamai-server',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      },
    };

    return new InstrumentedMCPServer(config);
  }

  static createBasicServer(): InstrumentedMCPServer {
    const config: InstrumentedServerConfig = {
      observability: {
        enabled: false,
        environment: 'development',
      },
      server: {
        name: 'alecs-mcp-akamai-server',
        version: '1.0.0',
        capabilities: {
          tools: {},
        },
      },
    };

    return new InstrumentedMCPServer(config);
  }
}

export default InstrumentedMCPServer;
