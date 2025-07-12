/**
 * Tool Interface - CODE KAI Implementation
 * 
 * KEY: Type-safe abstraction for all MCP tools
 * APPROACH: Composable tool pattern with lifecycle management
 * IMPLEMENTATION: Plugin-friendly, testable, extensible
 * 
 * This interface defines the contract for all MCP tools in ALECS,
 * enabling dynamic loading, testing, and plugin architecture.
 */

import { z } from 'zod';
import { MCPToolResponse } from '../../types/mcp-protocol';

/**
 * Tool execution context
 */
export interface ToolContext {
  /** Customer making the request */
  customer?: string;
  
  /** Request ID for tracing */
  requestId?: string;
  
  /** Additional context data */
  context?: Record<string, any>;
  
  /** Progress callback for long-running operations */
  onProgress?: (progress: number, message?: string) => void;
  
  /** Cancellation token */
  signal?: AbortSignal;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Tool version */
  version: string;
  
  /** Tool author */
  author?: string;
  
  /** Tool category/domain */
  category: string;
  
  /** Tool tags for discovery */
  tags: string[];
  
  /** Whether tool is deprecated */
  deprecated?: boolean;
  
  /** Deprecation message */
  deprecationMessage?: string;
  
  /** Tool documentation URL */
  documentation?: string;
  
  /** Tool examples */
  examples?: ToolExample[];
}

/**
 * Tool example for documentation
 */
export interface ToolExample {
  /** Example title */
  title: string;
  
  /** Example description */
  description: string;
  
  /** Example input */
  input: Record<string, any>;
  
  /** Expected output description */
  output: string;
}

/**
 * Tool configuration options
 */
export interface ToolOptions {
  /** Whether to cache results */
  cache?: boolean;
  
  /** Cache TTL in seconds */
  cacheTTL?: number;
  
  /** Whether to coalesce duplicate requests */
  coalesce?: boolean;
  
  /** Whether tool requires authentication */
  requiresAuth?: boolean;
  
  /** Required customer tier */
  requiredTier?: 'free' | 'pro' | 'enterprise';
  
  /** Rate limit per customer */
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Whether tool can be retried */
  retryable?: boolean;
  
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Tool validation result
 */
export interface ToolValidationResult {
  /** Whether tool is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
}

/**
 * Core tool interface
 */
export interface ITool {
  /** Tool metadata */
  readonly metadata: ToolMetadata;
  
  /** Tool input schema */
  readonly inputSchema: z.ZodSchema;
  
  /** Tool configuration options */
  readonly options: ToolOptions;
  
  /**
   * Execute the tool
   */
  execute(args: any, context: ToolContext): Promise<MCPToolResponse>;
  
  /**
   * Validate tool arguments
   */
  validate(args: any): ToolValidationResult;
  
  /**
   * Initialize tool (called once when loaded)
   */
  initialize?(): Promise<void>;
  
  /**
   * Cleanup tool (called when unloaded)
   */
  cleanup?(): Promise<void>;
}

/**
 * Tool with health checking capabilities
 */
export interface IHealthCheckableTool extends ITool {
  /**
   * Check if tool is healthy
   */
  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }>;
}

/**
 * Tool with metrics capabilities
 */
export interface IMetricsTool extends ITool {
  /**
   * Get tool metrics
   */
  getMetrics(): {
    executions: number;
    successes: number;
    failures: number;
    avgDuration: number;
    lastExecution?: Date;
    lastError?: Error;
  };
  
  /**
   * Reset tool metrics
   */
  resetMetrics(): void;
}

/**
 * Tool factory interface
 */
export interface IToolFactory {
  /**
   * Create tool instance
   */
  createTool(name: string, config?: any): ITool;
  
  /**
   * Get available tool names
   */
  getAvailableTools(): string[];
  
  /**
   * Check if tool is available
   */
  hasToolSupport(name: string): boolean;
}

/**
 * Tool registry interface
 */
export interface IToolRegistry {
  /**
   * Register a tool
   */
  register(tool: ITool): void;
  
  /**
   * Unregister a tool
   */
  unregister(name: string): void;
  
  /**
   * Get registered tool
   */
  get(name: string): ITool | undefined;
  
  /**
   * Get all registered tools
   */
  getAll(): ITool[];
  
  /**
   * Get tools by category
   */
  getByCategory(category: string): ITool[];
  
  /**
   * Get tools by tag
   */
  getByTag(tag: string): ITool[];
  
  /**
   * Search tools
   */
  search(query: string): ITool[];
  
  /**
   * Validate all tools
   */
  validateAll(): Record<string, ToolValidationResult>;
  
  /**
   * Clear all tools
   */
  clear(): void;
}

/**
 * Tool loader interface for dynamic loading
 */
export interface IToolLoader {
  /**
   * Load tools from directory
   */
  loadFromDirectory(directory: string): Promise<ITool[]>;
  
  /**
   * Load tool from file
   */
  loadFromFile(filePath: string): Promise<ITool>;
  
  /**
   * Load tool from module
   */
  loadFromModule(moduleName: string): Promise<ITool>;
  
  /**
   * Watch directory for tool changes
   */
  watchDirectory(directory: string, callback: (tools: ITool[]) => void): void;
  
  /**
   * Stop watching directory
   */
  stopWatching(directory: string): void;
  
  /**
   * Reload tool
   */
  reloadTool(name: string): Promise<ITool>;
}

/**
 * Tool executor interface
 */
export interface IToolExecutor {
  /**
   * Execute tool with full context
   */
  execute(
    toolName: string,
    args: any,
    context: ToolContext
  ): Promise<MCPToolResponse>;
  
  /**
   * Execute tool with timeout
   */
  executeWithTimeout(
    toolName: string,
    args: any,
    context: ToolContext,
    timeout: number
  ): Promise<MCPToolResponse>;
  
  /**
   * Execute tool with retries
   */
  executeWithRetries(
    toolName: string,
    args: any,
    context: ToolContext,
    maxRetries: number
  ): Promise<MCPToolResponse>;
  
  /**
   * Batch execute multiple tools
   */
  executeBatch(
    requests: Array<{
      toolName: string;
      args: any;
      context: ToolContext;
    }>
  ): Promise<MCPToolResponse[]>;
}