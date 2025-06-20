/**
 * Metrics API - Expose metrics in Prometheus format, OpenTelemetry, and custom formats
 * for external monitoring platforms with push-based delivery
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels: string[];
}

export interface PrometheusMetric {
  name: string;
  type: string;
  help: string;
  values: Array<{
    value: number;
    labels: Record<string, string>;
    timestamp?: number;
  }>;
}

export interface OpenTelemetryMetric {
  name: string;
  description: string;
  unit?: string;
  type: 'counter' | 'gauge' | 'histogram';
  dataPoints: Array<{
    value: number;
    attributes: Record<string, string | number>;
    timeUnixNano: string;
  }>;
}

export interface CustomMetricFormat {
  metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
    tags: Record<string, string>;
    type: string;
  }>;
  metadata: {
    source: string;
    version: string;
    interval: number;
  };
}

export class MetricsAPI extends EventEmitter {
  private metrics: Map<string, MetricValue[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private pushTargets: Map<string, PushTarget> = new Map();
  private collectors: Map<string, MetricCollector> = new Map();
  private pushInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      pushIntervalMs?: number;
      maxMetricHistory?: number;
      enableCompression?: boolean;
      retryAttempts?: number;
    } = {},
  ) {
    super();
    this.config = {
      pushIntervalMs: 15000, // 15 seconds default
      maxMetricHistory: 1000,
      enableCompression: true,
      retryAttempts: 3,
      ...config,
    };

    this.initializeBuiltInMetrics();
    this.startPushScheduler();
  }

  /**
   * Register a metric definition
   */
  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);

    if (!this.metrics.has(definition.name)) {
      this.metrics.set(definition.name, []);
    }

    this.emit('metricRegistered', definition);
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    const timestamp = Date.now();
    const metricValue: MetricValue = { value, timestamp, labels };

    const values = this.metrics.get(name) || [];
    values.push(metricValue);

    // Maintain history limit
    if (values.length > (this.config.maxMetricHistory || 1000)) {
      values.shift();
    }

    this.metrics.set(name, values);
    this.emit('metricRecorded', name, metricValue);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, increment = 1, labels: Record<string, string> = {}): void {
    const current = this.getLatestMetricValue(name, labels) || 0;
    this.recordMetric(name, current + increment, labels);
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    // For histogram, we record the raw value and let the export format handle bucketing
    this.recordMetric(name, value, { ...labels, _type: 'histogram' });

    // Also record count and sum for convenience
    this.incrementCounter(`${name}_count`, 1, labels);
    this.incrementCounter(`${name}_sum`, value, labels);
  }

  /**
   * Add push target for external monitoring
   */
  addPushTarget(name: string, target: PushTarget): void {
    this.pushTargets.set(name, target);
    this.emit('pushTargetAdded', name, target);
  }

  /**
   * Remove push target
   */
  removePushTarget(name: string): void {
    this.pushTargets.delete(name);
    this.emit('pushTargetRemoved', name);
  }

  /**
   * Add metric collector
   */
  addCollector(name: string, collector: MetricCollector): void {
    this.collectors.set(name, collector);
    this.emit('collectorAdded', name);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const prometheusMetrics: PrometheusMetric[] = [];

    for (const [name, values] of this.metrics.entries()) {
      const definition = this.definitions.get(name);
      if (!definition) {
continue;
}

      const metric: PrometheusMetric = {
        name: name.replace(/[^a-zA-Z0-9_]/g, '_'),
        type: definition.type,
        help: definition.help,
        values: values.map((v) => ({
          value: v.value,
          labels: v.labels,
          timestamp: v.timestamp,
        })),
      };

      prometheusMetrics.push(metric);
    }

    return this.formatPrometheusOutput(prometheusMetrics);
  }

  /**
   * Export metrics in OpenTelemetry format
   */
  exportOpenTelemetry(): OpenTelemetryMetric[] {
    const otMetrics: OpenTelemetryMetric[] = [];

    for (const [name, values] of this.metrics.entries()) {
      const definition = this.definitions.get(name);
      if (!definition) {
continue;
}

      const metric: OpenTelemetryMetric = {
        name,
        description: definition.help,
        type: definition.type === 'summary' ? 'histogram' : definition.type,
        dataPoints: values.map((v) => ({
          value: v.value,
          attributes: Object.entries(v.labels).reduce(
            (acc, [k, v]) => {
              acc[k] = v;
              return acc;
            },
            {} as Record<string, string | number>,
          ),
          timeUnixNano: (v.timestamp * 1000000).toString(),
        })),
      };

      otMetrics.push(metric);
    }

    return otMetrics;
  }

  /**
   * Export metrics in custom JSON format
   */
  exportCustomFormat(): CustomMetricFormat {
    const metrics = [];

    for (const [name, values] of this.metrics.entries()) {
      for (const value of values) {
        metrics.push({
          name,
          value: value.value,
          timestamp: value.timestamp,
          tags: value.labels,
          type: this.definitions.get(name)?.type || 'gauge',
        });
      }
    }

    return {
      metrics,
      metadata: {
        source: 'alecs-mcp-akamai-server',
        version: '1.0.0',
        interval: this.config.pushIntervalMs || 15000,
      },
    };
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot(): Record<string, MetricValue[]> {
    const snapshot: Record<string, MetricValue[]> = {};

    for (const [name, values] of this.metrics.entries()) {
      snapshot[name] = [...values];
    }

    return snapshot;
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByPattern(pattern: RegExp): Record<string, MetricValue[]> {
    const filtered: Record<string, MetricValue[]> = {};

    for (const [name, values] of this.metrics.entries()) {
      if (pattern.test(name)) {
        filtered[name] = [...values];
      }
    }

    return filtered;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.emit('metricsCleared');
  }

  /**
   * Clear metrics by name pattern
   */
  clearMetricsByPattern(pattern: RegExp): void {
    const toDelete = [];

    for (const name of this.metrics.keys()) {
      if (pattern.test(name)) {
        toDelete.push(name);
      }
    }

    for (const name of toDelete) {
      this.metrics.delete(name);
    }

    this.emit('metricsCleared', toDelete);
  }

  /**
   * Start metric collection from registered collectors
   */
  async collectMetrics(): Promise<void> {
    for (const [name, collector] of this.collectors.entries()) {
      try {
        const collectedMetrics = await collector.collect();

        for (const metric of collectedMetrics) {
          this.recordMetric(metric.name, metric.value, metric.labels);
        }

        this.emit('metricsCollected', name, collectedMetrics.length);
      } catch (_error) {
        this.emit('collectionError', name, _error);
      }
    }
  }

  /**
   * Push metrics to all configured targets
   */
  async pushMetrics(): Promise<void> {
    await this.collectMetrics();

    const pushPromises = [];

    for (const [name, target] of this.pushTargets.entries()) {
      const pushPromise = this.pushToTarget(name, target);
      pushPromises.push(pushPromise);
    }

    const results = await Promise.allSettled(pushPromises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const targetName = Array.from(this.pushTargets.keys())[i];

      if (result && result.status === 'rejected') {
        this.emit('pushError', targetName, result.reason);
      } else {
        this.emit('pushSuccess', targetName);
      }
    }
  }

  /**
   * Stop the metrics API
   */
  stop(): void {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
      this.pushInterval = null;
    }

    this.emit('stopped');
  }

  private initializeBuiltInMetrics(): void {
    // Built-in system metrics
    this.registerMetric({
      name: 'akamai_mcp_requests_total',
      type: 'counter',
      help: 'Total number of MCP requests',
      labels: ['method', 'customer', 'status'],
    });

    this.registerMetric({
      name: 'akamai_mcp_request_duration_seconds',
      type: 'histogram',
      help: 'Duration of MCP requests in seconds',
      labels: ['method', 'customer'],
    });

    this.registerMetric({
      name: 'akamai_mcp_active_connections',
      type: 'gauge',
      help: 'Number of active MCP connections',
      labels: ['customer'],
    });

    this.registerMetric({
      name: 'akamai_api_requests_total',
      type: 'counter',
      help: 'Total number of Akamai API requests',
      labels: ['service', 'endpoint', 'customer', 'status'],
    });

    this.registerMetric({
      name: 'akamai_api_request_duration_seconds',
      type: 'histogram',
      help: 'Duration of Akamai API requests in seconds',
      labels: ['service', 'endpoint', 'customer'],
    });

    this.registerMetric({
      name: 'akamai_api_rate_limit_remaining',
      type: 'gauge',
      help: 'Remaining API rate limit',
      labels: ['customer', 'endpoint'],
    });

    this.registerMetric({
      name: 'akamai_cache_hits_total',
      type: 'counter',
      help: 'Total number of cache hits',
      labels: ['cache_type'],
    });

    this.registerMetric({
      name: 'akamai_cache_size_bytes',
      type: 'gauge',
      help: 'Size of cache in bytes',
      labels: ['cache_type'],
    });
  }

  private startPushScheduler(): void {
    if (this.config.pushIntervalMs && this.config.pushIntervalMs > 0) {
      this.pushInterval = setInterval(() => {
        this.pushMetrics().catch((_error) => {
          this.emit('scheduledPushError', _error);
        });
      }, this.config.pushIntervalMs);
    }
  }

  private async pushToTarget(_name: string, target: PushTarget): Promise<void> {
    let data: string | object;
    let contentType: string;

    switch (target.format) {
      case 'prometheus':
        data = this.exportPrometheus();
        contentType = 'text/plain';
        break;
      case 'opentelemetry':
        data = { metrics: this.exportOpenTelemetry() };
        contentType = 'application/json';
        break;
      case 'json':
        data = this.exportCustomFormat();
        contentType = 'application/json';
        break;
      default:
        throw new Error(`Unsupported format: ${target.format}`);
    }

    await target.push(data, contentType);
  }

  private formatPrometheusOutput(metrics: PrometheusMetric[]): string {
    const lines: string[] = [];

    for (const metric of metrics) {
      // Add help and type
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Add values
      for (const value of metric.values) {
        const labelStr = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        const labelPart = labelStr ? `{${labelStr}}` : '';
        const timestampPart = value.timestamp ? ` ${value.timestamp}` : '';

        lines.push(`${metric.name}${labelPart} ${value.value}${timestampPart}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  private getLatestMetricValue(name: string, labels: Record<string, string>): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
return null;
}

    // Find the latest value with matching labels
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i];
      const labelsMatch = value && Object.entries(labels).every(([k, v]) => value.labels[k] === v);
      if (labelsMatch && value) {
        return value.value;
      }
    }

    return null;
  }
}

export interface PushTarget {
  name: string;
  url: string;
  format: 'prometheus' | 'opentelemetry' | 'json';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  push(data: string | object, contentType: string): Promise<void>;
}

export interface MetricCollector {
  name: string;
  collect(): Promise<
    Array<{
      name: string;
      value: number;
      labels: Record<string, string>;
    }>
  >;
}

/**
 * HTTP Push Target implementation
 */
export class HTTPPushTarget implements PushTarget {
  constructor(
    public name: string,
    public url: string,
    public format: 'prometheus' | 'opentelemetry' | 'json',
    public headers: Record<string, string> = {},
    public authentication?: {
      type: 'bearer' | 'basic' | 'api-key';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    },
  ) {}

  async push(data: string | object, contentType: string): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...this.headers,
    };

    // Add authentication headers
    if (this.authentication) {
      switch (this.authentication.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.authentication.token}`;
          break;
        case 'basic': {
          const credentials = Buffer.from(
            `${this.authentication.username}:${this.authentication.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
        }
        case 'api-key': {
          const keyHeader = this.authentication.apiKeyHeader || 'X-API-Key';
          headers[keyHeader] = this.authentication.apiKey!;
          break;
        }
      }
    }

    const body = typeof data === 'string' ? data : JSON.stringify(data);

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Push failed: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * System metrics collector
 */
export class SystemMetricsCollector implements MetricCollector {
  name = 'system';

  async collect(): Promise<Array<{ name: string; value: number; labels: Record<string, string> }>> {
    const metrics = [];

    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();

      metrics.push({
        name: 'nodejs_memory_usage_bytes',
        value: memUsage.heapUsed,
        labels: { type: 'heap_used' },
      });

      metrics.push({
        name: 'nodejs_memory_usage_bytes',
        value: memUsage.heapTotal,
        labels: { type: 'heap_total' },
      });

      metrics.push({
        name: 'nodejs_memory_usage_bytes',
        value: memUsage.external,
        labels: { type: 'external' },
      });

      metrics.push({
        name: 'nodejs_memory_usage_bytes',
        value: memUsage.rss,
        labels: { type: 'rss' },
      });
    }

    // Event loop lag
    const start = performance.now();
    setImmediate(() => {
      const lag = performance.now() - start;
      metrics.push({
        name: 'nodejs_eventloop_lag_seconds',
        value: lag / 1000,
        labels: {},
      });
    });

    return metrics;
  }
}

export default MetricsAPI;
