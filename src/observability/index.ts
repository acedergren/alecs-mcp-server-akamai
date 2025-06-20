/**
 * Observability Stack - Comprehensive monitoring and telemetry for Akamai MCP Server
 * Provides metrics collection, debugging, diagnostics, and telemetry export capabilities
 */

import { EventEmitter } from 'events';

import DebugAPI, { type DebugEvent, type StreamingConnection } from './debug-api';
import DiagnosticsAPI, { type SystemDiagnostics } from './diagnostics-api';
import MetricsAPI, { HTTPPushTarget, SystemMetricsCollector } from './metrics-api';
import TelemetryExporter, {
  type TelemetryDestination,
  DestinationFactory,
} from './telemetry-exporter';

export interface ObservabilityConfig {
  metrics: {
    enabled: boolean;
    pushIntervalMs?: number;
    maxHistory?: number;
    enableSystemMetrics?: boolean;
  };
  debugging: {
    enabled: boolean;
    maxEvents?: number;
    maxTraces?: number;
    traceRetentionMs?: number;
    enableStackTraces?: boolean;
  };
  diagnostics: {
    enabled: boolean;
    healthCheckIntervalMs?: number;
    diagnosticsIntervalMs?: number;
    enablePerformanceMonitoring?: boolean;
  };
  telemetry: {
    enabled: boolean;
    destinations: TelemetryDestination[];
    batchExportIntervalMs?: number;
    maxRetryAttempts?: number;
  };
  general: {
    enableRealTimeStreaming?: boolean;
    enableAlerts?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface ObservabilityStats {
  uptime: number;
  metrics: {
    total: number;
    definitions: number;
    collectors: number;
    pushTargets: number;
  };
  debugging: {
    events: number;
    traces: number;
    subscriptions: number;
    streamingConnections: number;
  };
  diagnostics: {
    healthChecks: number;
    alertRules: number;
    activeAlerts: number;
    lastHealthCheck?: number;
  };
  telemetry: {
    destinations: number;
    totalExports: number;
    successfulExports: number;
    failedExports: number;
    lastExport?: number;
  };
}

export class ObservabilityStack extends EventEmitter {
  public readonly metrics: MetricsAPI;
  public readonly debug: DebugAPI;
  public readonly diagnostics: DiagnosticsAPI;
  public readonly telemetry: TelemetryExporter;

  private startTime: number;
  public instrumentationActive = false;

  constructor(private config: ObservabilityConfig) {
    super();
    this.startTime = Date.now();

    // Initialize components
    this.metrics = new MetricsAPI({
      pushIntervalMs: config.metrics.pushIntervalMs,
      maxMetricHistory: config.metrics.maxHistory,
      enableCompression: true,
    });

    this.debug = new DebugAPI({
      maxEvents: config.debugging.maxEvents,
      maxTraces: config.debugging.maxTraces,
      traceRetentionMs: config.debugging.traceRetentionMs,
      enableStackTraces: config.debugging.enableStackTraces,
    });

    this.diagnostics = new DiagnosticsAPI({
      healthCheckIntervalMs: config.diagnostics.healthCheckIntervalMs,
      diagnosticsIntervalMs: config.diagnostics.diagnosticsIntervalMs,
      enablePerformanceMonitoring: config.diagnostics.enablePerformanceMonitoring,
    });

    this.telemetry = new TelemetryExporter(this.metrics, this.debug, this.diagnostics, {
      defaultFlushIntervalMs: config.telemetry.batchExportIntervalMs,
      maxRetryAttempts: config.telemetry.maxRetryAttempts,
    });

    this.setupEventForwarding();
    this.initialize();
  }

  /**
   * Initialize the observability stack
   */
  private async initialize(): Promise<void> {
    try {
      // Setup system metrics collector if enabled
      if (this.config.metrics.enableSystemMetrics) {
        this.metrics.addCollector('system', new SystemMetricsCollector());
      }

      // Add telemetry destinations
      for (const destination of this.config.telemetry.destinations) {
        this.telemetry.addDestination(destination);
      }

      // Start telemetry export if enabled
      if (this.config.telemetry.enabled) {
        this.telemetry.startBatchExport();
      }

      this.instrumentationActive = true;
      this.emit('initialized');

      this.debug.logEvent(
        'info',
        'observability',
        'Observability stack initialized',
        {
          config: this.config,
        },
        'observability-stack',
      );
    } catch (_error) {
      this.emit('initializationError', error);
      throw _error;
    }
  }

  /**
   * Setup event forwarding between components
   */
  private setupEventForwarding(): void {
    // Forward debug events to metrics for error counting
    this.debug.on('eventLogged', (event: DebugEvent) => {
      this.metrics.incrementCounter('akamai_mcp_debug_events_total', 1, {
        level: event.level,
        category: event.category,
        source: event.source,
      });
    });

    // Forward telemetry export results to metrics
    this.telemetry.on('exportSuccess', (result) => {
      this.metrics.incrementCounter('akamai_mcp_telemetry_exports_total', 1, {
        destination: result.destination,
        status: 'success',
      });
      this.metrics.recordHistogram(
        'akamai_mcp_telemetry_export_duration_seconds',
        result.duration / 1000,
        { destination: result.destination },
      );
    });

    this.telemetry.on('exportError', (result) => {
      this.metrics.incrementCounter('akamai_mcp_telemetry_exports_total', 1, {
        destination: result.destination,
        status: 'error',
      });
    });

    // Forward diagnostic alerts to debug events
    this.diagnostics.on('alertTriggered', (alert) => {
      this.debug.logEvent(
        alert.severity === 'critical' ? 'error' : 'warn',
        'diagnostics',
        `Alert triggered: ${alert.message}`,
        alert,
        'diagnostics-api',
      );
    });
  }

  /**
   * Instrument MCP request/response cycle
   */
  instrumentMCPRequest(
    method: string,
    customer?: string,
    metadata?: Record<string, any>,
  ): {
    traceId: string;
    spanId: string;
    finish: (error?: Error, response?: any) => void;
  } {
    const traceId = this.generateTraceId();
    const startTime = performance.now();

    // Start trace
    this.debug.startTrace(traceId, {
      service: 'mcp',
      method,
      customer,
      ...metadata,
    });

    // Start span
    const spanId = this.debug.startSpan(traceId, method, undefined, {
      'mcp.method': method,
      'mcp.customer': customer || 'default',
    });

    // Record request metric
    this.metrics.incrementCounter('akamai_mcp_requests_total', 1, {
      method,
      customer: customer || 'default',
      status: 'started',
    });

    return {
      traceId,
      spanId,
      finish: (error?: Error, response?: any) => {
        const duration = performance.now() - startTime;
        const status = error ? 'error' : 'success';

        // Finish span
        this.debug.finishSpan(traceId, spanId, error, {
          'mcp.status': status,
          'mcp.response_size': response ? JSON.stringify(response).length : 0,
        });

        // Record metrics
        this.metrics.incrementCounter('akamai_mcp_requests_total', 1, {
          method,
          customer: customer || 'default',
          status,
        });

        this.metrics.recordHistogram('akamai_mcp_request_duration_seconds', duration / 1000, {
          method,
          customer: customer || 'default',
        });

        // Log event
        this.debug.logEvent(
          error ? 'error' : 'info',
          'mcp-request',
          `MCP ${method} ${status}`,
          {
            duration,
            error: error?.message,
            responseSize: response ? JSON.stringify(response).length : 0,
          },
          'mcp-server',
          traceId,
          spanId,
        );
      },
    };
  }

  /**
   * Instrument Akamai API request/response cycle
   */
  instrumentAkamaiAPIRequest(
    service: string,
    endpoint: string,
    customer: string,
    metadata?: Record<string, any>,
  ): {
    traceId: string;
    spanId: string;
    finish: (error?: Error, response?: any) => void;
  } {
    const traceId = this.generateTraceId();
    const startTime = performance.now();

    // Start trace
    this.debug.startTrace(traceId, {
      service: 'akamai-api',
      endpoint,
      customer,
      ...metadata,
    });

    // Start span
    const spanId = this.debug.startSpan(traceId, `${service}.${endpoint}`, undefined, {
      'akamai.service': service,
      'akamai.endpoint': endpoint,
      'akamai.customer': customer,
    });

    return {
      traceId,
      spanId,
      finish: (error?: Error, response?: any) => {
        const duration = performance.now() - startTime;
        const status = error ? 'error' : 'success';

        // Finish span
        this.debug.finishSpan(traceId, spanId, error, {
          'akamai.status': status,
          'akamai.response_size': response ? JSON.stringify(response).length : 0,
        });

        // Record metrics
        this.metrics.incrementCounter('akamai_api_requests_total', 1, {
          service,
          endpoint,
          customer,
          status,
        });

        this.metrics.recordHistogram('akamai_api_request_duration_seconds', duration / 1000, {
          service,
          endpoint,
          customer,
        });

        // Log event
        this.debug.logEvent(
          error ? 'error' : 'info',
          'akamai-api',
          `Akamai ${service} ${endpoint} ${status}`,
          { duration, _error: error?.message },
          'akamai-client',
          traceId,
          spanId,
        );
      },
    };
  }

  /**
   * Add streaming connection for real-time monitoring
   */
  addStreamingConnection(
    type: 'websocket' | 'sse' | 'webhook',
    url: string,
    filters?: any,
  ): string {
    const connection: Omit<StreamingConnection, 'id' | 'lastActivity' | 'active'> = {
      type,
      url,
      filters: filters || {},
      send: async (data) => {
        // Implementation would depend on connection type
        console.log('Streaming data:', data);
      },
      close: () => {
        console.log('Closing streaming connection');
      },
    };

    return this.debug.addStreamingConnection(connection);
  }

  /**
   * Get comprehensive observability statistics
   */
  getStats(): ObservabilityStats {
    const debugStats = this.debug.getStatistics();
    const healthStatus = this.diagnostics.getHealthStatus();
    const telemetryStats = this.telemetry.getStats();

    return {
      uptime: Date.now() - this.startTime,
      metrics: {
        total: Object.keys(this.metrics.getMetricsSnapshot()).length,
        definitions: 0, // Would track metric definitions
        collectors: 0, // Would track active collectors
        pushTargets: 0, // Would track push targets
      },
      debugging: {
        events: debugStats.events.total,
        traces: debugStats.traces.total,
        subscriptions: debugStats.subscriptions.active,
        streamingConnections: debugStats.connections.active,
      },
      diagnostics: {
        healthChecks: healthStatus.summary.total,
        alertRules: 0, // Would track alert rules
        activeAlerts: this.diagnostics.getAlerts({ acknowledged: false }).length,
        lastHealthCheck: Math.max(...healthStatus.checks.map((c) => c.lastCheck)),
      },
      telemetry: {
        destinations: Object.keys(telemetryStats.destinations).length,
        totalExports: telemetryStats.totalExports,
        successfulExports: telemetryStats.successfulExports,
        failedExports: telemetryStats.failedExports,
        lastExport: telemetryStats.lastExport,
      },
    };
  }

  /**
   * Generate health report
   */
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical' | 'unknown';
    observability: ObservabilityStats;
    systemDiagnostics: SystemDiagnostics | null;
    healthChecks: ReturnType<DiagnosticsAPI['getHealthStatus']>;
    recentAlerts: any[];
    recommendations: string[];
  }> {
    const stats = this.getStats();
    const systemDiagnostics = this.diagnostics.getCurrentDiagnostics();
    const healthChecks = this.diagnostics.getHealthStatus();
    const recentAlerts = this.diagnostics.getAlerts({ since: Date.now() - 3600000 });

    // Generate recommendations
    const recommendations: string[] = [];

    if (healthChecks.summary.critical > 0) {
      recommendations.push(
        `Address ${healthChecks.summary.critical} critical health check failures`,
      );
    }

    if (stats.telemetry.failedExports > stats.telemetry.successfulExports * 0.1) {
      recommendations.push('High telemetry export failure rate detected');
    }

    if (stats.debugging.events > 10000) {
      recommendations.push('High number of debug events - consider adjusting log levels');
    }

    if (recommendations.length === 0) {
      recommendations.push('Observability stack is operating normally');
    }

    return {
      overall: healthChecks.overall,
      observability: stats,
      systemDiagnostics,
      healthChecks,
      recentAlerts,
      recommendations,
    };
  }

  /**
   * Test all telemetry destinations
   */
  async testAllDestinations(): Promise<Record<string, { success: boolean; error?: string }>> {
    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [name] of this.telemetry['destinations']) {
      try {
        await this.telemetry.testDestination(name);
        results[name] = { success: true };
      } catch (_error) {
        results[name] = {
          success: false,
          error: _error instanceof Error ? _error.message : 'Unknown error',
        };
      }
    }

    return results;
  }

  /**
   * Export all observability data
   */
  async exportObservabilityData(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    const stats = this.getStats();
    const healthReport = await this.generateHealthReport();

    if (format === 'json') {
      return JSON.stringify(
        {
          timestamp: Date.now(),
          stats,
          healthReport,
          metrics: this.metrics.getMetricsSnapshot(),
          recentEvents: this.debug.getRecentEvents(100),
          recentTraces: this.debug.getRecentTraces(10),
        },
        null,
        2,
      );
    } else {
      return this.metrics.exportPrometheus();
    }
  }

  /**
   * Stop the observability stack
   */
  stop(): void {
    this.instrumentationActive = false;

    this.telemetry.stop();
    this.diagnostics.stop();
    this.debug.stop();
    this.metrics.stop();

    this.emit('stopped');
  }

  private generateTraceId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

/**
 * Factory for creating pre-configured observability stacks
 */
export class ObservabilityFactory {
  /**
   * Create development observability stack
   */
  static createDevelopment(): ObservabilityStack {
    const config: ObservabilityConfig = {
      metrics: {
        enabled: true,
        pushIntervalMs: 10000,
        maxHistory: 1000,
        enableSystemMetrics: true,
      },
      debugging: {
        enabled: true,
        maxEvents: 5000,
        maxTraces: 500,
        traceRetentionMs: 1800000, // 30 minutes
        enableStackTraces: true,
      },
      diagnostics: {
        enabled: true,
        healthCheckIntervalMs: 30000,
        diagnosticsIntervalMs: 60000,
        enablePerformanceMonitoring: true,
      },
      telemetry: {
        enabled: false, // Disabled in development
        destinations: [],
        batchExportIntervalMs: 60000,
      },
      general: {
        enableRealTimeStreaming: true,
        enableAlerts: true,
        logLevel: 'debug',
      },
    };

    return new ObservabilityStack(config);
  }

  /**
   * Create production observability stack
   */
  static createProduction(destinations: TelemetryDestination[]): ObservabilityStack {
    const config: ObservabilityConfig = {
      metrics: {
        enabled: true,
        pushIntervalMs: 15000,
        maxHistory: 10000,
        enableSystemMetrics: true,
      },
      debugging: {
        enabled: true,
        maxEvents: 50000,
        maxTraces: 5000,
        traceRetentionMs: 3600000, // 1 hour
        enableStackTraces: false, // Disabled for performance
      },
      diagnostics: {
        enabled: true,
        healthCheckIntervalMs: 10000,
        diagnosticsIntervalMs: 30000,
        enablePerformanceMonitoring: true,
      },
      telemetry: {
        enabled: true,
        destinations,
        batchExportIntervalMs: 30000,
        maxRetryAttempts: 3,
      },
      general: {
        enableRealTimeStreaming: false, // Disabled for performance
        enableAlerts: true,
        logLevel: 'info',
      },
    };

    return new ObservabilityStack(config);
  }

  /**
   * Create minimal observability stack for resource-constrained environments
   */
  static createMinimal(): ObservabilityStack {
    const config: ObservabilityConfig = {
      metrics: {
        enabled: true,
        pushIntervalMs: 60000,
        maxHistory: 1000,
        enableSystemMetrics: false,
      },
      debugging: {
        enabled: true,
        maxEvents: 1000,
        maxTraces: 100,
        traceRetentionMs: 600000, // 10 minutes
        enableStackTraces: false,
      },
      diagnostics: {
        enabled: true,
        healthCheckIntervalMs: 60000,
        diagnosticsIntervalMs: 120000,
        enablePerformanceMonitoring: false,
      },
      telemetry: {
        enabled: false,
        destinations: [],
      },
      general: {
        enableRealTimeStreaming: false,
        enableAlerts: false,
        logLevel: 'warn',
      },
    };

    return new ObservabilityStack(config);
  }
}

// Export all components and types
export {
  MetricsAPI,
  DebugAPI,
  DiagnosticsAPI,
  TelemetryExporter,
  DestinationFactory,
  HTTPPushTarget,
  SystemMetricsCollector,
};

export * from './metrics-api';
export * from './debug-api';
export * from './diagnostics-api';
export * from './telemetry-exporter';

export default ObservabilityStack;
