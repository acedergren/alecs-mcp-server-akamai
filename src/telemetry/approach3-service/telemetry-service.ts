/**
 * Approach 3: Service-based OpenTelemetry Implementation
 * 
 * This approach encapsulates all telemetry functionality in a dedicated service
 * that can be injected and used throughout the application.
 */

import {
  trace,
  context,
  metrics,
  SpanStatusCode,
  SpanKind,
  Tracer,
  Meter,
  Span,
  Context,
  Attributes,
  TimeInput,
  propagation
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader, MeterProvider, View, Aggregation } from '@opentelemetry/sdk-metrics';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core';

export interface TelemetryServiceConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  enableConsoleExporter?: boolean;
  samplingRate?: number;
  attributes?: Record<string, string>;
}

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Attributes;
  links?: any[];
  startTime?: TimeInput;
}

export interface MetricLabels {
  [key: string]: string | number;
}

export class TelemetryService {
  private tracer: Tracer;
  private meter: Meter;
  private resource: Resource;
  private activeSpans: Map<string, Span> = new Map();
  
  // Metrics
  private requestDuration;
  private requestCounter;
  private errorCounter;
  private activeRequests;
  private cacheHitRatio;
  private apiLatency;
  private queueDepth;
  
  constructor(private config: TelemetryServiceConfig) {
    this.resource = this.createResource();
    this.initializeTracing();
    this.initializeMetrics();
    this.setupAutoinstrumentation();
    
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    this.meter = metrics.getMeter(config.serviceName, config.serviceVersion);
    this.initializeMetricInstruments();
  }
  
  private createResource(): Resource {
    return new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'local',
      [SemanticResourceAttributes.PROCESS_PID]: process.pid,
      [SemanticResourceAttributes.PROCESS_RUNTIME_NAME]: 'nodejs',
      [SemanticResourceAttributes.PROCESS_RUNTIME_VERSION]: process.version,
      ...this.config.attributes
    });
  }
  
  private initializeTracing(): void {
    const provider = new NodeTracerProvider({
      resource: this.resource,
      sampler: {
        shouldSample: () => ({
          decision: Math.random() < (this.config.samplingRate || 1) ? 1 : 0,
          attributes: {}
        })
      }
    });
    
    // OTLP Exporter
    if (this.config.otlpEndpoint) {
      const otlpExporter = new OTLPTraceExporter({
        url: `${this.config.otlpEndpoint}/v1/traces`,
        headers: {
          'x-service-name': this.config.serviceName
        }
      });
      provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));
    }
    
    // Jaeger Exporter
    if (this.config.jaegerEndpoint) {
      const jaegerExporter = new JaegerExporter({
        endpoint: this.config.jaegerEndpoint,
        tags: [
          { key: 'service.version', value: this.config.serviceVersion }
        ]
      });
      provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
    }
    
    // Console Exporter for debugging
    if (this.config.enableConsoleExporter) {
      const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }
    
    provider.register();
    
    // Setup propagators
    propagation.setGlobalPropagator(
      new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator()
        ]
      })
    );
  }
  
  private initializeMetrics(): void {
    const readers = [];
    
    // OTLP Metric Exporter
    if (this.config.otlpEndpoint) {
      const otlpExporter = new OTLPMetricExporter({
        url: `${this.config.otlpEndpoint}/v1/metrics`,
        headers: {
          'x-service-name': this.config.serviceName
        }
      });
      
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: otlpExporter,
          exportIntervalMillis: 30000 // 30 seconds
        })
      );
    }
    
    // Prometheus Exporter
    if (this.config.prometheusPort) {
      const prometheusExporter = new PrometheusExporter({
        port: this.config.prometheusPort,
        endpoint: '/metrics'
      });
      readers.push(prometheusExporter);
    }
    
    const meterProvider = new MeterProvider({
      resource: this.resource,
      readers,
      views: [
        // Custom view for request duration buckets
        new View({
          instrumentName: 'alecs.request.duration',
          aggregation: Aggregation.ExplicitBucketHistogram(
            [0.1, 0.5, 1, 2, 5, 10, 30, 60]
          )
        })
      ]
    });
    
    metrics.setGlobalMeterProvider(meterProvider);
  }
  
  private setupAutoinstrumentation(): void {
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body.size': JSON.stringify(request).length,
              'alecs.instrumented': true
            });
          },
          responseHook: (span, response) => {
            span.setAttributes({
              'http.response.body.size': JSON.stringify(response).length
            });
          }
        })
      ]
    });
  }
  
  private initializeMetricInstruments(): void {
    this.requestDuration = this.meter.createHistogram('alecs.request.duration', {
      description: 'Request duration in seconds',
      unit: 's'
    });
    
    this.requestCounter = this.meter.createCounter('alecs.requests.total', {
      description: 'Total number of requests'
    });
    
    this.errorCounter = this.meter.createCounter('alecs.errors.total', {
      description: 'Total number of errors'
    });
    
    this.activeRequests = this.meter.createUpDownCounter('alecs.requests.active', {
      description: 'Number of active requests'
    });
    
    this.cacheHitRatio = this.meter.createHistogram('alecs.cache.hit_ratio', {
      description: 'Cache hit ratio',
      unit: '1'
    });
    
    this.apiLatency = this.meter.createHistogram('alecs.api.latency', {
      description: 'External API call latency',
      unit: 'ms'
    });
    
    this.queueDepth = this.meter.createObservableGauge('alecs.queue.depth', {
      description: 'Current queue depth'
    });
  }
  
  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        'alecs.span.created_at': new Date().toISOString(),
        ...options?.attributes
      },
      links: options?.links,
      startTime: options?.startTime
    });
    
    // Track active spans
    const spanId = span.spanContext().spanId;
    this.activeSpans.set(spanId, span);
    
    return span;
  }
  
  /**
   * Execute a function within a span context
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    
    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      span.end();
      this.activeSpans.delete(span.spanContext().spanId);
    }
  }
  
  /**
   * Record a metric value
   */
  recordMetric(
    metricName: 'requestDuration' | 'apiLatency' | 'cacheHitRatio',
    value: number,
    labels?: MetricLabels
  ): void {
    switch (metricName) {
      case 'requestDuration':
        this.requestDuration.record(value, labels);
        break;
      case 'apiLatency':
        this.apiLatency.record(value, labels);
        break;
      case 'cacheHitRatio':
        this.cacheHitRatio.record(value, labels);
        break;
    }
  }
  
  /**
   * Increment a counter
   */
  incrementCounter(
    counterName: 'requests' | 'errors',
    labels?: MetricLabels
  ): void {
    switch (counterName) {
      case 'requests':
        this.requestCounter.add(1, labels);
        break;
      case 'errors':
        this.errorCounter.add(1, labels);
        break;
    }
  }
  
  /**
   * Update active requests gauge
   */
  updateActiveRequests(delta: number, labels?: MetricLabels): void {
    this.activeRequests.add(delta, labels);
  }
  
  /**
   * Create a child span from current context
   */
  createChildSpan(name: string, options?: SpanOptions): Span {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return this.tracer.startSpan(name, {
        ...options,
        attributes: {
          'alecs.parent.span': currentSpan.spanContext().spanId,
          ...options?.attributes
        }
      });
    }
    return this.startSpan(name, options);
  }
  
  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Attributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }
  
  /**
   * Set attributes on current span
   */
  setAttributes(attributes: Attributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }
  
  /**
   * Extract context from headers
   */
  extractContext(headers: Record<string, string>): Context {
    return propagation.extract(context.active(), headers);
  }
  
  /**
   * Inject context into headers
   */
  injectContext(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
  }
  
  /**
   * Instrument an async function
   */
  instrument<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T,
    options?: SpanOptions
  ): T {
    return (async (...args: any[]) => {
      return this.withSpan(name, async (span) => {
        span.setAttribute('alecs.function.args', JSON.stringify(args).slice(0, 1000));
        const result = await fn(...args);
        span.setAttribute('alecs.function.result.type', typeof result);
        return result;
      }, options);
    }) as T;
  }
  
  /**
   * Shutdown telemetry
   */
  async shutdown(): Promise<void> {
    // End all active spans
    this.activeSpans.forEach(span => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Service shutting down' });
      span.end();
    });
    
    await Promise.all([
      trace.getTracerProvider().shutdown(),
      metrics.getMeterProvider()?.shutdown()
    ]);
  }
  
  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }
  
  /**
   * Health check for telemetry
   */
  isHealthy(): boolean {
    return this.activeSpans.size < 1000; // Arbitrary threshold
  }
}

/**
 * Singleton instance management
 */
let telemetryInstance: TelemetryService | null = null;

export function initializeTelemetryService(config: TelemetryServiceConfig): TelemetryService {
  if (telemetryInstance) {
    throw new Error('Telemetry service already initialized');
  }
  telemetryInstance = new TelemetryService(config);
  return telemetryInstance;
}

export function getTelemetryService(): TelemetryService {
  if (!telemetryInstance) {
    throw new Error('Telemetry service not initialized');
  }
  return telemetryInstance;
}

/**
 * Integration helper for ALECSCore
 */
export function integrateWithALECSCore(alecsCore: any): void {
  const telemetry = getTelemetryService();
  
  // Instrument tool execution
  alecsCore.on('tool:before', (event: any) => {
    const span = telemetry.startSpan(`tool.${event.toolName}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'tool.name': event.toolName,
        'customer': event.context.customer
      }
    });
    event.telemetrySpan = span;
    telemetry.updateActiveRequests(1, { tool: event.toolName });
  });
  
  alecsCore.on('tool:after', (event: any) => {
    if (event.telemetrySpan) {
      event.telemetrySpan.setStatus({ code: SpanStatusCode.OK });
      event.telemetrySpan.end();
      telemetry.updateActiveRequests(-1, { tool: event.toolName });
      telemetry.recordMetric('requestDuration', event.duration / 1000, {
        tool: event.toolName,
        success: 'true'
      });
    }
  });
  
  alecsCore.on('tool:error', (event: any) => {
    if (event.telemetrySpan) {
      event.telemetrySpan.recordException(event.error);
      event.telemetrySpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: event.error.message
      });
      event.telemetrySpan.end();
      telemetry.updateActiveRequests(-1, { tool: event.toolName });
      telemetry.incrementCounter('errors', {
        tool: event.toolName,
        error: event.error.constructor.name
      });
    }
  });
}