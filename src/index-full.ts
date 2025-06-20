#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Full Version)
 * Complete implementation with all available tools
 * MCP June 2025 compliant
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  type ListToolsRequest,
  ListToolsRequestSchema,
  McpError,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodSchema } from 'zod';

import { ConfigurationError, ConfigErrorType } from './types/config';
import {
  type BaseMcpParams,
  type McpToolResponse,
  type McpToolMetadata,
} from './types/mcp';
import { type Mcp2025ToolResponse, type McpResponseMeta } from './types/mcp-2025';
import { CustomerConfigManager } from './utils/customer-config';
import { logger } from './utils/logger';

// Import all tools and schemas
import { getAllToolDefinitions } from './tools/all-tools-registry';

/**
 * Tool registry entry with metadata
 */
interface ToolRegistryEntry {
  metadata: McpToolMetadata;
  handler: (params: unknown) => Promise<McpToolResponse>;
}

/**
 * Request context for logging and tracking
 */
interface RequestContext {
  requestId: string;
  toolName: string;
  customer?: string;
  startTime: number;
}

/**
 * Server configuration options
 */
interface ServerConfig {
  name: string;
  version: string;
  capabilities?: {
    tools?: Record<string, unknown>;
    resources?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
  };
}

/**
 * Convert Zod schema to JSON Schema for MCP 2025 compliance
 */
function zodToJsonSchema(schema: ZodSchema): any {
  const zodDef = (schema as any)._def;
  
  if (zodDef.typeName === 'ZodObject') {
    const shape = zodDef.shape() || {};
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as any;
      const fieldDef = fieldSchema._def;
      
      // Get description
      const description = fieldDef.description;
      
      // Determine type
      let type = 'string';
      if (fieldDef.typeName === 'ZodNumber') {type = 'number';}
      else if (fieldDef.typeName === 'ZodBoolean') {type = 'boolean';}
      else if (fieldDef.typeName === 'ZodArray') {type = 'array';}
      else if (fieldDef.typeName === 'ZodObject') {type = 'object';}
      else if (fieldDef.typeName === 'ZodEnum') {
        properties[key] = {
          type: 'string',
          enum: fieldDef.values,
          description,
        };
        if (!fieldSchema.isOptional()) {
          required.push(key);
        }
        continue;
      }
      
      properties[key] = {
        type,
        description,
      };
      
      // Handle arrays
      if (fieldDef.typeName === 'ZodArray') {
        const innerType = fieldDef.type._def.typeName;
        if (innerType === 'ZodString') {
          properties[key].items = { type: 'string' };
        } else if (innerType === 'ZodNumber') {
          properties[key].items = { type: 'number' };
        } else if (innerType === 'ZodObject') {
          properties[key].items = { type: 'object' };
        }
      }
      
      // Check if required
      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
  }
  
  return { type: 'string' };
}

/**
 * Main ALECS MCP Server implementation (Full Version)
 */
export class ALECSFullServer {
  private server: Server;
  private toolRegistry: Map<string, ToolRegistryEntry> = new Map();
  private configManager: CustomerConfigManager;
  private requestCounter = 0;

  constructor(config?: Partial<ServerConfig>) {
    const serverConfig: ServerConfig = {
      name: config?.name || 'alecs-mcp-server-akamai-full',
      version: config?.version || '1.4.0',
      capabilities: {
        tools: {},
        ...config?.capabilities,
      },
    };

    logger.info('Initializing ALECS Full MCP Server', serverConfig);

    this.server = new Server(serverConfig as any, {
      capabilities: serverConfig.capabilities || { tools: {} },
    });

    this.configManager = CustomerConfigManager.getInstance();
    this.setupErrorHandling();
    this.registerAllTools();
    this.setupHandlers();
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    process.on('uncaughtException', (_error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const counter = ++this.requestCounter;
    return `mcp-${timestamp}-${counter}`;
  }

  /**
   * Create request context
   */
  private createRequestContext(toolName: string, params?: unknown): RequestContext {
    const customer = this.extractCustomer(params);
    return {
      requestId: this.generateRequestId(),
      toolName,
      customer,
      startTime: Date.now(),
    };
  }

  /**
   * Extract customer from parameters
   */
  private extractCustomer(params: unknown): string | undefined {
    if (params && typeof params === 'object' && 'customer' in params) {
      return (params as BaseMcpParams).customer;
    }
    return undefined;
  }

  /**
   * Validate customer context
   */
  private validateCustomerContext(customer?: string): void {
    const customerName = customer || 'default';

    if (!this.configManager.hasSection(customerName)) {
      throw new ConfigurationError(
        ConfigErrorType.SECTION_NOT_FOUND,
        `Customer section '${customerName}' not found in configuration`,
        customerName,
      );
    }
  }

  /**
   * Register a tool with the server
   */
  private registerTool(
    name: string,
    description: string,
    inputSchema: ZodSchema,
    handler: (params: unknown) => Promise<McpToolResponse>,
  ): void {
    const metadata: McpToolMetadata = {
      name,
      description,
      inputSchema,
      handler,
    };

    this.toolRegistry.set(name, { metadata, handler });

    logger.debug('Registered tool', { name, description });
  }

  /**
   * Register all available tools
   */
  private registerAllTools(): void {
    // Get all tool definitions
    const allTools = getAllToolDefinitions();
    
    // Register each tool
    for (const toolDef of allTools) {
      this.registerTool(
        toolDef.name,
        toolDef.description,
        toolDef.schema,
        async (params) => this.wrapToolHandler(toolDef.name, params, toolDef.handler),
      );
    }

    logger.info(`Registered ${this.toolRegistry.size} tools in full server`);
  }

  /**
   * Wrap tool handler with common functionality and MCP 2025 compliance
   */
  private async wrapToolHandler(
    toolName: string,
    params: unknown,
    handler: (client: any, params: any) => Promise<any>,
  ): Promise<McpToolResponse> {
    const context = this.createRequestContext(toolName, params);

    logger.info('Tool request received', {
      ...context,
      params: JSON.stringify(params),
    });

    try {
      // Validate customer context
      const customer = this.extractCustomer(params) || 'default';
      this.validateCustomerContext(customer);

      // Import client dynamically to avoid circular dependencies
      const { AkamaiClient } = await import('./akamai-client.js');
      const client = new AkamaiClient();

      // Execute tool handler
      const result = await handler(client, params);

      const duration = Date.now() - context.startTime;

      logger.info('Tool request completed', {
        ...context,
        duration,
        success: true,
      });

      // Build MCP 2025 compliant response metadata
      const meta: McpResponseMeta = {
        timestamp: new Date().toISOString(),
        duration,
        version: '1.4.0',
        customer,
        tool: toolName,
        requestId: context.requestId,
      };

      // Return MCP 2025 compliant response
      const response: Mcp2025ToolResponse = {
        success: true,
        data: result,
        _meta: meta,
      };

      return response as McpToolResponse;
    } catch (_error) {
      const duration = Date.now() - context.startTime;

      logger.error('Tool request failed', {
        ...context,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Build error metadata
      const meta: McpResponseMeta = {
        timestamp: new Date().toISOString(),
        duration,
        version: '1.4.0',
        customer: context.customer || 'default',
        tool: toolName,
        requestId: context.requestId,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      };

      const response: Mcp2025ToolResponse = {
        success: false,
        error: this.formatError(error),
        _meta: meta,
      };

      return response as McpToolResponse;
    }
  }

  /**
   * Format error for response
   */
  private formatError(_error: unknown): string {
    if (error instanceof ConfigurationError) {
      return `Configuration error: ${error.message}`;
    }

    if (error instanceof z.ZodError) {
      return `Validation error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Convert tool metadata to MCP tool format with MCP 2025 compliance
   */
  private toolMetadataToMcpTool(metadata: McpToolMetadata): Tool {
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: zodToJsonSchema(metadata.inputSchema),
    };
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
      logger.debug('List tools request received');

      const tools: Tool[] = [];

      for (const [name, entry] of this.toolRegistry) {
        tools.push(this.toolMetadataToMcpTool(entry.metadata));
      }

      logger.debug(`Returning ${tools.length} tools`);

      return { tools };
    });

    // Handle call tool request
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (_request: CallToolRequest): Promise<CallToolResult> => {
        const { name, arguments: args } = request.params;

        const entry = this.toolRegistry.get(name);

        if (!entry) {
          throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }

        try {
          // Validate parameters
          const validatedParams = entry.metadata.inputSchema.parse(args);

          // Execute handler
          const result = await entry.handler(validatedParams);

          if (!result.success) {
            throw new McpError(ErrorCode.InternalError, result.error || 'Tool execution failed');
          }

          // Format response with MCP 2025 metadata if available
          let responseText = JSON.stringify(result.data, null, 2);
          
          // Check if the result has metadata (cast to check)
          const resultWithMeta = result as any;
          if (resultWithMeta._meta) {
            responseText += `\n\n---\n_meta: ${JSON.stringify(resultWithMeta._meta, null, 2)}`;
          }

          return {
            content: [
              {
                type: 'text',
                text: responseText,
              },
            ],
          };
        } catch (_error) {
          if (error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            );
          }

          if (error instanceof McpError) {
            throw error;
          }

          throw new McpError(ErrorCode.InternalError, this.formatError(error));
        }
      },
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    logger.info('Starting ALECS Full MCP Server');

    try {
      // Validate configuration
      const customers = this.configManager.listSections();
      logger.info(`Found ${customers.length} customer configurations`, { customers });

      // Create and configure transport
      const transport = new StdioServerTransport();

      transport.onerror = (_error: Error) => {
        logger.error('Transport error', { error: error.message, stack: error.stack });
      };

      transport.onclose = () => {
        logger.info('Transport closed, shutting down');
        process.exit(0);
      };

      // Connect server to transport
      await this.server.connect(transport);

      logger.info('ALECS Full MCP Server ready and listening');
    } catch (_error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const server = new ALECSFullServer();
    await server.start();
  } catch (_error) {
    logger.error('Server initialization failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server if this is the main module
if (require.main === module) {
  main();
}

// Export for use as a module
export default ALECSFullServer;