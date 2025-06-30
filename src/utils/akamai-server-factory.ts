/**
 * AKAMAI MCP SERVER FACTORY - UNIFIED TOOL MANAGEMENT
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Central factory for creating Akamai MCP servers with dynamic tool loading
 * Approach: Registry-based architecture with filtering capabilities
 * Implementation: Type-safe, well-documented, production-ready
 * 
 * KAIZEN IMPROVEMENTS FROM PREVIOUS VERSION:
 * 1. Renamed from "modular-server-factory" to "akamai-server-factory" (clarity)
 * 2. Class renamed from "ModularServer" to "AkamaiMCPServer" (descriptive)
 * 3. Function renamed from "createModularServer" to "createAkamaiServer" (intuitive)
 * 4. Added comprehensive error handling with actionable messages
 * 5. Improved schema parsing with proper Zod type handling
 * 
 * ARCHITECTURE BENEFITS:
 * ✅ Single source of truth for all 171 Akamai tools
 * ✅ Dynamic tool loading based on customer needs
 * ✅ Type-safe parameter validation
 * ✅ Multi-tenant ready with customer context
 * ✅ Performance optimized with lazy loading potential
 * 
 * FUTURE KAIZEN OPPORTUNITIES:
 * 1. Add tool usage analytics/metrics
 * 2. Implement tool-level rate limiting
 * 3. Add caching layer for frequently used tools
 * 4. Support hot-reloading of tool definitions
 * 5. Add tool versioning support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z, ZodType, ZodTypeDef, ZodObject, ZodRawShape } from 'zod';

import { logger } from './logger';
import { getTransportFromEnv } from '../config/transport-config';
import { AkamaiClient } from '../akamai-client';

// Import the complete tool registry
import { getAllToolDefinitions, type ToolDefinition } from '../tools/all-tools-registry';

/**
 * Server configuration with enhanced type safety
 */
interface ServerConfig {
  name: string;
  version: string;
  /**
   * Optional filter to load only specific tools
   * Use cases:
   * - Customer-specific tool sets based on licensing
   * - Feature flags for gradual rollout
   * - Performance optimization (load only needed tools)
   * - A/B testing of new features
   */
  toolFilter?: (tool: ToolDefinition) => boolean;
  /**
   * Optional performance settings
   */
  performance?: {
    enableCaching?: boolean;
    maxConcurrentTools?: number;
    toolTimeout?: number; // milliseconds
  };
}

/**
 * AkamaiMCPServer - Production-ready MCP server for Akamai APIs
 * 
 * CODE KAI: This class embodies the principle of "one class, one responsibility"
 * It manages the entire lifecycle of an MCP server with Akamai tools
 */
export class AkamaiMCPServer {
  private server: Server;
  private tools: Map<string, ToolDefinition> = new Map();
  private config: ServerConfig;
  private toolExecutionCount: Map<string, number> = new Map();

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize server with tools
    this.loadTools();
    this.setupHandlers();
  }

  /**
   * Load tools from the central registry with enhanced error handling
   * 
   * KAIZEN: Added detailed logging and error recovery
   */
  private loadTools(): void {
    try {
      const allTools = getAllToolDefinitions();
      
      // Apply optional filter with error handling
      const toolsToLoad = this.config.toolFilter 
        ? allTools.filter((tool) => {
            try {
              return this.config.toolFilter!(tool);
            } catch (error) {
              logger.error(`Tool filter error for ${tool.name}:`, error);
              return false; // Skip tools that cause filter errors
            }
          })
        : allTools;
      
      logger.info(`Loading ${toolsToLoad.length} of ${allTools.length} available tools`);
      
      // Load tools with validation
      let loadedCount = 0;
      for (const tool of toolsToLoad) {
        try {
          this.validateTool(tool);
          this.tools.set(tool.name, tool);
          loadedCount++;
        } catch (error) {
          logger.error(`Failed to load tool ${tool.name}:`, error);
        }
      }
      
      logger.info(`Successfully loaded ${loadedCount} tools`);
    } catch (error) {
      logger.error('Critical error loading tools:', error);
      throw new Error('Failed to initialize tool registry');
    }
  }

  /**
   * Validate tool definition before loading
   * CODE KAI: Defensive programming - validate early, fail fast
   */
  private validateTool(tool: ToolDefinition): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }
    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error(`Tool ${tool.name} must have a description`);
    }
    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error(`Tool ${tool.name} must have a handler function`);
    }
  }

  /**
   * Convert Zod schema to JSON Schema for MCP compatibility
   * KAIZEN: Improved schema conversion with proper TypeScript types (no any!)
   */
  private zodToJsonSchema(zodSchema: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
    try {
      // Handle ZodObject types with proper typing
      if (zodSchema instanceof ZodObject) {
        const shape = zodSchema.shape as ZodRawShape;
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [key, fieldSchema] of Object.entries(shape)) {
          properties[key] = this.zodFieldToJsonSchema(fieldSchema);
          
          // Check if field is required using proper Zod API
          // A field is required if it's not wrapped in ZodOptional
          const typeName = fieldSchema._def.typeName;
          if (typeName !== z.ZodFirstPartyTypeKind.ZodOptional) {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          ...(required.length > 0 && { required }),
          additionalProperties: false,
        };
      }

      // Fallback for non-object schemas
      return { type: 'object', properties: {} };
    } catch (error) {
      logger.warn('Schema conversion error:', error);
      return { type: 'object', properties: {} };
    }
  }

  /**
   * Convert individual Zod field to JSON Schema
   * CODE KAI: Comprehensive type mapping with proper TypeScript types
   */
  private zodFieldToJsonSchema(field: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
    // Use instanceof checks instead of accessing internal _def properties
    if (field instanceof z.ZodString) {
      const schema: Record<string, unknown> = { type: 'string' };
      const description = field['description'];
      if (description) schema['description'] = description;
      return schema;
    }
    
    if (field instanceof z.ZodNumber) {
      const schema: Record<string, unknown> = { type: 'number' };
      const description = field['description'];
      if (description) schema['description'] = description;
      return schema;
    }
    
    if (field instanceof z.ZodBoolean) {
      const schema: Record<string, unknown> = { type: 'boolean' };
      const description = field['description'];
      if (description) schema['description'] = description;
      return schema;
    }
    
    if (field instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodFieldToJsonSchema(field.element),
      };
    }
    
    if (field instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: field.options,
      };
    }
    
    if (field instanceof z.ZodOptional) {
      return this.zodFieldToJsonSchema(field.unwrap());
    }
    
    if (field instanceof z.ZodUnion) {
      // Handle union types
      const options = field.options;
      
      // Handle nullable types (union with null)
      if (options.length === 2) {
        const hasNull = options.some((opt: ZodType) => opt instanceof z.ZodNull);
        if (hasNull) {
          const nonNullOption = options.find((opt: ZodType) => !(opt instanceof z.ZodNull));
          if (nonNullOption) {
            return this.zodFieldToJsonSchema(nonNullOption);
          }
        }
      }
      
      // For other unions, default to string
      return { type: 'string' };
    }
    
    if (field instanceof z.ZodObject) {
      // Recursively handle nested objects
      return this.zodToJsonSchema(field);
    }
    
    // Safe fallback for unhandled types
    return { type: 'string' };
  }

  private setupHandlers() {
    /**
     * LIST TOOLS HANDLER - Enhanced with metrics
     */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map(tool => {
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.schema ? this.zodToJsonSchema(tool.schema) : undefined,
          // Note: MCP doesn't support custom metadata in tool definitions
          // We track execution count internally but don't expose it in the API
        };
      });

      logger.info(`Returning ${tools.length} tools to client`);
      return { tools };
    });

    /**
     * CALL TOOL HANDLER - Production-ready with comprehensive error handling
     */
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;
      
      try {
        // Find tool
        const tool = this.tools.get(name);
        if (!tool) {
          const availableTools = Array.from(this.tools.keys()).slice(0, 10).join(', ');
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${name}' not found. Available tools include: ${availableTools}...`
          );
        }

        // Track usage
        this.toolExecutionCount.set(name, (this.toolExecutionCount.get(name) || 0) + 1);

        // Validate arguments with proper Zod error handling
        if (tool.schema) {
          const parseResult = tool.schema.safeParse(args);
          if (!parseResult.success) {
            const zodError = parseResult.error;
            const issues = zodError.errors.map(err => {
              const path = err.path.length > 0 ? err.path.join('.') + ': ' : '';
              return `${path}${err.message}`;
            }).join(', ');
            
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters for '${name}': ${issues}`
            );
          }
        }

        // Create customer-specific client
        const customerName = args?.['customer'] as string || 'default';
        logger.info(`Executing tool '${name}' for customer '${customerName}'`);
        
        const client = new AkamaiClient(customerName);

        // Execute with timeout
        const timeout = this.config.performance?.toolTimeout || 300000; // 5 min default
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tool execution timeout')), timeout);
        });

        const response = await Promise.race([
          tool.handler(client, args || {}),
          timeoutPromise,
        ]);
        
        // Log execution time
        const duration = Date.now() - startTime;
        logger.info(`Tool '${name}' completed in ${duration}ms`);
        
        // Return MCP-formatted response
        return response.content[0] || { type: 'text', text: 'No content returned' };

      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Tool '${name}' failed after ${duration}ms:`, error);
        
        // Re-throw MCP errors
        if (error instanceof McpError) {
          throw error;
        }
        
        // Wrap other errors with context
        throw new McpError(
          ErrorCode.InternalError,
          `Tool '${name}' failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async start(): Promise<void> {
    const transportConfig = getTransportFromEnv();
    
    if (transportConfig.type === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info(`Akamai MCP Server started with ${this.tools.size} tools`);
    } else {
      throw new Error(`Transport type ${transportConfig.type} not supported yet`);
    }
  }

  /**
   * Get server instance for testing or advanced usage
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get loaded tools for introspection
   */
  getLoadedTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool execution metrics
   */
  getMetrics(): { toolName: string; executionCount: number }[] {
    return Array.from(this.toolExecutionCount.entries()).map(([toolName, count]) => ({
      toolName,
      executionCount: count,
    }));
  }
}

/**
 * Create an Akamai MCP server with configurable tool sets
 * 
 * CODE KAI IMPLEMENTATION:
 * - Clear, intuitive naming (createAkamaiServer vs createModularServer)
 * - Comprehensive documentation with examples
 * - Type-safe configuration
 * - Production-ready error handling
 * 
 * @example
 * // Create server with all tools
 * const server = await createAkamaiServer({
 *   name: 'akamai-mcp',
 *   version: '1.6.2'
 * });
 * 
 * @example
 * // Create server with only DNS tools
 * const server = await createAkamaiServer({
 *   name: 'akamai-dns',
 *   version: '1.6.2',
 *   toolFilter: (tool) => tool.name.includes('dns')
 * });
 */
export async function createAkamaiServer(config: ServerConfig): Promise<AkamaiMCPServer> {
  return new AkamaiMCPServer(config);
}

// Maintain backward compatibility
export const createModularServer = createAkamaiServer;
export { AkamaiMCPServer as ModularServer };