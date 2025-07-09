/**
 * Approach 5: Hybrid OpenTelemetry Implementation
 * 
 * This approach combines the best aspects of all previous approaches:
 * - Service-based core for centralized management
 * - Decorator support for fine-grained control
 * - Middleware integration for automatic instrumentation
 * - Plugin architecture for extensibility
 */

import {
  trace,
  metrics,
  context,
  SpanStatusCode,
  SpanKind,
  Tracer,
  Meter,
  Span,
  Context,
  Attributes,
  propagation
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

// Configuration interface
export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporters: ExporterConfig;
  sampling?: SamplingConfig;
  instrumentation?: InstrumentationConfig;
  plugins?: TelemetryPlugin[];
}

export interface ExporterConfig {
  otlp?: { endpoint: string; headers?: Record<string, string> };
  jaeger?: { endpoint: string };
  prometheus?: { port: number; path: string };
  console?: boolean;
}

export interface SamplingConfig {
  default: number;
  rules?: Array<{ pattern: string; rate: number }>;
}

export interface InstrumentationConfig {
  http?: boolean;
  cache?: boolean;
  tools?: boolean;
}

// Plugin interface for extensibility
export interface TelemetryPlugin {
  name: string;
  initialize(telemetry: HybridTelemetry): void;
  shutdown?(): Promise<void>;
}

// Core telemetry class
export class HybridTelemetry {
  private static instance: HybridTelemetry;
  
  private tracer: Tracer;
  private meter: Meter;
  private tracerProvider: NodeTracerProvider;
  private meterProvider: MeterProvider;
  private plugins: Map<string, TelemetryPlugin> = new Map();
  
  // Metrics
  private metrics = {
    requestDuration: null as any,
    requestCount: null as any,
    errorCount: null as any,
    activeRequests: null as any,
    cacheHitRatio: null as any,
    apiLatency: null as any
  };
  
  // Decorator metadata storage
  private decoratorMetadata = new WeakMap<any, any>();
  
  private constructor(private config: TelemetryConfig) {
    this.initializeProviders();
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    this.meter = metrics.getMeter(config.serviceName, config.serviceVersion);
    this.initializeMetrics();
    this.initializeInstrumentation();
    this.initializePlugins();
  }
  
  // Singleton pattern
  static initialize(config: TelemetryConfig): HybridTelemetry {
    if (!HybridTelemetry.instance) {
      HybridTelemetry.instance = new HybridTelemetry(config);
    }
    return HybridTelemetry.instance;
  }
  
  static getInstance(): HybridTelemetry {
    if (!HybridTelemetry.instance) {
      throw new Error('Telemetry not initialized. Call initialize() first.');
    }
    return HybridTelemetry.instance;
  }
  
  private initializeProviders(): void {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'local'
    });
    
    // Initialize tracer provider
    this.tracerProvider = new NodeTracerProvider({
      resource,
      sampler: this.createSampler()
    });
    
    this.setupExporters();
    this.tracerProvider.register();
    
    // Setup propagators
    propagation.setGlobalPropagator(
      new CompositePropagator({
        propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()]
      })
    );
    
    // Initialize meter provider
    this.meterProvider = new MeterProvider({ resource });
    this.setupMetricExporters();
    metrics.setGlobalMeterProvider(this.meterProvider);
  }
  
  private createSampler(): any {
    const config = this.config.sampling || { default: 1.0 };
    
    return {
      shouldSample: (context: Context, traceId: string, spanName: string) => {
        // Check custom rules
        if (config.rules) {
          for (const rule of config.rules) {
            if (spanName.match(rule.pattern)) {
              return {
                decision: Math.random() < rule.rate ? 1 : 0,
                attributes: { 'sampling.rule': rule.pattern }
              };
            }
          }
        }
        
        // Default sampling
        return {
          decision: Math.random() < config.default ? 1 : 0,
          attributes: {}
        };
      }
    };
  }
  
  private async setupExporters(): Promise<void> {
    const exporters = this.config.exporters;
    
    // Dynamic imports for exporters
    if (exporters.otlp) {
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      const exporter = new OTLPTraceExporter({
        url: `${exporters.otlp.endpoint}/v1/traces`,
        headers: exporters.otlp.headers
      });
      this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }
    
    if (exporters.jaeger) {
      const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
      const exporter = new JaegerExporter({ endpoint: exporters.jaeger.endpoint });
      this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }
    
    if (exporters.console) {
      const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-base');
      this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }
  }
  
  private async setupMetricExporters(): Promise<void> {
    const exporters = this.config.exporters;
    
    if (exporters.otlp) {
      const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
      const exporter = new OTLPMetricExporter({
        url: `${exporters.otlp.endpoint}/v1/metrics`,
        headers: exporters.otlp.headers
      });
      
      this.meterProvider.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis: 30000
        })
      );
    }
    
    if (exporters.prometheus) {
      const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus');
      const exporter = new PrometheusExporter({
        port: exporters.prometheus.port,
        endpoint: exporters.prometheus.path
      });
      this.meterProvider.addMetricReader(exporter);
    }
  }
  
  private initializeMetrics(): void {
    this.metrics.requestDuration = this.meter.createHistogram('alecs.request.duration', {
      description: 'Request duration in milliseconds',
      unit: 'ms'
    });
    
    this.metrics.requestCount = this.meter.createCounter('alecs.requests.total', {
      description: 'Total number of requests'
    });
    
    this.metrics.errorCount = this.meter.createCounter('alecs.errors.total', {
      description: 'Total number of errors'
    });
    
    this.metrics.activeRequests = this.meter.createUpDownCounter('alecs.requests.active', {
      description: 'Number of active requests'
    });
    
    this.metrics.cacheHitRatio = this.meter.createHistogram('alecs.cache.hit_ratio', {
      description: 'Cache hit ratio',
      unit: '1'
    });
    
    this.metrics.apiLatency = this.meter.createHistogram('alecs.api.latency', {
      description: 'External API call latency',
      unit: 'ms'
    });
  }
  
  private initializeInstrumentation(): void {
    const config = this.config.instrumentation || {};
    const instrumentations = [];
    
    if (config.http !== false) {
      instrumentations.push(
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttributes({
              'http.request.body.size': JSON.stringify(request).length,
              'alecs.instrumented': true
            });
          }
        })
      );
    }
    
    if (instrumentations.length > 0) {
      registerInstrumentations({ instrumentations });
    }
  }
  
  private initializePlugins(): void {
    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        plugin.initialize(this);
        this.plugins.set(plugin.name, plugin);
      }
    }
  }
  
  // Service-style API
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: { kind?: SpanKind; attributes?: Attributes }
  ): Promise<T> {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes
    });
    
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
        message: (error as Error).message
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  // Middleware integration
  createMiddleware() {
    return async (request: any, next: Function, context: any) => {
      const span = this.tracer.startSpan(`mcp.${request.method}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'mcp.method': request.method,
          'mcp.id': request.id,
          'alecs.customer': context.customer
        }
      });
      
      this.metrics.activeRequests.add(1);
      this.metrics.requestCount.add(1, { method: request.method });
      const startTime = Date.now();
      
      try {
        const result = await context.with(
          trace.setSpan(context.active(), span),
          () => next(request)
        );
        
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        
        this.metrics.errorCount.add(1, {
          method: request.method,
          error: (error as Error).constructor.name
        });
        
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        this.metrics.requestDuration.record(duration, { method: request.method });
        this.metrics.activeRequests.add(-1);
        span.setAttribute('duration.ms', duration);
        span.end();
      }
    };
  }
  
  // Decorator factory
  createDecorator(options: { name?: string; kind?: SpanKind } = {}) {
    const telemetry = this;
    
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const spanName = options.name || `${target.constructor.name}.${propertyKey}`;
      
      descriptor.value = async function (...args: any[]) {
        return telemetry.withSpan(
          spanName,
          async (span) => {
            // Store metadata for advanced use cases
            telemetry.decoratorMetadata.set(originalMethod, { span, args });
            
            span.setAttributes({
              'method.class': target.constructor.name,
              'method.name': propertyKey,
              'method.args.count': args.length
            });
            
            return originalMethod.apply(this, args);
          },
          { kind: options.kind || SpanKind.INTERNAL }
        );
      };
      
      return descriptor;
    };
  }
  
  // Manual instrumentation helpers
  startSpan(name: string, options?: any): Span {
    return this.tracer.startSpan(name, options);
  }
  
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }
  
  setSpanAttributes(attributes: Attributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }
  
  recordMetric(name: keyof typeof this.metrics, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics[name];
    if (metric && 'record' in metric) {
      metric.record(value, labels);
    } else if (metric && 'add' in metric) {
      metric.add(value, labels);
    }
  }
  
  // Context propagation
  extractContext(carrier: any): Context {
    return propagation.extract(context.active(), carrier);
  }
  
  injectContext(carrier: any): void {
    propagation.inject(context.active(), carrier);
  }
  
  // Plugin API
  getPlugin(name: string): TelemetryPlugin | undefined {
    return this.plugins.get(name);
  }
  
  // Shutdown
  async shutdown(): Promise<void> {
    // Shutdown plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.shutdown) {
        await plugin.shutdown();
      }
    }
    
    // Shutdown providers
    await Promise.all([
      this.tracerProvider.shutdown(),
      this.meterProvider.shutdown()
    ]);
  }
}

// Decorator exports for easy use
export const Trace = (options?: { name?: string; kind?: SpanKind }) => {
  return HybridTelemetry.getInstance().createDecorator(options);
};

// Cache instrumentation plugin example
export class CacheInstrumentationPlugin implements TelemetryPlugin {
  name = 'cache-instrumentation';
  
  initialize(telemetry: HybridTelemetry): void {
    // Hook into cache operations
    const originalGet = SmartCache.prototype.get;
    SmartCache.prototype.get = async function (...args: any[]) {
      return telemetry.withSpan('cache.get', async (span) => {
        span.setAttributes({
          'cache.key': args[0],
          'cache.type': this.type || 'default'
        });
        
        const result = await originalGet.apply(this, args);
        const hit = result !== null && result !== undefined;
        
        span.setAttribute('cache.hit', hit);
        telemetry.recordMetric('cacheHitRatio', hit ? 1 : 0, {
          type: this.type || 'default'
        });
        
        return result;
      });
    };
  }
}

// Integration with ALECSCore
export function integrateHybridTelemetry(alecsCore: any, config: TelemetryConfig): void {
  const telemetry = HybridTelemetry.initialize(config);
  
  // Add middleware
  alecsCore.use(telemetry.createMiddleware());
  
  // Expose telemetry to core
  alecsCore.telemetry = telemetry;
  
  // Shutdown hook
  alecsCore.on('shutdown', async () => {
    await telemetry.shutdown();
  });
}

// Usage example
class SmartCache {
  type?: string;
  async get(key: string): Promise<any> {
    // Cache implementation
    return null;
  }
}

export class ExampleService {
  @Trace({ name: 'property.list', kind: SpanKind.SERVER })
  async listProperties(params: any): Promise<any[]> {
    // Implementation
    return [];
  }
  
  @Trace()
  async validateProperty(property: any): Promise<boolean> {
    const telemetry = HybridTelemetry.getInstance();
    telemetry.setSpanAttributes({
      'property.id': property.id,
      'property.name': property.name
    });
    
    // Validation logic
    return true;
  }
}