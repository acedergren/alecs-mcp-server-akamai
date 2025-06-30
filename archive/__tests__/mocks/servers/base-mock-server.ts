/**
 * Base Mock Server for MCP 2025-06-18 Testing
 * Provides core functionality for all transport-specific mock servers
 */

import { EventEmitter } from 'events';
import { 
  JsonRpcRequest as JSONRPCRequest, 
  JsonRpcResponse as JSONRPCResponse, 
  JsonRpcError as JSONRPCError,
  JsonRpcErrorCode as JSONRPCErrorCode,
  RequestContext
} from '../../../src/types/jsonrpc';

export interface MockServerConfig {
  transport: 'stdio' | 'http';
  protocolVersion: '2025-06-18';
  serverName: string;
  serverVersion: string;
  capabilities: ServerCapabilities;
  oauth?: OAuthConfig;
  strictMode?: boolean;
}

export interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface OAuthConfig {
  authorizationServer: string;
  resourceIndicators: string[];
  protectedResourceMetadata: {
    resource: string;
    scopes: string[];
  };
}

export interface MockTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (params: any) => Promise<any>;
}

export interface RequestContext {
  id: string | number;
  timestamp: number;
  transport: string;
  authenticated?: boolean;
  token?: string;
}

export abstract class BaseMockServer extends EventEmitter {
  protected config: MockServerConfig;
  protected tools: Map<string, MockTool> = new Map();
  protected usedRequestIds: Set<string | number> = new Set();
  protected requestCounter = 0;
  protected activeRequests: Map<string | number, RequestContext> = new Map();
  protected reservedMetadataPrefixes = ['modelcontextprotocol', 'mcp'];

  constructor(config: MockServerConfig) {
    super();
    this.config = config;
    this.initializeDefaultTools();
  }

  /**
   * Initialize default MCP tools
   */
  private initializeDefaultTools(): void {
    // Add default tools/list handler
    this.registerHandler('tools/list', async () => {
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      return { tools };
    });

    // Add default tools/call handler
    this.registerHandler('tools/call', async (params: any) => {
      const { name, arguments: args } = params;
      
      if (!name) {
        throw this.createError(
          JSONRPCErrorCode.InvalidParams,
          'Missing required field: name'
        );
      }

      const tool = this.tools.get(name);
      if (!tool) {
        throw this.createError(
          JSONRPCErrorCode.MethodNotFound,
          `Tool not found: ${name}`
        );
      }

      try {
        const result = await tool.handler(args || {});
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        throw this.createError(
          JSONRPCErrorCode.InternalError,
          error instanceof Error ? error.message : 'Tool execution failed'
        );
      }
    });
  }

  /**
   * Register a tool
   */
  registerTool(tool: MockTool): void {
    // Validate tool name format (snake_case)
    if (!this.isValidToolName(tool.name)) {
      throw new Error(`Invalid tool name: ${tool.name}. Must be snake_case.`);
    }

    // Validate JSON Schema
    if (!this.isValidJsonSchema(tool.inputSchema)) {
      throw new Error(`Invalid JSON Schema for tool: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Register a method handler
   */
  protected registerHandler(method: string, handler: (params: any) => Promise<any>): void {
    // Store handlers in derived classes
  }

  /**
   * Process a JSON-RPC request
   */
  async processRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const startTime = Date.now();
    
    // Validate request format
    this.validateRequest(request);

    // Check request ID uniqueness
    if (request.id !== undefined && request.id !== null) {
      if (this.usedRequestIds.has(request.id)) {
        throw this.createError(
          JSONRPCErrorCode.InvalidRequest,
          `Request ID already used: ${request.id}`
        );
      }
      this.usedRequestIds.add(request.id);
      
      // Track active request
      this.activeRequests.set(request.id, {
        id: request.id,
        timestamp: startTime,
        transport: this.config.transport,
        authenticated: false // Will be set by transport layer
      });
    }

    try {
      // Execute the request
      const result = await this.executeRequest(request);
      
      // Add MCP 2025 metadata if applicable
      if (this.shouldAddMetadata(request.method)) {
        result._meta = {
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          version: this.config.serverVersion,
          tool: request.method
        };
      }

      return {
        jsonrpc: '2.0',
        id: request.id!,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id!,
        error: this.formatError(error)
      };
    } finally {
      // Clean up request tracking
      if (request.id !== undefined && request.id !== null) {
        this.activeRequests.delete(request.id);
      }
    }
  }

  /**
   * Execute the actual request (implemented by subclasses)
   */
  protected abstract executeRequest(request: JSONRPCRequest): Promise<any>;

  /**
   * Validate request format
   */
  protected validateRequest(request: JSONRPCRequest): void {
    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      throw this.createError(
        JSONRPCErrorCode.InvalidRequest,
        'Invalid JSON-RPC version'
      );
    }

    // Validate method
    if (!request.method || typeof request.method !== 'string') {
      throw this.createError(
        JSONRPCErrorCode.InvalidRequest,
        'Missing or invalid method'
      );
    }

    // Validate ID (must not be null for requests expecting responses)
    if (this.config.strictMode && request.id === null) {
      throw this.createError(
        JSONRPCErrorCode.InvalidRequest,
        'Request ID must not be null'
      );
    }

    // Validate params if present
    if (request.params !== undefined && 
        typeof request.params !== 'object') {
      throw this.createError(
        JSONRPCErrorCode.InvalidParams,
        'Invalid params format'
      );
    }
  }

  /**
   * Validate metadata keys for reserved prefixes
   */
  protected validateMetadataKeys(metadata: Record<string, any>): void {
    for (const key of Object.keys(metadata)) {
      const labels = key.split('.');
      for (const label of labels) {
        if (this.reservedMetadataPrefixes.includes(label.toLowerCase())) {
          throw this.createError(
            JSONRPCErrorCode.InvalidParams,
            `Reserved metadata prefix used: ${key}`
          );
        }
      }
    }
  }

  /**
   * Check if tool name is valid (snake_case)
   */
  protected isValidToolName(name: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(name);
  }

  /**
   * Validate JSON Schema format
   */
  protected isValidJsonSchema(schema: any): boolean {
    return (
      schema &&
      typeof schema === 'object' &&
      schema.type === 'object' &&
      typeof schema.properties === 'object'
    );
  }

  /**
   * Determine if metadata should be added to response
   */
  protected shouldAddMetadata(method: string): boolean {
    return method === 'tools/call';
  }

  /**
   * Create a JSON-RPC error
   */
  protected createError(code: JSONRPCErrorCode, message: string, data?: any): JSONRPCError {
    return {
      code,
      message,
      data
    };
  }

  /**
   * Format error for response
   */
  protected formatError(error: any): JSONRPCError {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error;
    }
    
    return {
      code: JSONRPCErrorCode.InternalError,
      message: error instanceof Error ? error.message : 'Internal error',
      data: error instanceof Error ? { stack: error.stack } : undefined
    };
  }

  /**
   * Clean up old request IDs to prevent memory leak
   */
  cleanupOldRequestIds(maxAge: number = 3600000): void {
    const now = Date.now();
    const idsToRemove: Array<string | number> = [];
    
    for (const [id, context] of this.activeRequests.entries()) {
      if (now - context.timestamp > maxAge) {
        idsToRemove.push(id);
      }
    }
    
    for (const id of idsToRemove) {
      this.usedRequestIds.delete(id);
      this.activeRequests.delete(id);
    }
  }

  /**
   * Get server info for initialization
   */
  getServerInfo() {
    return {
      protocolVersion: this.config.protocolVersion,
      capabilities: this.config.capabilities,
      serverInfo: {
        name: this.config.serverName,
        version: this.config.serverVersion
      }
    };
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    this.removeAllListeners();
    this.tools.clear();
    this.usedRequestIds.clear();
    this.activeRequests.clear();
  }
}