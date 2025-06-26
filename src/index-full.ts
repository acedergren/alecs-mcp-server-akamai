#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Full Version)
 * Complete implementation with all available tools
 * MCP June 2025 compliant
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { getTransportFromEnv, getTransportDescription } from './config/transport-config';
import { createTransport, startServerWithTransport } from './utils/transport-factory';
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
import { AkamaiClient } from './akamai-client';
import { handleAkamaiError, ErrorType } from './utils/enhanced-error-handling';
import { mapToMcpErrorCode, createMcpErrorMessage } from './utils/mcp-error-mapping';

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
  private akamaiClient: AkamaiClient;

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
    this.akamaiClient = new AkamaiClient();
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

      // Execute tool handler with pre-instantiated client
      const result = await handler(this.akamaiClient, params);

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

          // Check if result.data already has the MCP content format
          if (result.data && typeof result.data === 'object' && 'content' in result.data) {
            return result.data as CallToolResult;
          }
          
          // For backward compatibility, wrap non-content responses
          return {
            content: [
              {
                type: 'text',
                text: typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2),
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

          // Map Akamai errors to MCP error codes
          const errorResult = handleAkamaiError(_error, {
            operation: `execute tool ${name}`,
            endpoint: 'unknown',
            customer: this.extractCustomer(args)
          });
          
          const httpStatus = (_error as any).response?.status || (_error as any).status || 500;
          const mcpErrorCode = mapToMcpErrorCode(
            httpStatus,
            errorResult.errorType
          );
          
          const mcpMessage = createMcpErrorMessage(
            errorResult.userMessage || this.formatError(_error),
            errorResult.errorCode,
            errorResult.requestId
          );

          throw new McpError(mcpErrorCode, mcpMessage);
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

      // Determine transport based on configuration
      const transportConfig = getTransportFromEnv();
      logger.info(`Using transport: ${getTransportDescription(transportConfig)}`);
      
      if (transportConfig.type === 'stdio') {
        // Use built-in stdio transport
        const transport = new StdioServerTransport();

        transport.onerror = (_error: Error) => {
          logger.error('Transport error', { error: _error.message, stack: _error.stack });
        };

        transport.onclose = () => {
          logger.info('Transport closed, shutting down');
          process.exit(0);
        };

        await this.server.connect(transport);
      } else {
        // Use transport factory for other transports
        await startServerWithTransport(this.server, transportConfig);
      }

      logger.info('ALECS Full MCP Server ready and listening', {
        transport: getTransportDescription(transportConfig),
        totalTools: this.toolRegistry.size,
        categories: Array.from(
          new Set(
            Array.from(this.toolRegistry.keys()).map((name) => name.split('.')[0]),
          ),
        ),
      });
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
