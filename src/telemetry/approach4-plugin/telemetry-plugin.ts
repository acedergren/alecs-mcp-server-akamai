/**
 * Approach 4: Plugin-based OpenTelemetry Implementation
 * 
 * This approach implements telemetry as a pluggable module that can be
 * dynamically loaded and configured without modifying core code.
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
  Attributes
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Plugin interface that all ALECS plugins must implement
export interface ALECSPlugin {
  name: string;
  version: string;
  initialize(core: ALECSPluginHost): Promise<void>;
  shutdown(): Promise<void>;
}

// Host interface provided by ALECS core
export interface ALECSPluginHost {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  getConfig(key: string): any;
  registerMiddleware(middleware: Function): void;
  registerToolWrapper(wrapper: Function): void;
  getLogger(): any;
}

// Telemetry plugin configuration
export interface TelemetryPluginConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  exporters: {
    otlp?: {
      endpoint: string;
      headers?: Record<string, string>;
    };
    jaeger?: {
      endpoint: string;
    };
    prometheus?: {
      port: number;
      path: string;
    };
    console?: boolean;
  };
  sampling: {
    rate: number;
    rules?: Array<{
      path: string;
      rate: number;
    }>;
  };
  propagators: string[];
  customAttributes?: Record<string, string>;
}

export class TelemetryPlugin implements ALECSPlugin {
  public readonly name = 'alecs-telemetry';
  public readonly version = '1.0.0';
  
  private tracer!: Tracer;
  private meter!: Meter;
  private config!: TelemetryPluginConfig;
  private host!: ALECSPluginHost;
  private tracerProvider?: NodeTracerProvider;
  private meterProvider?: MeterProvider;
  
  // Metrics instruments
  private toolDuration!: any;
  private toolErrors!: any;
  private activeRequests!: any;
  private cacheMetrics!: any;
  
  // Event handlers for cleanup
  private eventHandlers: Map<string, Function> = new Map();
  
  async initialize(host: ALECSPluginHost): Promise<void> {
    this.host = host;
    this.config = this.loadConfig();
    
    if (!this.config.enabled) {
      host.getLogger().info('Telemetry plugin disabled');
      return;
    }
    
    await this.setupProviders();
    this.setupMetrics();
    this.registerEventHandlers();
    this.registerMiddleware();
    this.registerToolWrapper();
    
    host.getLogger().info('Telemetry plugin initialized', {
      exporters: Object.keys(this.config.exporters)
    });
  }
  
  private loadConfig(): TelemetryPluginConfig {
    const defaultConfig: TelemetryPluginConfig = {
      enabled: true,
      serviceName: 'alecs-mcp-server',
      serviceVersion: '1.0.0',
      exporters: {},
      sampling: { rate: 1.0 },
      propagators: ['tracecontext', 'baggage']
    };
    
    // Load config from host
    const userConfig = this.host.getConfig('telemetry') || {};
    
    // Merge with environment variables
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      userConfig.exporters = userConfig.exporters || {};
      userConfig.exporters.otlp = {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      };
    }
    
    return { ...defaultConfig, ...userConfig };
  }
  
  private async setupProviders(): Promise<void> {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      ...this.config.customAttributes
    });
    
    // Setup tracing
    this.tracerProvider = new NodeTracerProvider({
      resource,
      sampler: this.createSampler()
    });
    
    // Add exporters
    await this.setupExporters();
    
    this.tracerProvider.register();
    this.tracer = trace.getTracer(this.name, this.version);
    
    // Setup metrics
    this.meterProvider = new MeterProvider({ resource });
    metrics.setGlobalMeterProvider(this.meterProvider);
    this.meter = metrics.getMeter(this.name, this.version);
  }
  
  private createSampler(): any {
    const baseRate = this.config.sampling.rate;
    const rules = this.config.sampling.rules || [];
    
    return {
      shouldSample: (context: any, traceId: string, spanName: string) => {
        // Check custom rules first
        for (const rule of rules) {
          if (spanName.includes(rule.path)) {
            return {
              decision: Math.random() < rule.rate ? 1 : 0,
              attributes: {}
            };
          }
        }
        
        // Default sampling
        return {
          decision: Math.random() < baseRate ? 1 : 0,
          attributes: {}
        };
      }
    };
  }
  
  private async setupExporters(): Promise<void> {
    const exporters = this.config.exporters;
    
    // OTLP Exporter
    if (exporters.otlp) {
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
      
      const traceExporter = new OTLPTraceExporter({
        url: `${exporters.otlp.endpoint}/v1/traces`,
        headers: exporters.otlp.headers
      });
      
      this.tracerProvider!.addSpanProcessor(new BatchSpanProcessor(traceExporter));
      
      const metricExporter = new OTLPMetricExporter({
        url: `${exporters.otlp.endpoint}/v1/metrics`,
        headers: exporters.otlp.headers
      });
      
      this.meterProvider!.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 30000
        })
      );
    }
    
    // Jaeger Exporter
    if (exporters.jaeger) {
      const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
      const jaegerExporter = new JaegerExporter({
        endpoint: exporters.jaeger.endpoint
      });
      this.tracerProvider!.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
    }
    
    // Prometheus Exporter
    if (exporters.prometheus) {
      const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus');
      const prometheusExporter = new PrometheusExporter({
        port: exporters.prometheus.port,
        endpoint: exporters.prometheus.path
      });
      this.meterProvider!.addMetricReader(prometheusExporter);
    }
    
    // Console Exporter (for debugging)
    if (exporters.console) {
      const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-base');
      const { ConsoleMetricExporter } = await import('@opentelemetry/sdk-metrics');
      
      this.tracerProvider!.addSpanProcessor(
        new BatchSpanProcessor(new ConsoleSpanExporter())
      );
      
      this.meterProvider!.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: new ConsoleMetricExporter(),
          exportIntervalMillis: 5000
        })
      );
    }
  }
  
  private setupMetrics(): void {
    this.toolDuration = this.meter.createHistogram('alecs.tool.duration', {
      description: 'Tool execution duration',
      unit: 'ms'
    });
    
    this.toolErrors = this.meter.createCounter('alecs.tool.errors', {
      description: 'Tool execution errors'
    });
    
    this.activeRequests = this.meter.createUpDownCounter('alecs.requests.active', {
      description: 'Active requests'
    });
    
    this.cacheMetrics = {
      hits: this.meter.createCounter('alecs.cache.hits', {
        description: 'Cache hits'
      }),
      misses: this.meter.createCounter('alecs.cache.misses', {
        description: 'Cache misses'
      })
    };
  }
  
  private registerEventHandlers(): void {
    // Tool execution events
    const beforeHandler = this.createEventHandler('tool:before', (event: any) => {
      const span = this.tracer.startSpan(`tool.${event.toolName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'tool.name': event.toolName,
          'customer': event.context?.customer || 'unknown'
        }
      });
      event.telemetryContext = { span, startTime: Date.now() };
      this.activeRequests.add(1, { tool: event.toolName });
    });
    
    const afterHandler = this.createEventHandler('tool:after', (event: any) => {
      if (event.telemetryContext) {
        const { span, startTime } = event.telemetryContext;
        const duration = Date.now() - startTime;
        
        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('duration.ms', duration);
        span.end();
        
        this.toolDuration.record(duration, {
          tool: event.toolName,
          status: 'success'
        });
        this.activeRequests.add(-1, { tool: event.toolName });
      }
    });
    
    const errorHandler = this.createEventHandler('tool:error', (event: any) => {
      if (event.telemetryContext) {
        const { span } = event.telemetryContext;
        
        span.recordException(event.error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: event.error.message
        });
        span.end();
        
        this.toolErrors.add(1, {
          tool: event.toolName,
          error: event.error.constructor.name
        });
        this.activeRequests.add(-1, { tool: event.toolName });
      }
    });
    
    // Cache events
    const cacheHitHandler = this.createEventHandler('cache:hit', (event: any) => {
      this.cacheMetrics.hits.add(1, {
        cache: event.cacheType || 'default'
      });
    });
    
    const cacheMissHandler = this.createEventHandler('cache:miss', (event: any) => {
      this.cacheMetrics.misses.add(1, {
        cache: event.cacheType || 'default'
      });
    });
    
    // Register all handlers
    this.host.on('tool:before', beforeHandler);
    this.host.on('tool:after', afterHandler);
    this.host.on('tool:error', errorHandler);
    this.host.on('cache:hit', cacheHitHandler);
    this.host.on('cache:miss', cacheMissHandler);
  }
  
  private createEventHandler(event: string, handler: Function): Function {
    this.eventHandlers.set(event, handler);
    return handler;
  }
  
  private registerMiddleware(): void {
    this.host.registerMiddleware(async (req: any, next: Function, context: any) => {
      const span = this.tracer.startSpan('mcp.request', {
        kind: SpanKind.SERVER,
        attributes: {
          'mcp.method': req.method,
          'mcp.id': req.id
        }
      });
      
      const tracedContext = trace.setSpan(context.active(), span);
      
      try {
        const result = await context.with(tracedContext, () => next(req));
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
    });
  }
  
  private registerToolWrapper(): void {
    this.host.registerToolWrapper((toolHandler: Function) => {
      return async (params: any, context: any) => {
        const span = this.createChildSpan('tool.execution', {
          attributes: {
            'tool.params': JSON.stringify(params).slice(0, 1000)
          }
        });
        
        try {
          const result = await context.with(
            trace.setSpan(context.active(), span),
            () => toolHandler(params, context)
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
      };
    });
  }
  
  private createChildSpan(name: string, options?: any): Span {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      return this.tracer.startSpan(name, {
        ...options,
        attributes: {
          'parent.span.id': currentSpan.spanContext().spanId,
          ...options?.attributes
        }
      });
    }
    return this.tracer.startSpan(name, options);
  }
  
  async shutdown(): Promise<void> {
    // Unregister event handlers
    this.eventHandlers.forEach((handler, event) => {
      this.host.off(event, handler);
    });
    
    // Shutdown providers
    await Promise.all([
      this.tracerProvider?.shutdown(),
      this.meterProvider?.shutdown()
    ]);
    
    this.host.getLogger().info('Telemetry plugin shut down');
  }
  
  // Public API for manual instrumentation
  public getTracer(): Tracer {
    return this.tracer;
  }
  
  public getMeter(): Meter {
    return this.meter;
  }
  
  public startSpan(name: string, options?: any): Span {
    return this.tracer.startSpan(name, options);
  }
  
  public async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: any
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
        message: (error as Error).message
      });
      throw error;
    } finally {
      span.end();
    }
  }
}

// Plugin factory
export function createTelemetryPlugin(): ALECSPlugin {
  return new TelemetryPlugin();
}

// Example plugin loader for ALECS
export class PluginLoader {
  private plugins: Map<string, ALECSPlugin> = new Map();
  
  async loadPlugin(plugin: ALECSPlugin, host: ALECSPluginHost): Promise<void> {
    await plugin.initialize(host);
    this.plugins.set(plugin.name, plugin);
  }
  
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.shutdown();
      this.plugins.delete(name);
    }
  }
  
  getPlugin(name: string): ALECSPlugin | undefined {
    return this.plugins.get(name);
  }
}