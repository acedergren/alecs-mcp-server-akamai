#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai with OAuth 2.1 Protection
 * Enhanced with OAuth 2.1 compliance, token validation, and security features
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

// Import OAuth 2.1 components
import {
  OAuthMiddleware,
  type OAuthMiddlewareConfig,
  type AuthContext,
} from './auth';
import { ValkeyCache } from './services/valkey-cache-service';

// Import tool implementations
import {
  createZone,
  upsertRecord,
} from './tools/dns-tools';
import {
  activateProperty,
} from './tools/property-manager-tools';
import {
  listProperties,
  getProperty,
  createProperty,
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

/**
 * Tool registry entry with metadata
 */
interface ToolRegistryEntry {
  metadata: McpToolMetadata;
  handler: (params: unknown) => Promise<McpToolResponse>;
  requiresAuth: boolean;
  requiredScopes?: string[];
}

/**
 * Request context for logging and tracking
 */
interface RequestContext {
  requestId: string;
  toolName: string;
  customer?: string;
  startTime: number;
  authContext?: AuthContext;
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
  oauth?: {
    enabled: boolean;
    introspectionEndpoint?: string;
    jwksUri?: string;
    clientId?: string;
    clientSecret?: string;
    trustedAuthServers?: string[];
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
}

/**
 * Main ALECS MCP Server implementation with OAuth 2.1
 */
export class ALECSOAuthServer {
  private server: Server;
  private toolRegistry: Map<string, ToolRegistryEntry> = new Map();
  private configManager: CustomerConfigManager;
  private requestCounter = 0;
  private oauthMiddleware?: OAuthMiddleware;
  private cacheService?: ValkeyCache;

  constructor(config?: Partial<ServerConfig>) {
    const serverConfig: ServerConfig = {
      name: config?.name || 'alecs-mcp-server-akamai',
      version: config?.version || '1.4.0',
      capabilities: {
        tools: {},
        ...config?.capabilities,
      },
      oauth: config?.oauth,
      cache: config?.cache,
    };

    logger.info('Initializing ALECS MCP Server with OAuth 2.1', {
      ...serverConfig,
      oauth: serverConfig.oauth ? { enabled: serverConfig.oauth.enabled } : undefined,
    });

    this.server = new Server(serverConfig as any, {
      capabilities: serverConfig.capabilities || { tools: {} },
    });

    this.configManager = CustomerConfigManager.getInstance();

    // Initialize cache if enabled
    if (serverConfig.cache?.enabled) {
      this.cacheService = new ValkeyCache({
        keyPrefix: 'akamai:oauth:',
      });
    }

    // Initialize OAuth middleware if enabled
    if (serverConfig.oauth?.enabled) {
      this.initializeOAuth(serverConfig.oauth);
    }

    this.setupErrorHandling();
    this.registerTools();
    this.setupHandlers();
  }

  /**
   * Initialize OAuth 2.1 protection
   */
  private initializeOAuth(oauthConfig: ServerConfig['oauth']): void {
    if (!oauthConfig || !oauthConfig.enabled) {
      return;
    }

    const middlewareConfig: OAuthMiddlewareConfig = {
      enabled: true,
      tokenValidator: {
        introspectionEndpoint: oauthConfig.introspectionEndpoint,
        jwksUri: oauthConfig.jwksUri,
        clientId: oauthConfig.clientId,
        clientSecret: oauthConfig.clientSecret,
      },
      toolScopes: {
        // Property management tools
        'list-properties': ['property:read'],
        'get-property': ['property:read'],
        'create-property': ['property:write'],
        'activate-property': ['property:activate'],

        // DNS tools
        'create-zone': ['dns:write'],
        'create-record': ['dns:write'],
        'delete-record': ['dns:write'],

        // Security tools
        'create-network-list': ['security:write'],
        'update-network-list': ['security:write'],

        // Purge tools
        'purge-by-url': ['purge:execute'],
        'purge-by-tag': ['purge:execute'],
      },
      defaultScopes: ['mcp:access'],
      requireTokenBinding: true,
      publicTools: ['list-tools', 'describe-tool'],
      rateLimiting: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      },
    };

    this.oauthMiddleware = new OAuthMiddleware(middlewareConfig, this.cacheService);
    logger.info('OAuth 2.1 protection enabled');
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
  private createRequestContext(toolName: string, params?: unknown, authContext?: AuthContext): RequestContext {
    const customer = this.extractCustomer(params);
    return {
      requestId: this.generateRequestId(),
      toolName,
      customer,
      startTime: Date.now(),
      authContext,
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
    requiresAuth: boolean = true,
    requiredScopes?: string[],
  ): void {
    const metadata: McpToolMetadata = {
      name,
      description,
      inputSchema,
      handler,
    };

    this.toolRegistry.set(name, {
      metadata,
      handler,
      requiresAuth,
      requiredScopes,
    });

    logger.debug('Registered tool', {
      name,
      description,
      requiresAuth,
      requiredScopes,
    });
  }

  /**
   * Register all available tools
   */
  private registerTools(): void {
    // Property Management Tools
    this.registerTool(
      'list-properties',
      'List all Akamai CDN properties in your account',
      ListPropertiesSchema,
      async (params) => this.wrapToolHandler('list-properties', params, listProperties),
      true,
      ['property:read'],
    );

    this.registerTool(
      'get-property',
      'Get details of a specific property',
      GetPropertySchema,
      async (params) => this.wrapToolHandler('get-property', params, getProperty),
      true,
      ['property:read'],
    );

    this.registerTool(
      'create-property',
      'Create a new property',
      CreatePropertySchema,
      async (params) => this.wrapToolHandler('create-property', params, createProperty),
      true,
      ['property:write'],
    );

    this.registerTool(
      'activate-property',
      'Activate a property version',
      ActivatePropertySchema,
      async (params) => this.wrapToolHandler('activate-property', params, activateProperty),
      true,
      ['property:activate'],
    );

    // DNS Tools
    this.registerTool(
      'create-zone',
      'Create a new DNS zone',
      CreateZoneSchema,
      async (params) => this.wrapToolHandler('create-zone', params, createZone),
      true,
      ['dns:write'],
    );

    this.registerTool(
      'create-record',
      'Create a DNS record',
      CreateRecordSchema,
      async (params) => this.wrapToolHandler('create-record', params, upsertRecord),
      true,
      ['dns:write'],
    );

    // Public tools (no auth required)
    this.registerTool(
      'list-tools',
      'List available MCP tools',
      z.object({}),
      async () => ({
        success: true,
        data: Array.from(this.toolRegistry.keys()),
      }),
      false, // No auth required
    );

    logger.info(`Registered ${this.toolRegistry.size} tools`);
  }

  /**
   * Wrap tool handler with common functionality and OAuth
   */
  private async wrapToolHandler(
    toolName: string,
    params: unknown,
    handler: (client: any, params: any) => Promise<any>,
  ): Promise<McpToolResponse> {
    let authContext: AuthContext | undefined;

    // Perform OAuth authentication if enabled
    if (this.oauthMiddleware) {
      const entry = this.toolRegistry.get(toolName);
      if (entry?.requiresAuth) {
        try {
          // Create a mock request for OAuth middleware
          const mockRequest: CallToolRequest = {
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: params as any,
            },
          };

          // Add headers if present in params
          if (params && typeof params === 'object' && '_meta' in params) {
            (mockRequest as any)._meta = (params as any)._meta;
          }

          authContext = await this.oauthMiddleware.authenticate(mockRequest) || undefined;

          if (authContext) {
            await this.oauthMiddleware.authorize(mockRequest, authContext);
          }
        } catch (_error) {
          logger.error('OAuth authentication/authorization failed', {
            tool: toolName,
            error: _error instanceof Error ? _error.message : String(_error),
          });

          return {
            success: false,
            error: _error instanceof Error ? _error.message : 'Authentication failed',
            metadata: {
              customer: 'unknown',
              duration: 0,
              tool: toolName,
            },
          };
        }
      }
    }

    const context = this.createRequestContext(toolName, params, authContext);

    logger.info('Tool request received', {
      ...context,
      params: JSON.stringify(params),
      authenticated: !!authContext,
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

      const response: McpToolResponse & { _meta?: any } = {
        success: true,
        data: result,
        metadata: {
          customer,
          duration,
          tool: toolName,
        },
      };

      // Preserve _meta from params if present
      if (params && typeof params === 'object' && '_meta' in params) {
        response._meta = (params as any)._meta;
      }

      // Add auth context info if available
      if (authContext) {
        response._meta = {
          ...response._meta,
          authenticatedUser: authContext.subject,
          clientId: authContext.clientId,
        };
      }

      return response;
    } catch (_error) {
      const duration = Date.now() - context.startTime;

      logger.error('Tool request failed', {
        ...context,
        duration,
        error: _error instanceof Error ? _error.message : String(_error),
        stack: _error instanceof Error ? _error.stack : undefined,
      });

      const response: McpToolResponse & { _meta?: any } = {
        success: false,
        error: this.formatError(_error),
        metadata: {
          customer: context.customer || 'default',
          duration,
          tool: toolName,
        },
      };

      // Preserve _meta from params if present
      if (params && typeof params === 'object' && '_meta' in params) {
        response._meta = (params as any)._meta;
      }

      return response;
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
   * Convert tool metadata to MCP tool format
   */
  private toolMetadataToMcpTool(metadata: McpToolMetadata, entry: ToolRegistryEntry): Tool {
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

    const tool: Tool = {
      name: metadata.name,
      description: metadata.description,
      inputSchema: zodSchemaToJsonSchema(metadata.inputSchema),
    };

    // Add OAuth information to description if auth is required
    if (this.oauthMiddleware && entry.requiresAuth) {
      tool.description += ` (Requires OAuth 2.1 authentication with scopes: ${entry.requiredScopes?.join(', ') || 'mcp:access'})`;
    }

    return tool;
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
        tools.push(this.toolMetadataToMcpTool(entry.metadata, entry));
      }

      logger.debug(`Returning ${tools.length} tools`);

      // Add _meta support if present in request
      const response: any = { tools };
      if ((request as any)._meta) {
        response._meta = (request as any)._meta;
      }

      return response;
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
          // Apply OAuth if required
          let authContext: AuthContext | undefined;

          if (this.oauthMiddleware && entry.requiresAuth) {
            authContext = await this.oauthMiddleware.authenticate(request) || undefined;

            if (authContext) {
              await this.oauthMiddleware.authorize(request, authContext);
              await this.oauthMiddleware.applyRateLimit(authContext);
            }
          }

          // Validate parameters
          const validatedParams = entry.metadata.inputSchema.parse(args);

          // Add auth context to params if available
          if (authContext) {
            (validatedParams as any)._authContext = authContext;
          }

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
        } catch (_error) {
          if (_error instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters: ${_error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
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
    logger.info('Starting ALECS MCP Server with OAuth 2.1');

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

      logger.info('ALECS MCP Server ready and listening', {
        oauthEnabled: !!this.oauthMiddleware,
        cacheEnabled: !!this.cacheService,
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
    // Load OAuth configuration from environment
    const oauthConfig: ServerConfig['oauth'] = {
      enabled: process.env.OAUTH_ENABLED === 'true',
      introspectionEndpoint: process.env.OAUTH_INTROSPECTION_ENDPOINT,
      jwksUri: process.env.OAUTH_JWKS_URI,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      trustedAuthServers: process.env.OAUTH_TRUSTED_SERVERS?.split(','),
    };

    // Create server with OAuth if configured
    const server = new ALECSOAuthServer({
      oauth: oauthConfig,
      cache: {
        enabled: true,
        ttl: 300, // 5 minutes
      },
    });

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
export default ALECSOAuthServer;
