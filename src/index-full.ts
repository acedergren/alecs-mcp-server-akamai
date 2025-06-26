#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Full Version)
 * Complete implementation with all available tools
 * MCP June 2025 compliant
 */

// Register module aliases before any other imports
import 'module-alias/register';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
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
import { zodToJsonSchema } from 'zod-to-json-schema';

import { ConfigurationError, ConfigErrorType } from './types/config';
import { type BaseMcpParams, type McpToolResponse, type McpToolMetadata } from './types/mcp';
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
 * Main ALECS MCP Server implementation (Full Version)
 */
export class ALECSFullServer {
  public server: Server;
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
      logger.error('Uncaught exception', { error: _error.message, stack: _error.stack });
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
      this.registerTool(toolDef.name, toolDef.description, toolDef.schema, async (params) =>
        this.wrapToolHandler(toolDef.name, params, toolDef.handler),
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
        error: _error instanceof Error ? _error.message : String(_error),
        stack: _error instanceof Error ? _error.stack : undefined,
      });

      // Build error metadata
      const meta: McpResponseMeta = {
        timestamp: new Date().toISOString(),
        duration,
        version: '1.4.0',
        customer: context.customer || 'default',
        tool: toolName,
        requestId: context.requestId,
        errorType: _error instanceof Error ? _error.constructor.name : 'UnknownError',
      };

      const response: Mcp2025ToolResponse = {
        success: false,
        error: this.formatError(_error),
        _meta: meta,
      };

      return response as McpToolResponse;
    }
  }

  /**
   * Format error for response
   */
  private formatError(_error: unknown): string {
    if (_error instanceof ConfigurationError) {
      return `Configuration error: ${_error.message}`;
    }

    if (_error instanceof z.ZodError) {
      return `Validation error: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    if (_error instanceof Error) {
      return _error.message;
    }

    return String(_error);
  }

  /**
   * Convert tool metadata to MCP tool format with MCP 2025 compliance
   */
  private toolMetadataToMcpTool(metadata: McpToolMetadata): Tool {
    // Use the proper zod-to-json-schema converter for MCP compliance
    const jsonSchema = zodToJsonSchema(metadata.inputSchema, {
      target: 'jsonSchema7',  // Ensure JSON Schema Draft 7 compliance
      $refStrategy: 'none',   // Avoid $ref for simpler schemas
    }) as any;

    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: jsonSchema,
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

      for (const [_name, entry] of this.toolRegistry) {
        tools.push(this.toolMetadataToMcpTool(entry.metadata));
      }

      logger.debug(`Returning ${tools.length} tools`);

      return { tools };
    });

    // Handle call tool request
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (_request: CallToolRequest): Promise<CallToolResult> => {
        const { name, arguments: args } = _request.params;

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
          if (_error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            );
          }

          if (_error instanceof McpError) {
            throw _error;
          }

          throw new McpError(ErrorCode.InternalError, this.formatError(_error));
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
        logger.error('Transport error', { error: _error.message, stack: _error.stack });
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
        error: _error instanceof Error ? _error.message : String(_error),
        stack: _error instanceof Error ? _error.stack : undefined,
      });
      throw _error;
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
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
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
