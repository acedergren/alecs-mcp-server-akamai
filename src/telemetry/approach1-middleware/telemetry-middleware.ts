/**
 * Approach 1: Middleware-based OpenTelemetry Implementation
 * 
 * This approach integrates OpenTelemetry through MCP middleware,
 * automatically instrumenting all tool calls without modifying existing code.
 */

import { trace, context, SpanStatusCode, SpanKind, Attributes } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';
import type { MCPRequest, MCPResponse, ToolContext } from '../../types/mcp';

interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  enableAutoInstrumentation?: boolean;
  samplingRate?: number;
}

export class TelemetryMiddleware {
  private tracer;
  private meter;
  private toolExecutionHistogram;
  private toolErrorCounter;
  private activeRequestsGauge;
  
  constructor(private config: TelemetryConfig) {
    this.initializeTracing();
    this.initializeMetrics();
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
    this.meter = metrics.getMeter(config.serviceName, config.serviceVersion);
    
    // Initialize metrics
    this.toolExecutionHistogram = this.meter.createHistogram('alecs.tool.duration', {
      description: 'Duration of tool executions',
      unit: 'ms'
    });
    
    this.toolErrorCounter = this.meter.createCounter('alecs.tool.errors', {
      description: 'Count of tool execution errors'
    });
    
    this.activeRequestsGauge = this.meter.createUpDownCounter('alecs.requests.active', {
      description: 'Number of active requests'
    });
  }
  
  private initializeTracing(): void {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });
    
    const provider = new NodeTracerProvider({
      resource,
      sampler: {
        shouldSample: () => ({
          decision: Math.random() < (this.config.samplingRate || 1) ? 1 : 0,
          attributes: {}
        })
      }
    });
    
    if (this.config.otlpEndpoint) {
      const exporter = new OTLPTraceExporter({
        url: `${this.config.otlpEndpoint}/v1/traces`,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }
    
    provider.register();
    
    if (this.config.enableAutoInstrumentation) {
      registerInstrumentations({
        instrumentations: [
          new HttpInstrumentation({
            requestHook: (span, request) => {
              span.setAttributes({
                'http.request.body.size': JSON.stringify(request).length,
                'alecs.customer': (request as any).customer || 'unknown'
              });
            }
          })
        ]
      });
    }
  }
  
  private initializeMetrics(): void {
    const meterProvider = new MeterProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName
      })
    });
    
    if (this.config.prometheusPort) {
      const prometheusExporter = new PrometheusExporter(
        {
          port: this.config.prometheusPort,
          endpoint: '/metrics'
        },
        () => {
          console.log(`Prometheus metrics available at http://localhost:${this.config.prometheusPort}/metrics`);
        }
      );
      
      meterProvider.addMetricReader(prometheusExporter);
    }
    
    metrics.setGlobalMeterProvider(meterProvider);
  }
  
  /**
   * MCP Middleware function to instrument tool calls
   */
  async instrumentToolCall(
    request: MCPRequest,
    next: (req: MCPRequest) => Promise<MCPResponse>,
    context: ToolContext
  ): Promise<MCPResponse> {
    const span = this.tracer.startSpan(`mcp.tool.${request.method}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'mcp.tool.name': request.method,
        'mcp.request.id': request.id,
        'alecs.customer': context.customer,
        'alecs.account_switch_key': context.accountSwitchKey || 'none'
      } as Attributes
    });
    
    this.activeRequestsGauge.add(1);
    const startTime = Date.now();
    
    try {
      // Inject context for propagation
      const newContext = trace.setSpan(context.active(), span);
      
      // Execute tool with traced context
      const response = await context.with(newContext, () => next(request));
      
      // Record success metrics
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'mcp.response.success': true,
        'mcp.response.size': JSON.stringify(response).length
      });
      
      return response;
    } catch (error) {
      // Record error metrics
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.toolErrorCounter.add(1, {
        'mcp.tool.name': request.method,
        'error.type': error instanceof Error ? error.constructor.name : 'unknown'
      });
      
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record duration metric
      this.toolExecutionHistogram.record(duration, {
        'mcp.tool.name': request.method,
        'alecs.customer': context.customer
      });
      
      span.setAttribute('mcp.duration.ms', duration);
      span.end();
      this.activeRequestsGauge.add(-1);
    }
  }
  
  /**
   * Create a child span for sub-operations
   */
  createSpan(name: string, attributes?: Attributes): any {
    return this.tracer.startSpan(name, {
      attributes,
      kind: SpanKind.INTERNAL
    });
  }
  
  /**
   * Instrument Akamai API calls
   */
  async instrumentAkamaiCall<T>(
    operation: string,
    endpoint: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const span = this.tracer.startSpan(`akamai.api.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'akamai.operation': operation,
        'akamai.endpoint': endpoint,
        'http.method': 'GET' // This should be dynamic based on operation
      }
    });
    
    try {
      const result = await fn();
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
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await trace.getTracerProvider().shutdown();
    // Metrics shutdown is handled by the exporter
  }
}

/**
 * Factory function to create and configure telemetry middleware
 */
export function createTelemetryMiddleware(config: Partial<TelemetryConfig> = {}): TelemetryMiddleware {
  const defaultConfig: TelemetryConfig = {
    serviceName: 'alecs-mcp-server',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    enableAutoInstrumentation: true,
    samplingRate: parseFloat(process.env.OTEL_SAMPLING_RATE || '1.0')
  };
  
  return new TelemetryMiddleware({ ...defaultConfig, ...config });
}

/**
 * Integration with ALECSCore
 */
export function integrateTelemetryMiddleware(server: any): void {
  const telemetry = createTelemetryMiddleware();
  
  // Add middleware to server
  server.use(async (request: MCPRequest, next: Function, context: ToolContext) => {
    return telemetry.instrumentToolCall(request, next as any, context);
  });
  
  // Instrument server lifecycle
  server.on('start', () => {
    console.log('Telemetry middleware initialized');
  });
  
  server.on('shutdown', async () => {
    await telemetry.shutdown();
  });
}