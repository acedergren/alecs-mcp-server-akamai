/**
 * Tool Performance Wrapper - Automatic optimization for all tools
 * 
 * This module provides a decorator that automatically applies
 * performance optimizations to tool implementations based on
 * their operation type and characteristics.
 */

import { performanceOptimized, PerformanceProfiles, PerformanceConfig } from './index';
import { withCustomerValidation } from '../validation/customer';
import { withErrorHandling } from '../errors';

/**
 * Tool metadata for automatic optimization
 */
export interface ToolMetadata {
  name: string;
  description: string;
  operation: 'read' | 'write' | 'list' | 'status' | 'mixed';
  domain: 'property' | 'dns' | 'certificates' | 'security' | 'reporting' | 'general';
  cacheable?: boolean;
  cacheInvalidation?: string[]; // Patterns to invalidate on write
}

/**
 * Enhanced tool definition with performance optimization
 */
export interface OptimizedTool<T = any> {
  metadata: ToolMetadata;
  inputSchema?: any; // Zod schema
  handler: (client: any, params: T) => Promise<any>;
  originalHandler?: (client: any, params: T) => Promise<any>; // For debugging
}

/**
 * Determine performance profile based on tool metadata
 */
function getPerformanceProfile(metadata: ToolMetadata): PerformanceConfig {
  // Check for explicit cacheability
  if (metadata.cacheable === false) {
    return {
      cache: { enabled: false },
      coalesce: { enabled: true, ttl: 5000 },
      circuitBreaker: { enabled: true },
      metrics: { enabled: true, logLevel: 'info' },
    };
  }
  
  // Use operation-based profiles
  switch (metadata.operation) {
    case 'read':
      return PerformanceProfiles.READ;
    case 'write':
      return PerformanceProfiles.WRITE;
    case 'list':
      return PerformanceProfiles.LIST;
    case 'status':
      return PerformanceProfiles.STATUS;
    case 'mixed':
      // Conservative profile for mixed operations
      return {
        cache: { enabled: false },
        coalesce: { enabled: true, ttl: 5000 },
        circuitBreaker: { enabled: true },
        metrics: { enabled: true, logLevel: 'info' },
      };
    default:
      return PerformanceProfiles.READ;
  }
}

/**
 * Create an optimized tool with all performance enhancements
 */
export function createOptimizedTool<T = any>(
  metadata: ToolMetadata,
  handler: (client: any, params: T) => Promise<any>,
  inputSchema?: any
): OptimizedTool<T> {
  // Get appropriate performance profile
  const profile = getPerformanceProfile(metadata);
  
  // Build operation name for metrics
  const operationName = `${metadata.domain}.${metadata.name}`;
  
  // Apply layers of optimization
  let optimizedHandler = handler;
  
  // 1. Error handling layer
  optimizedHandler = withErrorHandling(optimizedHandler, operationName);
  
  // 2. Customer validation layer
  optimizedHandler = withCustomerValidation(optimizedHandler);
  
  // 3. Performance optimization layer
  optimizedHandler = performanceOptimized(optimizedHandler, operationName, profile);
  
  // 4. Cache invalidation for write operations
  if (metadata.operation === 'write' && metadata.cacheInvalidation) {
    const originalHandler = optimizedHandler;
    optimizedHandler = async (client: any, params: T) => {
      const result = await originalHandler(client, params);
      
      // Invalidate cache patterns after successful write
      const { CacheInvalidation } = await import('./index');
      const customer = params?.['customer'] || client?.customer || 'default';
      
      for (const pattern of metadata.cacheInvalidation!) {
        const customerPattern = pattern.replace('{customer}', customer);
        await CacheInvalidation.invalidate(customerPattern);
      }
      
      return result;
    };
  }
  
  return {
    metadata,
    inputSchema,
    handler: optimizedHandler,
    originalHandler: handler, // Keep original for debugging
  };
}

/**
 * Batch create optimized tools from definitions
 */
export function createOptimizedTools(
  definitions: Array<{
    metadata: ToolMetadata;
    handler: (client: any, params: any) => Promise<any>;
    inputSchema?: any;
  }>
): Map<string, OptimizedTool> {
  const tools = new Map<string, OptimizedTool>();
  
  for (const def of definitions) {
    const tool = createOptimizedTool(
      def.metadata,
      def.handler,
      def.inputSchema
    );
    
    tools.set(def.metadata.name, tool);
  }
  
  return tools;
}

/**
 * Tool definition helpers for common patterns
 */
export const ToolPatterns = {
  // Simple read operation
  read: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `Read ${name} from ${domain}`,
        operation: 'read',
        domain,
        cacheable: true,
      },
      handler,
      inputSchema
    );
  },
  
  // List operation with pagination
  list: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `List ${name} in ${domain}`,
        operation: 'list',
        domain,
        cacheable: true,
      },
      handler,
      inputSchema
    );
  },
  
  // Create operation with cache invalidation
  create: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any,
    invalidationPatterns?: string[]
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `Create ${name} in ${domain}`,
        operation: 'write',
        domain,
        cacheable: false,
        cacheInvalidation: invalidationPatterns || [`{customer}:${domain}:list:*`],
      },
      handler,
      inputSchema
    );
  },
  
  // Update operation
  update: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any,
    invalidationPatterns?: string[]
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `Update ${name} in ${domain}`,
        operation: 'write',
        domain,
        cacheable: false,
        cacheInvalidation: invalidationPatterns || [
          `{customer}:${domain}:get:*`,
          `{customer}:${domain}:list:*`,
        ],
      },
      handler,
      inputSchema
    );
  },
  
  // Delete operation
  delete: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `Delete ${name} from ${domain}`,
        operation: 'write',
        domain,
        cacheable: false,
        cacheInvalidation: [
          `{customer}:${domain}:*`, // Clear all domain cache
        ],
      },
      handler,
      inputSchema
    );
  },
  
  // Status check operation
  status: <T = any>(
    name: string,
    domain: ToolMetadata['domain'],
    handler: (client: any, params: T) => Promise<any>,
    inputSchema?: any
  ): OptimizedTool<T> => {
    return createOptimizedTool(
      {
        name,
        description: `Check ${name} status in ${domain}`,
        operation: 'status',
        domain,
        cacheable: true,
      },
      handler,
      inputSchema
    );
  },
};

/**
 * Register optimized tools with MCP server
 */
export function registerOptimizedTools(
  server: any,
  tools: Map<string, OptimizedTool>
): void {
  for (const [name, tool] of tools) {
    // Register with MCP protocol
    server.registerTool({
      name: `${tool.metadata.domain}.${name}`,
      description: tool.metadata.description,
      inputSchema: tool.inputSchema,
      handler: tool.handler,
    });
  }
  
  // Log registration
  console.log(`[PERF] Registered ${tools.size} optimized tools`);
}

/**
 * Debug helpers for performance analysis
 */
export const ToolDebug = {
  // Compare optimized vs original performance
  benchmark: async <T = any>(
    tool: OptimizedTool<T>,
    client: any,
    params: T,
    iterations = 100
  ): Promise<{
    optimized: { avgTime: number; minTime: number; maxTime: number };
    original: { avgTime: number; minTime: number; maxTime: number };
    improvement: string;
  }> => {
    const runBenchmark = async (handler: any) => {
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await handler(client, params);
        times.push(Date.now() - start);
      }
      
      return {
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
      };
    };
    
    const optimizedStats = await runBenchmark(tool.handler);
    const originalStats = tool.originalHandler 
      ? await runBenchmark(tool.originalHandler)
      : optimizedStats;
    
    const improvement = originalStats.avgTime > 0
      ? ((1 - optimizedStats.avgTime / originalStats.avgTime) * 100).toFixed(2)
      : '0';
    
    return {
      optimized: optimizedStats,
      original: originalStats,
      improvement: `${improvement}%`,
    };
  },
  
  // Get tool performance metrics
  getMetrics: async (toolName: string) => {
    const { PerformanceMonitor } = await import('./index');
    return PerformanceMonitor.getOperationStats(toolName);
  },
};