/**
 * Observability Integration Demo
 * Shows how to integrate the comprehensive observability stack with the Akamai MCP Server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import ObservabilityStack, { 
  ObservabilityFactory, 
  DestinationFactory 
} from '../src/observability/index.js';

// Example: Production observability setup
async function createProductionObservability(): Promise<ObservabilityStack> {
  // Define telemetry destinations
  const destinations = [
    // Prometheus Push Gateway
    DestinationFactory.createPrometheus(
      'prometheus',
      process.env.PROMETHEUS_PUSH_GATEWAY_URL || 'http://localhost:9091',
      'alecs-mcp-akamai-server',
      process.env.HOSTNAME || 'localhost'
    ),

    // DataDog (if API key is available)
    ...(process.env.DATADOG_API_KEY ? [
      DestinationFactory.createDataDog(
        'datadog',
        process.env.DATADOG_API_KEY,
        process.env.DATADOG_SITE || 'datadoghq.com'
      )
    ] : []),

    // New Relic (if license key is available)
    ...(process.env.NEW_RELIC_LICENSE_KEY ? [
      DestinationFactory.createNewRelic(
        'newrelic',
        process.env.NEW_RELIC_LICENSE_KEY,
        (process.env.NEW_RELIC_REGION as 'US' | 'EU') || 'US'
      )
    ] : []),

    // Custom webhook for internal monitoring
    ...(process.env.MONITORING_WEBHOOK_URL ? [
      DestinationFactory.createWebhook(
        'internal-monitoring',
        process.env.MONITORING_WEBHOOK_URL,
        process.env.MONITORING_WEBHOOK_TOKEN ? {
          type: 'bearer' as const,
          token: process.env.MONITORING_WEBHOOK_TOKEN,
        } : undefined
      )
    ] : []),
  ];

  console.log(`🔍 Initializing observability with ${destinations.length} destinations`);
  return ObservabilityFactory.createProduction(destinations);
}

// Example: Development observability setup
function createDevelopmentObservability(): ObservabilityStack {
  console.log('🔍 Initializing development observability stack');
  return ObservabilityFactory.createDevelopment();
}

// Example: Instrumenting MCP server with observability
class InstrumentedMCPServer {
  private server: Server;
  private observability: ObservabilityStack;

  constructor(observability: ObservabilityStack) {
    this.observability = observability;
    this.server = new Server(
      {
        name: 'alecs-mcp-akamai-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupInstrumentation();
    this.setupToolHandlers();
  }

  private setupInstrumentation(): void {
    // Monitor server lifecycle
    this.observability.debug.logEvent(
      'info',
      'server',
      'MCP Server initializing',
      { version: '1.0.0' },
      'mcp-server'
    );

    // Custom health check for MCP server
    this.observability.diagnostics.registerHealthCheck({
      name: 'mcp_server_health',
      category: 'application',
      async execute() {
        // Check if server is responsive
        const isHealthy = true; // Would implement actual health check
        
        return {
          name: 'mcp_server_health',
          status: isHealthy ? 'healthy' : 'critical',
          message: isHealthy ? 'MCP server is responsive' : 'MCP server is not responding',
          lastCheck: Date.now(),
          duration: 0,
        };
      },
    });

    // Custom alert rule for high error rate
    this.observability.diagnostics.registerAlertRule({
      name: 'high_error_rate',
      condition: () => {
        const recentEvents = this.observability.debug.getRecentEvents(100);
        const errorEvents = recentEvents.filter(e => e.level === 'error');
        const errorRate = errorEvents.length / recentEvents.length;
        return errorRate > 0.1; // Alert if error rate > 10%
      },
      severity: 'warning',
      message: 'High error rate detected in MCP server',
      cooldownMs: 300000, // 5 minutes
    });
  }

  private setupToolHandlers(): void {
    // Example: Instrument property.list tool
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name: toolName, arguments: toolArgs } = request.params;
      
      // Start instrumentation
      const instrumentation = this.observability.instrumentMCPRequest(
        toolName,
        toolArgs.customer || 'default',
        { requestId: this.generateRequestId() }
      );

      try {
        // Simulate tool execution
        const result = await this.executeToolWithInstrumentation(
          toolName,
          toolArgs,
          instrumentation
        );

        // Log successful completion
        instrumentation.finish(undefined, result);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };

      } catch (error) {
        // Log error
        instrumentation.finish(error as Error);
        
        // Re-throw to maintain MCP error handling
        throw error;
      }
    });
  }

  private async executeToolWithInstrumentation(
    toolName: string,
    toolArgs: any,
    instrumentation: { traceId: string; spanId: string }
  ): Promise<any> {
    // Example: property.list implementation with Akamai API instrumentation
    if (toolName === 'property.list') {
      const customer = toolArgs.customer || 'default';
      
      // Instrument Akamai API call
      const apiInstrumentation = this.observability.instrumentAkamaiAPIRequest(
        'papi',
        'properties',
        customer
      );

      try {
        // Log span details
        this.observability.debug.logToSpan(
          instrumentation.traceId,
          instrumentation.spanId,
          { 
            action: 'calling_akamai_api',
            service: 'papi',
            endpoint: 'properties',
            customer 
          }
        );

        // Simulate Akamai API call
        const properties = await this.simulateAkamaiAPICall(customer);
        
        apiInstrumentation.finish(undefined, properties);
        
        return {
          properties: properties.items || [],
          total: properties.items?.length || 0,
          customer,
        };

      } catch (error) {
        apiInstrumentation.finish(error as Error);
        throw error;
      }
    }

    // Default implementation for other tools
    return { tool: toolName, args: toolArgs, result: 'success' };
  }

  private async simulateAkamaiAPICall(customer: string): Promise<any> {
    // Simulate API latency
    const latency = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, latency));

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`API call failed for customer ${customer}`);
    }

    // Record API metrics
    this.observability.metrics.recordHistogram(
      'akamai_api_request_duration_seconds',
      latency / 1000,
      { service: 'papi', endpoint: 'properties', customer }
    );

    this.observability.metrics.incrementCounter(
      'akamai_api_requests_total',
      1,
      { service: 'papi', endpoint: 'properties', customer, status: 'success' }
    );

    return {
      items: [
        { propertyId: 'prp_123', propertyName: 'example.com', customer },
        { propertyId: 'prp_456', propertyName: 'api.example.com', customer },
      ],
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  async start(): Promise<void> {
    // Setup transport
    const transport = new StdioServerTransport();
    
    // Start server
    await this.server.connect(transport);
    
    this.observability.debug.logEvent(
      'info',
      'server',
      'MCP Server started successfully',
      { transport: 'stdio' },
      'mcp-server'
    );

    console.log('🚀 Instrumented MCP Server started');
  }

  async stop(): Promise<void> {
    this.observability.debug.logEvent(
      'info',
      'server',
      'MCP Server stopping',
      {},
      'mcp-server'
    );

    this.observability.stop();
    console.log('🛑 MCP Server stopped');
  }
}

// Example: Real-time monitoring dashboard data provider
class MonitoringDashboard {
  constructor(private observability: ObservabilityStack) {}

  async getDashboardData(): Promise<{
    health: any;
    metrics: any;
    recentEvents: any[];
    activeTraces: any[];
    alerts: any[];
  }> {
    const healthReport = await this.observability.generateHealthReport();
    
    return {
      health: {
        overall: healthReport.overall,
        uptime: healthReport.observability.uptime,
        healthChecks: healthReport.healthChecks.summary,
      },
      metrics: {
        totalRequests: this.getMetricValue('akamai_mcp_requests_total'),
        averageLatency: this.getMetricValue('akamai_mcp_request_duration_seconds'),
        errorRate: this.calculateErrorRate(),
        memoryUsage: healthReport.systemDiagnostics?.process.memoryUsage.heapUsed || 0,
      },
      recentEvents: this.observability.debug.getRecentEvents(50),
      activeTraces: this.observability.debug.getRecentTraces(10),
      alerts: this.observability.diagnostics.getAlerts({ acknowledged: false }),
    };
  }

  private getMetricValue(metricName: string): number {
    const metrics = this.observability.metrics.getMetricsSnapshot();
    const metric = metrics[metricName];
    return metric && metric.length > 0 ? metric[metric.length - 1].value : 0;
  }

  private calculateErrorRate(): number {
    const recentEvents = this.observability.debug.getRecentEvents(100);
    if (recentEvents.length === 0) return 0;
    
    const errorEvents = recentEvents.filter(e => e.level === 'error');
    return errorEvents.length / recentEvents.length;
  }

  startRealTimeUpdates(callback: (data: any) => void, intervalMs: number = 5000): void {
    const interval = setInterval(async () => {
      try {
        const data = await this.getDashboardData();
        callback(data);
      } catch (error) {
        console.error('Failed to update dashboard data:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

// Example: Command-line monitoring tool
class CLIMonitor {
  constructor(private observability: ObservabilityStack) {}

  async displayStats(): Promise<void> {
    const report = await this.observability.generateHealthReport();
    
    console.log('\n=== Akamai MCP Server Observability Status ===');
    console.log(`Overall Health: ${report.overall.toUpperCase()}`);
    console.log(`Uptime: ${Math.round(report.observability.uptime / 1000)}s`);
    console.log(`Total Events: ${report.observability.debugging.events}`);
    console.log(`Active Traces: ${report.observability.debugging.traces}`);
    console.log(`Unacknowledged Alerts: ${report.observability.diagnostics.activeAlerts}`);
    
    console.log('\n--- Health Checks ---');
    for (const check of report.healthChecks.checks) {
      const status = check.status.toUpperCase().padEnd(8);
      console.log(`${status} ${check.name}: ${check.message || 'OK'}`);
    }
    
    if (report.recentAlerts.length > 0) {
      console.log('\n--- Recent Alerts ---');
      for (const alert of report.recentAlerts.slice(0, 5)) {
        const severity = alert.severity.toUpperCase().padEnd(8);
        const time = new Date(alert.timestamp).toLocaleTimeString();
        console.log(`${severity} [${time}] ${alert.message}`);
      }
    }
    
    console.log('\n--- Recommendations ---');
    for (const recommendation of report.recommendations) {
      console.log(`• ${recommendation}`);
    }
  }

  async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<void> {
    const data = await this.observability.exportObservabilityData(format);
    const filename = `observability-export-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;
    
    console.log(`Exporting observability data to ${filename}`);
    // In a real implementation, would write to file
    console.log(data);
  }
}

// Main demo function
async function main(): Promise<void> {
  try {
    // Determine environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize observability stack
    const observability = isProduction 
      ? await createProductionObservability()
      : createDevelopmentObservability();

    // Wait for initialization
    await new Promise<void>((resolve) => {
      observability.once('initialized', resolve);
    });

    // Create instrumented MCP server
    const server = new InstrumentedMCPServer(observability);
    
    // Create monitoring dashboard
    const dashboard = new MonitoringDashboard(observability);
    
    // Create CLI monitor
    const cliMonitor = new CLIMonitor(observability);

    // Handle graceful shutdown
    const cleanup = () => {
      console.log('\n🛑 Shutting down...');
      server.stop().then(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Start the server
    await server.start();

    // If in interactive mode, provide monitoring commands
    if (process.env.INTERACTIVE === 'true') {
      console.log('\n📊 Interactive monitoring mode');
      console.log('Commands:');
      console.log('  - Type "stats" to show current statistics');
      console.log('  - Type "export" to export metrics');
      console.log('  - Type "dashboard" to show dashboard data');
      console.log('  - Type "quit" to exit');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'monitor> ',
      });

      rl.prompt();
      rl.on('line', async (input: string) => {
        const command = input.trim().toLowerCase();
        
        try {
          switch (command) {
            case 'stats':
              await cliMonitor.displayStats();
              break;
            case 'export':
              await cliMonitor.exportMetrics();
              break;
            case 'dashboard':
              const dashboardData = await dashboard.getDashboardData();
              console.log(JSON.stringify(dashboardData, null, 2));
              break;
            case 'quit':
            case 'exit':
              cleanup();
              return;
            case 'help':
              console.log('Available commands: stats, export, dashboard, quit');
              break;
            default:
              console.log(`Unknown command: ${command}. Type "help" for available commands.`);
          }
        } catch (error) {
          console.error('Command failed:', error);
        }
        
        rl.prompt();
      });
    } else {
      // Non-interactive mode - just run and display periodic stats
      setInterval(async () => {
        try {
          await cliMonitor.displayStats();
        } catch (error) {
          console.error('Failed to display stats:', error);
        }
      }, 30000); // Every 30 seconds
    }

  } catch (error) {
    console.error('Failed to start observability demo:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  InstrumentedMCPServer,
  MonitoringDashboard,
  CLIMonitor,
  createProductionObservability,
  createDevelopmentObservability,
};