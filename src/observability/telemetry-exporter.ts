/**
 * Telemetry Exporter - Push telemetry to external observability platforms
 * Supports Prometheus, Grafana, DataDog, New Relic, and custom webhook endpoints
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

import { type DebugEvent, type RequestTrace } from './debug-api';
import type DebugAPI from './debug-api';
import { type SystemDiagnostics, type HealthCheck, type DiagnosticAlert } from './diagnostics-api';
import type DiagnosticsAPI from './diagnostics-api';
import type MetricsAPI from './metrics-api';

export interface TelemetryDestination {
  name: string;
  type: 'prometheus' | 'grafana' | 'datadog' | 'newrelic' | 'webhook' | 'custom';
  enabled: boolean;
  config: {
    url: string;
    authentication?: {
      type: 'bearer' | 'basic' | 'api-key' | 'custom';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      headers?: Record<string, string>;
    };
    format?: 'json' | 'prometheus' | 'statsd' | 'opentelemetry';
    batchSize?: number;
    flushIntervalMs?: number;
    retryAttempts?: number;
    timeout?: number;
    compression?: boolean;
    customTransform?: (data: any) => any;
  };
}

export interface TelemetryBatch {
  id: string;
  destination: string;
  timestamp: number;
  metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
    tags: Record<string, string>;
    type: string;
  }>;
  events: DebugEvent[];
  traces: RequestTrace[];
  diagnostics?: SystemDiagnostics;
  healthChecks?: HealthCheck[];
  alerts?: DiagnosticAlert[];
}

export interface ExportResult {
  destination: string;
  success: boolean;
  timestamp: number;
  recordsExported: number;
  duration: number;
  error?: Error;
  retryAttempt?: number;
}

export interface TelemetryStats {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalRecords: number;
  averageLatency: number;
  lastExport?: number;
  destinations: Record<
    string,
    {
      exports: number;
      successes: number;
      failures: number;
      lastSuccess?: number;
      lastFailure?: number;
      averageLatency: number;
    }
  >;
}

export class TelemetryExporter extends EventEmitter {
  private destinations: Map<string, TelemetryDestination> = new Map();
  private batches: Map<string, TelemetryBatch> = new Map();
  private exportQueue: Array<{ batchId: string; retryCount: number }> = [];
  private stats: TelemetryStats = {
    totalExports: 0,
    successfulExports: 0,
    failedExports: 0,
    totalRecords: 0,
    averageLatency: 0,
    destinations: {},
  };
  private flushInterval: NodeJS.Timeout | null = null;
  private queueProcessor: NodeJS.Timeout | null = null;

  constructor(
    private metricsAPI: MetricsAPI,
    private debugAPI: DebugAPI,
    private diagnosticsAPI: DiagnosticsAPI,
    private config: {
      defaultBatchSize?: number;
      defaultFlushIntervalMs?: number;
      maxQueueSize?: number;
      processingIntervalMs?: number;
      maxRetryAttempts?: number;
      enableCompression?: boolean;
    } = {},
  ) {
    super();
    this.config = {
      defaultBatchSize: 100,
      defaultFlushIntervalMs: 30000, // 30 seconds
      maxQueueSize: 1000,
      processingIntervalMs: 1000, // 1 second
      maxRetryAttempts: 3,
      enableCompression: false,
      ...config,
    };

    this.startProcessing();
  }

  /**
   * Add telemetry destination
   */
  addDestination(destination: TelemetryDestination): void {
    this.destinations.set(destination.name, destination);

    if (!this.stats.destinations[destination.name]) {
      this.stats.destinations[destination.name] = {
        exports: 0,
        successes: 0,
        failures: 0,
        averageLatency: 0,
      };
    }

    this.emit('destinationAdded', destination);
  }

  /**
   * Remove telemetry destination
   */
  removeDestination(name: string): void {
    this.destinations.delete(name);
    this.emit('destinationRemoved', name);
  }

  /**
   * Update destination configuration
   */
  updateDestination(name: string, updates: Partial<TelemetryDestination>): boolean {
    const destination = this.destinations.get(name);
    if (!destination) {
return false;
}

    Object.assign(destination, updates);
    this.emit('destinationUpdated', name, destination);
    return true;
  }

  /**
   * Enable/disable destination
   */
  setDestinationEnabled(name: string, enabled: boolean): boolean {
    const destination = this.destinations.get(name);
    if (!destination) {
return false;
}

    destination.enabled = enabled;
    this.emit('destinationToggled', name, enabled);
    return true;
  }

  /**
   * Export current telemetry data to all enabled destinations
   */
  async exportAll(): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const enabledDestinations = Array.from(this.destinations.values()).filter((d) => d.enabled);

    for (const destination of enabledDestinations) {
      try {
        const result = await this.exportToDestination(destination);
        results.push(result);
      } catch (_error) {
        const result: ExportResult = {
          destination: destination.name,
          success: false,
          timestamp: Date.now(),
          recordsExported: 0,
          duration: 0,
          error: error as Error,
        };
        results.push(result);
        this.emit('exportError', destination.name, _error);
      }
    }

    return results;
  }

  /**
   * Export to specific destination
   */
  async exportToDestination(destination: TelemetryDestination): Promise<ExportResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      // Collect data from all sources
      const metrics = this.collectMetrics();
      const events = this.collectEvents();
      const traces = this.collectTraces();
      const diagnostics = await this.collectDiagnostics();
      const healthChecks = this.collectHealthChecks();
      const alerts = this.collectAlerts();

      // Create batch
      const batch: TelemetryBatch = {
        id: this.generateId(),
        destination: destination.name,
        timestamp,
        metrics,
        events,
        traces,
        diagnostics,
        healthChecks,
        alerts,
      };

      // Transform data based on destination format
      const transformedData = await this.transformData(batch, destination);

      // Send to destination
      await this.sendToDestination(transformedData, destination);

      const duration = performance.now() - startTime;
      const recordsExported =
        metrics.length +
        events.length +
        traces.length +
        (healthChecks?.length || 0) +
        (alerts?.length || 0);

      // Update stats
      this.updateStats(destination.name, true, duration, recordsExported);

      const result: ExportResult = {
        destination: destination.name,
        success: true,
        timestamp,
        recordsExported,
        duration,
      };

      this.emit('exportSuccess', result);
      return result;
    } catch (_error) {
      const duration = performance.now() - startTime;
      this.updateStats(destination.name, false, duration, 0);

      const result: ExportResult = {
        destination: destination.name,
        success: false,
        timestamp,
        recordsExported: 0,
        duration,
        error: error as Error,
      };

      this.emit('exportError', result);
      throw _error;
    }
  }

  /**
   * Start background export with batching
   */
  startBatchExport(intervalMs?: number): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    const interval = intervalMs || this.config.defaultFlushIntervalMs || 30000;

    this.flushInterval = setInterval(async () => {
      try {
        await this.exportAll();
      } catch (_error) {
        this.emit('batchExportError', _error);
      }
    }, interval);

    this.emit('batchExportStarted', interval);
  }

  /**
   * Stop background export
   */
  stopBatchExport(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.emit('batchExportStopped');
  }

  /**
   * Get export statistics
   */
  getStats(): TelemetryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      totalRecords: 0,
      averageLatency: 0,
      destinations: {},
    };

    for (const destination of this.destinations.keys()) {
      this.stats.destinations[destination] = {
        exports: 0,
        successes: 0,
        failures: 0,
        averageLatency: 0,
      };
    }

    this.emit('statsReset');
  }

  /**
   * Test connection to destination
   */
  async testDestination(name: string): Promise<boolean> {
    const destination = this.destinations.get(name);
    if (!destination) {
      throw new Error(`Destination not found: ${name}`);
    }

    try {
      // Create minimal test batch
      const testBatch: TelemetryBatch = {
        id: 'test-' + this.generateId(),
        destination: name,
        timestamp: Date.now(),
        metrics: [
          {
            name: 'test_metric',
            value: 1,
            timestamp: Date.now(),
            tags: { test: 'true' },
            type: 'gauge',
          },
        ],
        events: [],
        traces: [],
      };

      const transformedData = await this.transformData(testBatch, destination);
      await this.sendToDestination(transformedData, destination);

      this.emit('destinationTestSuccess', name);
      return true;
    } catch (_error) {
      this.emit('destinationTestFailure', name, _error);
      throw _error;
    }
  }

  /**
   * Get destination status
   */
  getDestinationStatus(name: string): {
    configured: boolean;
    enabled: boolean;
    lastSuccess?: number;
    lastFailure?: number;
    stats: TelemetryStats['destinations'][string];
  } {
    const destination = this.destinations.get(name);
    const stats = this.stats.destinations[name] || {
      exports: 0,
      successes: 0,
      failures: 0,
      averageLatency: 0,
    };

    return {
      configured: !!destination,
      enabled: destination?.enabled || false,
      lastSuccess: stats.lastSuccess,
      lastFailure: stats.lastFailure,
      stats,
    };
  }

  /**
   * Stop the telemetry exporter
   */
  stop(): void {
    this.stopBatchExport();

    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }

    this.emit('stopped');
  }

  private collectMetrics(): TelemetryBatch['metrics'] {
    const snapshot = this.metricsAPI.getMetricsSnapshot();
    const metrics: TelemetryBatch['metrics'] = [];

    for (const [name, values] of Object.entries(snapshot)) {
      for (const value of values) {
        metrics.push({
          name,
          value: value.value,
          timestamp: value.timestamp,
          tags: value.labels,
          type: 'gauge', // Would be determined from metric definition
        });
      }
    }

    return metrics;
  }

  private collectEvents(): DebugEvent[] {
    return this.debugAPI.getRecentEvents(1000);
  }

  private collectTraces(): RequestTrace[] {
    return this.debugAPI.getRecentTraces(100);
  }

  private async collectDiagnostics(): Promise<SystemDiagnostics | undefined> {
    return this.diagnosticsAPI.getCurrentDiagnostics() || undefined;
  }

  private collectHealthChecks(): HealthCheck[] {
    return this.diagnosticsAPI.getHealthStatus().checks;
  }

  private collectAlerts(): DiagnosticAlert[] {
    return this.diagnosticsAPI.getAlerts({ acknowledged: false });
  }

  private async transformData(
    batch: TelemetryBatch,
    destination: TelemetryDestination,
  ): Promise<any> {
    const format = destination.config.format || 'json';

    switch (destination.type) {
      case 'prometheus':
        return this.transformForPrometheus(batch);
      case 'datadog':
        return this.transformForDataDog(batch);
      case 'newrelic':
        return this.transformForNewRelic(batch);
      case 'grafana':
        return this.transformForGrafana(batch);
      case 'webhook':
      case 'custom':
        if (destination.config.customTransform) {
          return destination.config.customTransform(batch);
        }
        return this.transformForGeneric(batch, format);
      default:
        return this.transformForGeneric(batch, format);
    }
  }

  private transformForPrometheus(batch: TelemetryBatch): string {
    const lines: string[] = [];

    for (const metric of batch.metrics) {
      const labelStr = Object.entries(metric.tags)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');

      const labelPart = labelStr ? `{${labelStr}}` : '';
      lines.push(`${metric.name}${labelPart} ${metric.value} ${metric.timestamp}`);
    }

    return lines.join('\n');
  }

  private transformForDataDog(batch: TelemetryBatch): any {
    return {
      series: batch.metrics.map((metric) => ({
        metric: metric.name,
        points: [[Math.floor(metric.timestamp / 1000), metric.value]],
        type: metric.type,
        tags: Object.entries(metric.tags).map(([k, v]) => `${k}:${v}`),
      })),
      events: batch.events.map((event) => ({
        title: event.category,
        text: event.message,
        date_happened: Math.floor(event.timestamp / 1000),
        priority: event.level === 'error' ? 'normal' : 'low',
        tags: [`source:${event.source}`, `level:${event.level}`],
        alert_type: event.level === 'error' ? 'error' : 'info',
      })),
    };
  }

  private transformForNewRelic(batch: TelemetryBatch): any {
    return [
      {
        common: {
          timestamp: batch.timestamp,
          attributes: {
            service: 'alecs-mcp-akamai-server',
            version: '1.0.0',
          },
        },
        metrics: batch.metrics.map((metric) => ({
          name: metric.name,
          type: metric.type,
          value: metric.value,
          timestamp: metric.timestamp,
          attributes: metric.tags,
        })),
      },
    ];
  }

  private transformForGrafana(batch: TelemetryBatch): any {
    return batch.metrics.map((metric) => ({
      target: metric.name,
      datapoints: [[metric.value, metric.timestamp]],
      tags: metric.tags,
    ));
  }

  private transformForGeneric(batch: TelemetryBatch, format: string): any {
    switch (format) {
      case 'statsd':
        return batch.metrics
          .map((metric) => {
            const tags = Object.entries(metric.tags)
              .map(([k, v]) => `${k}:${v}`)
              .join(',');
            return `${metric.name}:${metric.value}|g|#${tags}`;
          })
          .join('\n');

      case 'opentelemetry':
        return {
          resourceMetrics: [
            {
              resource: {
                attributes: [
                  { key: 'service.name', value: { stringValue: 'alecs-mcp-akamai-server' } },
                  { key: 'service.version', value: { stringValue: '1.0.0' } },
                ],
              },
              scopeMetrics: [
                {
                  metrics: batch.metrics.map((metric) => ({
                    name: metric.name,
                    description: `Metric ${metric.name}`,
                    gauge: {
                      dataPoints: [
                        {
                          attributes: Object.entries(metric.tags).map(([k, v]) => ({
                            key: k,
                            value: { stringValue: v },
                          })),
                          timeUnixNano: (metric.timestamp * 1000000).toString(),
                          asDouble: metric.value,
                        },
                      ],
                    },
                  })),
                },
              ],
            },
          ],
        };

      default:
        return batch;
    }
  }

  private async sendToDestination(data: any, destination: TelemetryDestination): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': this.getContentType(destination),
      'User-Agent': 'Akamai-MCP-Telemetry-Exporter/1.0.0',
    };

    // Add authentication headers
    if (destination.config.authentication) {
      const auth = destination.config.authentication;
      switch (auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${auth.token}`;
          break;
        case 'basic': {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
        }
        case 'api-key':
          headers['X-API-Key'] = auth.apiKey!;
          break;
        case 'custom':
          Object.assign(headers, auth.headers || {});
          break;
      }
    }

    const body = typeof data === 'string' ? data : JSON.stringify(data);

    // Add compression if enabled
    if (destination.config.compression) {
      headers['Content-Encoding'] = 'gzip';
      // Would compress body here
    }

    const timeout = destination.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(destination.config.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (_error) {
      clearTimeout(timeoutId);
      throw _error;
    }
  }

  private getContentType(destination: TelemetryDestination): string {
    switch (destination.type) {
      case 'prometheus':
        return 'text/plain';
      case 'datadog':
      case 'newrelic':
      case 'grafana':
        return 'application/json';
      default:
        return destination.config.format === 'prometheus' ? 'text/plain' : 'application/json';
    }
  }

  private updateStats(
    destinationName: string,
    success: boolean,
    duration: number,
    recordCount: number,
  ): void {
    this.stats.totalExports++;
    this.stats.totalRecords += recordCount;

    if (success) {
      this.stats.successfulExports++;
      this.stats.lastExport = Date.now();
    } else {
      this.stats.failedExports++;
    }

    // Update average latency
    const totalLatency = this.stats.averageLatency * (this.stats.totalExports - 1) + duration;
    this.stats.averageLatency = totalLatency / this.stats.totalExports;

    // Update destination stats
    if (!this.stats.destinations[destinationName]) {
      this.stats.destinations[destinationName] = {
        exports: 0,
        successes: 0,
        failures: 0,
        averageLatency: 0,
      };
    }

    const destStats = this.stats.destinations[destinationName];
    destStats.exports++;

    if (success) {
      destStats.successes++;
      destStats.lastSuccess = Date.now();
    } else {
      destStats.failures++;
      destStats.lastFailure = Date.now();
    }

    // Update destination average latency
    const destTotalLatency = destStats.averageLatency * (destStats.exports - 1) + duration;
    destStats.averageLatency = destTotalLatency / destStats.exports;
  }

  private startProcessing(): void {
    this.queueProcessor = setInterval(() => {
      this.processExportQueue();
    }, this.config.processingIntervalMs || 1000);
  }

  private async processExportQueue(): Promise<void> {
    if (this.exportQueue.length === 0) {
return;
}

    const item = this.exportQueue.shift();
    if (!item) {
return;
}

    const batch = this.batches.get(item.batchId);
    if (!batch) {
return;
}

    const destination = this.destinations.get(batch.destination);
    if (!destination?.enabled) {
      this.batches.delete(item.batchId);
      return;
    }

    try {
      await this.exportToDestination(destination);
      this.batches.delete(item.batchId);
    } catch (_error) {
      if (item.retryCount < (this.config.maxRetryAttempts || 3)) {
        // Retry with exponential backoff
        setTimeout(
          () => {
            this.exportQueue.push({
              batchId: item.batchId,
              retryCount: item.retryCount + 1,
            });
          },
          Math.pow(2, item.retryCount) * 1000,
        );
      } else {
        // Max retries exceeded
        this.batches.delete(item.batchId);
        this.emit('exportFailed', batch.destination, _error);
      }
    }
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

/**
 * Pre-configured destination factories
 */
export class DestinationFactory {
  /**
   * Create Prometheus Push Gateway destination
   */
  static createPrometheus(
    name: string,
    pushGatewayUrl: string,
    job = 'alecs-mcp-akamai',
    instance?: string,
  ): TelemetryDestination {
    const url = `${pushGatewayUrl}/metrics/job/${job}${instance ? `/instance/${instance}` : ''}`;

    return {
      name,
      type: 'prometheus',
      enabled: true,
      config: {
        url,
        format: 'prometheus',
        batchSize: 100,
        flushIntervalMs: 15000,
      },
    };
  }

  /**
   * Create DataDog destination
   */
  static createDataDog(name: string, apiKey: string, site = 'datadoghq.com'): TelemetryDestination {
    return {
      name,
      type: 'datadog',
      enabled: true,
      config: {
        url: `https://api.${site}/api/v1/series`,
        authentication: {
          type: 'api-key',
          headers: { 'DD-API-KEY': apiKey },
        },
        format: 'json',
        batchSize: 100,
        flushIntervalMs: 30000,
      },
    };
  }

  /**
   * Create New Relic destination
   */
  static createNewRelic(
    name: string,
    licenseKey: string,
    region: 'US' | 'EU' = 'US',
  ): TelemetryDestination {
    const baseUrl = region === 'EU' ? 'metric-api.eu.newrelic.com' : 'metric-api.newrelic.com';

    return {
      name,
      type: 'newrelic',
      enabled: true,
      config: {
        url: `https://${baseUrl}/metric/v1`,
        authentication: {
          type: 'api-key',
          headers: { 'Api-Key': licenseKey },
        },
        format: 'json',
        batchSize: 50,
        flushIntervalMs: 30000,
      },
    };
  }

  /**
   * Create Grafana Cloud destination
   */
  static createGrafanaCloud(
    name: string,
    userId: string,
    apiKey: string,
    instanceUrl: string,
  ): TelemetryDestination {
    return {
      name,
      type: 'grafana',
      enabled: true,
      config: {
        url: `${instanceUrl}/api/v1/push`,
        authentication: {
          type: 'basic',
          username: userId,
          password: apiKey,
        },
        format: 'json',
        batchSize: 100,
        flushIntervalMs: 30000,
      },
    };
  }

  /**
   * Create custom webhook destination
   */
  static createWebhook(
    name: string,
    url: string,
    authentication?: TelemetryDestination['config']['authentication'],
    format: 'json' | 'prometheus' | 'statsd' = 'json',
  ): TelemetryDestination {
    return {
      name,
      type: 'webhook',
      enabled: true,
      config: {
        url,
        authentication,
        format,
        batchSize: 100,
        flushIntervalMs: 30000,
      },
    };
  }
}

export default TelemetryExporter;
