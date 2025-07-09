/**
 * Approach 2: Decorator-based OpenTelemetry Implementation
 * 
 * This approach uses TypeScript decorators to instrument methods,
 * providing fine-grained control over what gets traced.
 */

import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  Span,
  Tracer,
  Attributes,
  metrics,
  Histogram,
  Counter
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';

// Global telemetry instance
let globalTelemetry: TelemetryManager;

export class TelemetryManager {
  private tracer: Tracer;
  private toolDurationHistogram: Histogram;
  private toolErrorCounter: Counter;
  private cacheHitCounter: Counter;
  private apiCallHistogram: Histogram;
  
  constructor() {
    this.initializeProviders();
    this.tracer = trace.getTracer('alecs-mcp-server', '1.0.0');
    const meter = metrics.getMeter('alecs-mcp-server', '1.0.0');
    
    // Initialize metrics
    this.toolDurationHistogram = meter.createHistogram('alecs.tool.duration', {
      description: 'Duration of tool executions',
      unit: 'ms'
    });
    
    this.toolErrorCounter = meter.createCounter('alecs.tool.errors', {
      description: 'Count of tool execution errors'
    });
    
    this.cacheHitCounter = meter.createCounter('alecs.cache.hits', {
      description: 'Cache hit count'
    });
    
    this.apiCallHistogram = meter.createHistogram('alecs.api.duration', {
      description: 'Duration of Akamai API calls',
      unit: 'ms'
    });
  }
  
  private initializeProviders(): void {
    // Initialize tracing
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'alecs-mcp-server',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });
    
    const tracerProvider = new NodeTracerProvider({ resource });
    
    // Add OTLP exporter for production
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const otlpExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      });
      tracerProvider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));
    }
    
    // Add console exporter for development
    if (process.env.NODE_ENV === 'development') {
      tracerProvider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }
    
    tracerProvider.register();
    
    // Initialize metrics
    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4317'
    });
    
    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 10000
        })
      ]
    });
    
    metrics.setGlobalMeterProvider(meterProvider);
  }
  
  getTracer(): Tracer {
    return this.tracer;
  }
  
  recordToolDuration(toolName: string, duration: number, attributes?: Attributes): void {
    this.toolDurationHistogram.record(duration, { 'tool.name': toolName, ...attributes });
  }
  
  recordToolError(toolName: string, errorType: string): void {
    this.toolErrorCounter.add(1, { 'tool.name': toolName, 'error.type': errorType });
  }
  
  recordCacheHit(cacheType: string, hit: boolean): void {
    if (hit) {
      this.cacheHitCounter.add(1, { 'cache.type': cacheType, 'cache.hit': 'true' });
    }
  }
  
  recordApiCall(endpoint: string, duration: number, statusCode: number): void {
    this.apiCallHistogram.record(duration, {
      'api.endpoint': endpoint,
      'http.status_code': statusCode
    });
  }
}

// Initialize global telemetry
export function initializeTelemetry(): void {
  globalTelemetry = new TelemetryManager();
}

// Get global telemetry instance
export function getTelemetry(): TelemetryManager {
  if (!globalTelemetry) {
    initializeTelemetry();
  }
  return globalTelemetry;
}

/**
 * Decorator to trace MCP tool execution
 */
export function TraceToolExecution(toolName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const finalToolName = toolName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const telemetry = getTelemetry();
      const tracer = telemetry.getTracer();
      const span = tracer.startSpan(`tool.${finalToolName}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'tool.name': finalToolName,
          'tool.args.count': args.length
        }
      });
      
      const startTime = Date.now();
      
      try {
        // Extract customer context if available
        const context = args.find(arg => arg?.customer);
        if (context?.customer) {
          span.setAttribute('alecs.customer', context.customer);
        }
        
        const result = await context.with(trace.setSpan(context.active(), span), () =>
          originalMethod.apply(this, args)
        );
        
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        
        telemetry.recordToolError(
          finalToolName,
          error instanceof Error ? error.constructor.name : 'UnknownError'
        );
        
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        telemetry.recordToolDuration(finalToolName, duration);
        span.setAttribute('duration.ms', duration);
        span.end();
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator to trace Akamai API calls
 */
export function TraceAkamaiAPI(endpoint?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const telemetry = getTelemetry();
      const tracer = telemetry.getTracer();
      const apiEndpoint = endpoint || propertyKey;
      
      const span = tracer.startSpan(`akamai.api.${apiEndpoint}`, {
        kind: SpanKind.CLIENT,
        attributes: {
          'api.endpoint': apiEndpoint,
          'api.service': 'akamai'
        }
      });
      
      const startTime = Date.now();
      
      try {
        const result = await context.with(trace.setSpan(context.active(), span), () =>
          originalMethod.apply(this, args)
        );
        
        span.setStatus({ code: SpanStatusCode.OK });
        
        // Extract status code if available
        const statusCode = result?.statusCode || 200;
        span.setAttribute('http.status_code', statusCode);
        
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Extract status code from error if available
        const statusCode = (error as any)?.response?.status || 0;
        if (statusCode) {
          span.setAttribute('http.status_code', statusCode);
        }
        
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        telemetry.recordApiCall(apiEndpoint, duration, 200); // TODO: Get actual status
        span.setAttribute('duration.ms', duration);
        span.end();
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator to trace cache operations
 */
export function TraceCacheOperation(cacheType: string = 'default') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const telemetry = getTelemetry();
      const tracer = telemetry.getTracer();
      
      const span = tracer.startSpan(`cache.${propertyKey}`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'cache.type': cacheType,
          'cache.operation': propertyKey
        }
      });
      
      try {
        const result = await context.with(trace.setSpan(context.active(), span), () =>
          originalMethod.apply(this, args)
        );
        
        // Detect cache hit/miss
        const isHit = result !== null && result !== undefined;
        span.setAttribute('cache.hit', isHit);
        telemetry.recordCacheHit(cacheType, isHit);
        
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
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator for manual span creation
 */
export function WithSpan(spanName: string, spanKind: SpanKind = SpanKind.INTERNAL) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const telemetry = getTelemetry();
      const tracer = telemetry.getTracer();
      
      const span = tracer.startSpan(spanName, {
        kind: spanKind,
        attributes: {
          'method.name': `${target.constructor.name}.${propertyKey}`
        }
      });
      
      try {
        const result = await context.with(trace.setSpan(context.active(), span), () =>
          originalMethod.apply(this, args)
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
      }
    };
    
    return descriptor;
  };
}

/**
 * Usage example with existing ALECS code
 */
export class InstrumentedPropertyOperations {
  @TraceToolExecution('property.list')
  async listProperties(params: any): Promise<any> {
    // Implementation
    return [];
  }
  
  @TraceToolExecution('property.create')
  async createProperty(params: any): Promise<any> {
    // Implementation
    return {};
  }
  
  @TraceAkamaiAPI('/papi/v1/properties')
  private async callPropertyAPI(endpoint: string): Promise<any> {
    // API call implementation
    return {};
  }
  
  @TraceCacheOperation('property-cache')
  private async getCachedProperty(id: string): Promise<any> {
    // Cache lookup implementation
    return null;
  }
  
  @WithSpan('property.validation', SpanKind.INTERNAL)
  private async validateProperty(property: any): Promise<boolean> {
    // Validation logic
    return true;
  }
}