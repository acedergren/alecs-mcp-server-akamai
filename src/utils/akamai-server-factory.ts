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
import { MCPToolResponse } from '../types/mcp-protocol';
import { MCPCompatibilityWrapper } from './mcp-compatibility-wrapper';

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
  private compatibilityWrapper?: MCPCompatibilityWrapper;

  constructor(config: ServerConfig) {
    console.error('[BANG] AkamaiMCPServer constructor starting...');
    console.error('[BANG] Config:', JSON.stringify(config, null, 2));
    
    this.config = config;
    
    // Create server - FAIL if this throws
    console.error('[BANG] Creating MCP Server instance...');
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
    console.error('[BANG] MCP Server instance created successfully');

    // Create compatibility wrapper for Claude Desktop support
    const disableWrapper = process.env['DISABLE_COMPATIBILITY_WRAPPER'];
    console.error(`[BANG] Compatibility wrapper disabled: ${disableWrapper || 'false'}`);
    
    if (!disableWrapper) {
      console.error('[BANG] Creating MCPCompatibilityWrapper...');
      this.compatibilityWrapper = new MCPCompatibilityWrapper(this.server, {
        enableLegacySupport: true
      });
      console.error('[BANG] MCPCompatibilityWrapper created successfully');
    }

    // Initialize server with tools - These will throw on error
    console.error('[BANG] Loading tools...');
    this.loadTools();
    
    console.error('[BANG] Setting up handlers...');
    this.setupHandlers();
    
    console.error('[BANG] AkamaiMCPServer constructor completed successfully');
  }

  /**
   * Load tools from the central registry - FAIL FAST on any error
   * 
   * REFACTORED: Remove graceful degradation - fail immediately on any issue
   */
  private loadTools(): void {
    console.error('[BANG] Starting tool loading...');
    
    const allTools = getAllToolDefinitions();
    console.error(`[BANG] Found ${allTools.length} tools in registry`);
    
    // Apply filter - FAIL if filter throws
    const toolsToLoad = this.config.toolFilter 
      ? allTools.filter((tool) => {
          const result = this.config.toolFilter!(tool);
          if (!result) {
            console.error(`[BANG] Tool ${tool.name} filtered out`);
          }
          return result;
        })
      : allTools;
    
    console.error(`[BANG] Will load ${toolsToLoad.length} tools after filtering`);
    
    // Load tools - FAIL on first error
    for (const tool of toolsToLoad) {
      console.error(`[BANG] Loading tool: ${tool.name}`);
      
      // Validate tool - throws on error
      this.validateTool(tool);
      
      // Check for duplicates - throws on error
      if (this.tools.has(tool.name)) {
        const error = new Error(`[BANG] DUPLICATE TOOL NAME: ${tool.name} already exists!`);
        console.error(error.message);
        throw error;
      }
      
      this.tools.set(tool.name, tool);
    }
    
    console.error(`[BANG] SUCCESSFULLY LOADED ${this.tools.size} TOOLS`);
    
    // FAIL if no tools loaded
    if (this.tools.size === 0) {
      const error = new Error('[BANG] CRITICAL: NO TOOLS LOADED! Server cannot function without tools.');
      console.error(error.message);
      throw error;
    }
  }

  /**
   * Validate tool definition - FAIL LOUDLY with specific errors
   */
  private validateTool(tool: ToolDefinition): void {
    // Check tool object exists
    if (!tool || typeof tool !== 'object') {
      const error = new Error('[BANG] INVALID TOOL: Tool definition is not an object!');
      console.error(error.message, { received: tool, type: typeof tool });
      throw error;
    }
    
    // Validate tool name
    if (!tool.name || typeof tool.name !== 'string' || tool.name.trim().length === 0) {
      const error = new Error(`[BANG] INVALID TOOL NAME: Got ${typeof tool.name} "${tool.name}" - must be non-empty string!`);
      console.error(error.message);
      throw error;
    }
    
    // Validate naming conventions for MCP compatibility
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(tool.name) && tool.name.length > 1) {
      const error = new Error(`[BANG] INVALID TOOL NAME FORMAT: "${tool.name}" - must be kebab-case (lowercase, hyphens only)!`);
      console.error(error.message);
      throw error;
    }
    
    // Validate description
    if (!tool.description || typeof tool.description !== 'string' || tool.description.trim().length === 0) {
      const error = new Error(`[BANG] MISSING DESCRIPTION: Tool "${tool.name}" has no description!`);
      console.error(error.message);
      throw error;
    }
    
    // Validate handler function
    if (!tool.handler || typeof tool.handler !== 'function') {
      const error = new Error(`[BANG] MISSING HANDLER: Tool "${tool.name}" has no handler function! Got ${typeof tool.handler}`);
      console.error(error.message);
      throw error;
    }
    
    // Validate schema (optional but if present, must be valid)
    if (tool.schema !== undefined && typeof tool.schema !== 'object') {
      const error = new Error(`[BANG] INVALID SCHEMA: Tool "${tool.name}" schema is not an object! Got ${typeof tool.schema}`);
      console.error(error.message);
      throw error;
    }
    
    // Check if tool name contains reserved words
    const reservedWords = ['list', 'call', 'tool', 'mcp', 'server', 'client'];
    if (reservedWords.some(word => tool.name === word)) {
      const error = new Error(`[BANG] RESERVED WORD: Tool name "${tool.name}" is a reserved MCP word!`);
      console.error(error.message);
      throw error;
    }
  }

  /**
   * Convert Zod schema to JSON Schema for MCP compatibility
   * KAIZEN: Defensive schema conversion with comprehensive error handling
   */
  private zodToJsonSchema(zodSchema: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
    try {
      // DEFENSIVE: Handle null/undefined schemas
      if (!zodSchema) {
        logger.warn('Received null/undefined schema, returning default object schema');
        return { type: 'object', properties: {}, additionalProperties: false };
      }

      // Handle ZodObject types with proper typing
      if (zodSchema instanceof ZodObject) {
        const shape = zodSchema.shape as ZodRawShape;
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        // DEFENSIVE: Validate shape exists
        if (!shape || typeof shape !== 'object') {
          logger.warn('Invalid Zod object shape, using empty properties');
          return { type: 'object', properties: {}, additionalProperties: false };
        }

        for (const [key, fieldSchema] of Object.entries(shape)) {
          try {
            // DEFENSIVE: Validate field schema before processing
            if (fieldSchema && typeof fieldSchema === 'object') {
              properties[key] = this.zodFieldToJsonSchema(fieldSchema);
              
              // Check if field is required using proper Zod API
              // A field is required if it's not wrapped in ZodOptional
              const typeName = fieldSchema._def?.typeName;
              if (typeName && typeName !== z.ZodFirstPartyTypeKind.ZodOptional) {
                required.push(key);
              }
            } else {
              // DEFENSIVE: Skip invalid field schemas
              logger.warn(`Skipping invalid field schema for key: ${key}`);
            }
          } catch (fieldError) {
            logger.warn(`Error processing field '${key}':`, fieldError);
            // DEFENSIVE: Continue processing other fields
            properties[key] = { type: 'string', description: 'Field schema conversion failed' };
          }
        }

        return {
          type: 'object',
          properties,
          ...(required.length > 0 && { required }),
          additionalProperties: false,
          // KAIZEN: Add schema metadata for debugging
          $schema: 'http://json-schema.org/draft-07/schema#',
        };
      }

      // DEFENSIVE: Handle non-object schemas gracefully
      logger.warn('Non-object Zod schema provided, converting to object schema');
      return { 
        type: 'object', 
        properties: {},
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
      };
    } catch (error) {
      logger.error('Critical schema conversion error:', error);
      // DEFENSIVE: Return a valid fallback schema that won't break MCP
      return { 
        type: 'object', 
        properties: {},
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#',
        description: 'Schema conversion failed - using fallback'
      };
    }
  }

  /**
   * Convert individual Zod field to JSON Schema
   * KAIZEN: Enhanced with defensive programming and comprehensive error handling
   */
  private zodFieldToJsonSchema(field: ZodType<unknown, ZodTypeDef, unknown>): Record<string, unknown> {
    try {
      // DEFENSIVE: Validate field exists
      if (!field) {
        logger.warn('Null/undefined field provided to zodFieldToJsonSchema');
        return { type: 'string', description: 'Field schema conversion failed' };
      }

      // DEFENSIVE: Handle ZodString with constraints validation
      if (field instanceof z.ZodString) {
        const schema: Record<string, unknown> = { type: 'string' };
        
        try {
          const description = field['description'];
          if (description && typeof description === 'string') {
            schema['description'] = description;
          }
          
          // KAIZEN: Extract string constraints if available
          const def = (field as any)._def;
          if (def && typeof def === 'object') {
            if (def.minLength !== null && def.minLength !== undefined) {
              schema['minLength'] = def.minLength;
            }
            if (def.maxLength !== null && def.maxLength !== undefined) {
              schema['maxLength'] = def.maxLength;
            }
          }
        } catch (descError) {
          logger.warn('Error extracting string field metadata:', descError);
        }
        
        return schema;
      }
      
      // DEFENSIVE: Handle ZodNumber with constraints validation
      if (field instanceof z.ZodNumber) {
        const schema: Record<string, unknown> = { type: 'number' };
        
        try {
          const description = field['description'];
          if (description && typeof description === 'string') {
            schema['description'] = description;
          }
          
          // KAIZEN: Extract number constraints if available
          const def = (field as any)._def;
          if (def && typeof def === 'object') {
            if (def.minimum !== null && def.minimum !== undefined) {
              schema['minimum'] = def.minimum;
            }
            if (def.maximum !== null && def.maximum !== undefined) {
              schema['maximum'] = def.maximum;
            }
          }
        } catch (descError) {
          logger.warn('Error extracting number field metadata:', descError);
        }
        
        return schema;
      }
      
      // DEFENSIVE: Handle ZodBoolean
      if (field instanceof z.ZodBoolean) {
        const schema: Record<string, unknown> = { type: 'boolean' };
        
        try {
          const description = field['description'];
          if (description && typeof description === 'string') {
            schema['description'] = description;
          }
        } catch (descError) {
          logger.warn('Error extracting boolean field metadata:', descError);
        }
        
        return schema;
      }
      
      // DEFENSIVE: Handle ZodArray with element validation
      if (field instanceof z.ZodArray) {
        try {
          const element = (field as any).element;
          if (!element) {
            logger.warn('ZodArray missing element schema');
            return { type: 'array', items: { type: 'string' } };
          }
          
          return {
            type: 'array',
            items: this.zodFieldToJsonSchema(element),
          };
        } catch (arrayError) {
          logger.warn('Error processing ZodArray:', arrayError);
          return { type: 'array', items: { type: 'string' } };
        }
      }
      
      // DEFENSIVE: Handle ZodEnum with options validation
      if (field instanceof z.ZodEnum) {
        try {
          const options = (field as any).options;
          if (!Array.isArray(options) || options.length === 0) {
            logger.warn('ZodEnum missing or empty options');
            return { type: 'string' };
          }
          
          return {
            type: 'string',
            enum: options,
          };
        } catch (enumError) {
          logger.warn('Error processing ZodEnum:', enumError);
          return { type: 'string' };
        }
      }
      
      // DEFENSIVE: Handle ZodOptional
      if (field instanceof z.ZodOptional) {
        try {
          const unwrapped = field.unwrap();
          if (!unwrapped) {
            logger.warn('ZodOptional failed to unwrap');
            return { type: 'string' };
          }
          
          return this.zodFieldToJsonSchema(unwrapped);
        } catch (optionalError) {
          logger.warn('Error processing ZodOptional:', optionalError);
          return { type: 'string' };
        }
      }
      
      // DEFENSIVE: Handle ZodUnion with comprehensive validation
      if (field instanceof z.ZodUnion) {
        try {
          const options = (field as any).options;
          if (!Array.isArray(options)) {
            logger.warn('ZodUnion missing options array');
            return { type: 'string' };
          }
          
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
          
          // KAIZEN: For complex unions, try to find a common type
          const types = options.map((opt: ZodType) => {
            try {
              if (opt instanceof z.ZodString) return 'string';
              if (opt instanceof z.ZodNumber) return 'number';
              if (opt instanceof z.ZodBoolean) return 'boolean';
              return 'string';
            } catch {
              return 'string';
            }
          });
          
          const uniqueTypes = [...new Set(types)];
          if (uniqueTypes.length === 1) {
            return { type: uniqueTypes[0] };
          }
          
          // For mixed unions, default to string with enum if possible
          return { type: 'string' };
        } catch (unionError) {
          logger.warn('Error processing ZodUnion:', unionError);
          return { type: 'string' };
        }
      }
      
      // DEFENSIVE: Handle ZodObject recursively
      if (field instanceof z.ZodObject) {
        try {
          return this.zodToJsonSchema(field);
        } catch (objectError) {
          logger.warn('Error processing nested ZodObject:', objectError);
          return { type: 'object', properties: {}, additionalProperties: false };
        }
      }
      
      // KAIZEN: Handle additional Zod types
      if (field instanceof z.ZodLiteral) {
        try {
          const value = (field as any)._def?.value;
          if (value !== undefined) {
            return { 
              type: typeof value,
              const: value
            };
          }
        } catch (literalError) {
          logger.warn('Error processing ZodLiteral:', literalError);
        }
      }
      
      if (field instanceof z.ZodDate) {
        return { 
          type: 'string', 
          format: 'date-time',
          description: 'ISO 8601 date-time string'
        };
      }
      
      // DEFENSIVE: Log unhandled Zod types for debugging
      const typeName = (field as any)._def?.typeName || field.constructor.name;
      logger.warn(`Unhandled Zod type: ${typeName}, falling back to string type`);
      
      // Safe fallback for unhandled types
      return { 
        type: 'string',
        description: `Unhandled Zod type: ${typeName}`
      };
      
    } catch (error) {
      logger.error('Critical error in zodFieldToJsonSchema:', error);
      // DEFENSIVE: Return valid fallback that won't break MCP
      return { 
        type: 'string',
        description: 'Field schema conversion failed'
      };
    }
  }

  private setupHandlers() {
    /**
     * LEGACY SUPPORT: Claude Desktop Compatibility
     * 
     * Claude Desktop currently uses MCP protocol version 2024-11-05
     * while our server is built for 2025-06-18. This compatibility
     * wrapper handles the differences in response formats.
     * 
     * REMOVAL CHECKLIST (when Claude Desktop updates):
     * [ ] Verify Claude Desktop uses protocol 2025-06-18 or newer
     * [ ] Remove MCPCompatibilityWrapper import
     * [ ] Remove compatibilityWrapper property from class
     * [ ] Remove compatibilityWrapper initialization in constructor
     * [ ] Remove this entire if block
     * [ ] Test thoroughly with updated Claude Desktop
     * 
     * TRACKED IN: https://github.com/anthropics/claude-desktop/issues/XXX
     * LAST CHECKED: 2025-01-30
     */
    if (this.compatibilityWrapper) {
      this.compatibilityWrapper.setupCompatibilityHandlers(
        this.tools,
        (schema) => this.zodToJsonSchema(schema)
      );
      return;
    }

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
        
        // KAIZEN FIX: Convert MCPToolResponse to MCP SDK CallToolResult format
        // Our tools return MCPToolResponse but MCP SDK expects CallToolResult
        const mcpResponse = response as MCPToolResponse;
        const callToolResult = {
          content: mcpResponse.content,
          isError: mcpResponse.isError || false,
          // Add _meta if needed for MCP protocol compliance
          ...(mcpResponse.isError && { _meta: { error: true } })
        };
        
        return callToolResult;

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
    console.error('[BANG] Server start() called...');
    
    const transportConfig = getTransportFromEnv();
    console.error('[BANG] Transport config:', JSON.stringify(transportConfig));
    
    if (transportConfig.type === 'stdio') {
      console.error('[BANG] Creating StdioServerTransport...');
      const transport = new StdioServerTransport();
      
      console.error('[BANG] Connecting server to transport...');
      try {
        await this.server.connect(transport);
        console.error(`[BANG] SERVER STARTED SUCCESSFULLY WITH ${this.tools.size} TOOLS!`);
        console.error('[BANG] Server is now waiting for JSON-RPC messages on stdio...');
      } catch (error) {
        console.error('[BANG] FAILED TO CONNECT TO TRANSPORT!', error);
        throw new Error(`[BANG] Transport connection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      const error = new Error(`[BANG] UNSUPPORTED TRANSPORT TYPE: ${transportConfig.type} - only 'stdio' is supported!`);
      console.error(error.message);
      throw error;
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
  console.error('[BANG] createAkamaiServer called with config:', JSON.stringify(config, null, 2));
  
  try {
    const server = new AkamaiMCPServer(config);
    console.error('[BANG] AkamaiMCPServer instance created successfully');
    return server;
  } catch (error) {
    console.error('[BANG] FAILED TO CREATE AKAMAI SERVER!', error);
    throw new Error(`[BANG] Server creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Maintain backward compatibility
export const createModularServer = createAkamaiServer;
export { AkamaiMCPServer as ModularServer };