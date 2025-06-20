#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai
 * A fully typed MCP server implementation with comprehensive error handling
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

import {
  // listZones,
  // getZone,
  createZone,
  // listRecords,
  upsertRecord,
  // deleteRecord,
} from './tools/dns-tools';
// import { listProducts } from './tools/product-tools';
import {
  activateProperty,
} from './tools/property-manager-tools';
import {
  listProperties,
  getProperty,
  createProperty,
  listContracts,
} from './tools/property-tools';
import { ConfigurationError, ConfigErrorType } from './types/config';
import {
  type BaseMcpParams,
  type McpToolResponse,
  type McpToolMetadata,
  ListPropertiesSchema,
  GetPropertySchema,
  CreatePropertySchema,
  ActivatePropertySchema,
  CreateZoneSchema,
  CreateRecordSchema,
} from './types/mcp';
import { CustomerConfigManager } from './utils/customer-config';
import { logger } from './utils/logger';

// Import tool implementations

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
 * Main ALECS MCP Server implementation
 */
export class ALECSServer {
  private server: Server;
  private toolRegistry: Map<string, ToolRegistryEntry> = new Map();
  private configManager: CustomerConfigManager;
  private requestCounter = 0;

  constructor(config?: Partial<ServerConfig>) {
    const serverConfig: ServerConfig = {
      name: config?.name || 'alecs-mcp-server-akamai',
      version: config?.version || '1.3.0',
      capabilities: {
        tools: {},
        ...config?.capabilities,
      },
    };

    logger.info('Initializing ALECS MCP Server', serverConfig);

    this.server = new Server(serverConfig as any, {
      capabilities: serverConfig.capabilities || { tools: {} },
    });

    this.configManager = CustomerConfigManager.getInstance();
    this.setupErrorHandling();
    this.registerTools();
    this.setupHandlers();
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: _error.stack });
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
   * Register minimal set of essential tools
   * For full tool set, use index-full.ts
   */
  private registerTools(): void {
    // Property Management Tools (Essential)
    this.registerTool(
      'list-properties',
      'List all Akamai CDN properties in your account',
      ListPropertiesSchema,
      async (params) => this.wrapToolHandler('list-properties', params, listProperties),
    );

    this.registerTool(
      'get-property',
      'Get details of a specific property',
      GetPropertySchema,
      async (params) => this.wrapToolHandler('get-property', params, getProperty),
    );

    this.registerTool(
      'create-property',
      'Create a new property',
      CreatePropertySchema,
      async (params) => this.wrapToolHandler('create-property', params, createProperty),
    );

    this.registerTool(
      'activate-property',
      'Activate a property version',
      ActivatePropertySchema,
      async (params) => this.wrapToolHandler('activate-property', params, activateProperty),
    );

    this.registerTool(
      'list-contracts',
      'List all Akamai contracts',
      z.object({
        customer: z.string().optional(),
        searchTerm: z.string().optional(),
      }),
      async (params) => this.wrapToolHandler('list-contracts', params, listContracts),
    );

    // DNS Tools (Essential)
    this.registerTool('create-zone', 'Create a new DNS zone', CreateZoneSchema, async (params) =>
      this.wrapToolHandler('create-zone', params, createZone),
    );

    this.registerTool('create-record', 'Create a DNS record', CreateRecordSchema, async (params) =>
      this.wrapToolHandler('create-record', params, upsertRecord),
    );

    logger.info(`Registered ${this.toolRegistry.size} essential tools (use dev:full for all tools)`);
  }

  /**
   * Wrap tool handler with common functionality
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

      return {
        success: true,
        data: result,
        metadata: {
          customer,
          duration,
          tool: toolName,
        },
      };
    } catch (error) {
      const duration = Date.now() - context.startTime;

      logger.error('Tool request failed', {
        ...context,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? _error.stack : undefined,
      });

      return {
        success: false,
        error: this.formatError(_error),
        metadata: {
          customer: context.customer || 'default',
          duration,
          tool: toolName,
        },
      };
    }
  }

  /**
   * Format error for response
   */
  private formatError(error: unknown): string {
    if (_error instanceof ConfigurationError) {
      return `Configuration error: ${error.message}`;
    }

    if (_error instanceof z.ZodError) {
      return `Validation error: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Convert tool metadata to MCP tool format
   */
  private toolMetadataToMcpTool(metadata: McpToolMetadata): Tool {
    const zodSchemaToJsonSchema = (schema: ZodSchema): any => {
      // This is a simplified conversion - in production, use a proper converter
      const shape = (schema as any)._def?.shape?.() || {};
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodType = (value as any)._def?.typeName;

        properties[key] = {
          type: this.zodTypeToJsonType(zodType),
          description: (value as any)._def?.description,
        };

        if (!(value as any).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    };

    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: zodSchemaToJsonSchema(metadata.inputSchema),
    };
  }

  /**
   * Convert Zod type to JSON Schema type
   */
  private zodTypeToJsonType(zodType: string): string {
    switch (zodType) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      default:
        return 'string';
    }
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

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        } catch (error) {
          if (_error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            );
          }

          if (_error instanceof McpError) {
            throw error;
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
    logger.info('Starting ALECS MCP Server');

    try {
      // Validate configuration
      const customers = this.configManager.listSections();
      logger.info(`Found ${customers.length} customer configurations`, { customers });

      // Create and configure transport
      const transport = new StdioServerTransport();

      transport.onerror = (error: Error) => {
        logger.error('Transport error', { error: error.message, stack: _error.stack });
      };

      transport.onclose = () => {
        logger.info('Transport closed, shutting down');
        process.exit(0);
      };

      // Connect server to transport
      await this.server.connect(transport);

      logger.info('ALECS MCP Server ready and listening');
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? _error.stack : undefined,
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
    const server = new ALECSServer();
    await server.start();
  } catch (error) {
    logger.error('Server initialization failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? _error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server if this is the main module
if (require.main === module) {
  main();
}

// Export for use as a module
export default ALECSServer;
