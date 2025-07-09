/**
 * Common TypeScript type definitions for OpenTelemetry implementation
 * These types ensure compatibility with ALECS and MCP protocols
 */

import { Span, SpanKind, Attributes } from '@opentelemetry/api';

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// Tool Context Types
export interface ToolContext {
  customer: string;
  accountSwitchKey?: string;
  traceId?: string;
  spanId?: string;
  user?: string;
  requestId?: string;
}

// ALECS Specific Types
export interface ALECSRequest extends MCPRequest {
  context?: ToolContext;
}

export interface ALECSToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  handler: ToolHandler;
  metadata?: ToolMetadata;
}

export interface ToolMetadata {
  category?: string;
  tags?: string[];
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
}

export type ToolHandler = (
  params: unknown,
  context: ToolContext
) => Promise<unknown>;

// Telemetry Event Types
export interface TelemetryEvent {
  name: string;
  timestamp: number;
  attributes?: Attributes;
}

export interface ToolExecutionEvent extends TelemetryEvent {
  toolName: string;
  context: ToolContext;
  duration?: number;
  error?: Error;
  telemetryContext?: {
    span: Span;
    startTime: number;
  };
}

// Metric Types
export interface MetricLabels {
  [key: string]: string | number | boolean;
}

export interface TelemetryMetrics {
  requestDuration: any; // Histogram
  requestCount: any; // Counter
  errorCount: any; // Counter
  activeRequests: any; // UpDownCounter
  cacheHitRatio: any; // Histogram
  apiLatency: any; // Histogram
}

// Configuration Types
export interface TelemetryExporterConfig {
  otlp?: {
    endpoint: string;
    headers?: Record<string, string>;
    compression?: 'gzip' | 'none';
  };
  jaeger?: {
    endpoint: string;
    agentHost?: string;
    agentPort?: number;
  };
  prometheus?: {
    port: number;
    path?: string;
    hostname?: string;
  };
  console?: boolean;
}

export interface TelemetrySamplingConfig {
  default: number; // 0.0 to 1.0
  rules?: Array<{
    pattern: string | RegExp;
    rate: number;
    priority?: number;
  }>;
}

export interface TelemetryInstrumentationConfig {
  http?: boolean | {
    requestHook?: (span: Span, request: any) => void;
    responseHook?: (span: Span, response: any) => void;
  };
  cache?: boolean;
  tools?: boolean | string[]; // true for all, array for specific tools
  api?: boolean;
}

// Span Options
export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Attributes;
  links?: Array<{
    context: any;
    attributes?: Attributes;
  }>;
  startTime?: number;
}

// Plugin Types
export interface TelemetryPlugin {
  name: string;
  version?: string;
  initialize(telemetry: any): void | Promise<void>;
  shutdown?(): void | Promise<void>;
}

export interface PluginHost {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  getConfig(key: string): any;
  registerMiddleware(middleware: MiddlewareFunction): void;
  registerToolWrapper(wrapper: ToolWrapperFunction): void;
}

// Middleware Types
export type MiddlewareFunction = (
  request: MCPRequest,
  next: (request: MCPRequest) => Promise<MCPResponse>,
  context: ToolContext
) => Promise<MCPResponse>;

export type ToolWrapperFunction = (
  handler: ToolHandler
) => ToolHandler;

// Decorator Types
export interface DecoratorOptions {
  name?: string;
  kind?: SpanKind;
  attributes?: Attributes;
  skipOn?: (target: any, propertyKey: string) => boolean;
}

// Service Types
export interface TelemetryService {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T>;
  recordMetric(
    name: string,
    value: number,
    labels?: MetricLabels
  ): void;
  incrementCounter(
    name: string,
    value?: number,
    labels?: MetricLabels
  ): void;
  getCurrentTraceId(): string | undefined;
  shutdown(): Promise<void>;
}

// Error Types
export class TelemetryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TelemetryError';
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

// Re-export commonly used OpenTelemetry types
export {
  Span,
  SpanKind,
  SpanStatusCode,
  Attributes,
  Context,
  Tracer,
  Meter
} from '@opentelemetry/api';