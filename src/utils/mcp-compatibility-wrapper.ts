/**
 * MCP Protocol Compatibility Wrapper
 * 
 * CODE KAI: Provides backwards compatibility between MCP protocol versions
 * 
 * SUPPORTED VERSIONS:
 * - 2024-11-05: Used by Claude Desktop (legacy) - REMOVE AFTER CLAUDE DESKTOP UPDATES
 * - 2025-06-18: Newer protocol version (current standard)
 * 
 * KEY DIFFERENCES:
 * - Tool response format: Legacy expects direct content array
 * - Error handling: Different error object structures
 * - Protocol capabilities: Metadata support varies
 * 
 * REMOVAL INSTRUCTIONS (when Claude Desktop updates):
 * 1. Check Claude Desktop uses protocol 2025-06-18 or newer
 * 2. Remove this entire file
 * 3. Remove compatibilityWrapper from akamai-server-factory.ts
 * 4. Remove the compatibility check in setupHandlers()
 * 5. Test thoroughly with Claude Desktop
 * 
 * LAST REVIEWED: 2025-01-30
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { MCPToolResponse } from '../types/mcp-protocol';
import { logger } from './logger';

export interface CompatibilityConfig {
  // Protocol version from client
  clientProtocolVersion?: string;
  // Force specific protocol behavior
  forceProtocolVersion?: string;
  // Enable legacy format conversion
  enableLegacySupport?: boolean;
}

/**
 * Wraps MCP server to provide protocol version compatibility
 */
export class MCPCompatibilityWrapper {
  private server: Server;
  private protocolVersion: string = '2024-11-05'; // Default to Claude Desktop version
  private config: CompatibilityConfig;

  constructor(server: Server, config: CompatibilityConfig = {}) {
    this.server = server;
    this.config = {
      enableLegacySupport: true,
      ...config
    };
    
    // Use config to determine default protocol version
    if (this.config.forceProtocolVersion) {
      this.protocolVersion = this.config.forceProtocolVersion;
    }
  }

  /**
   * Detects client protocol version from initialize request
   */
  detectProtocolVersion(initializeParams: any): string {
    const version = initializeParams?.protocolVersion || '2024-11-05';
    logger.info(`Detected client protocol version: ${version}`);
    this.protocolVersion = version;
    return version;
  }

  /**
   * Converts MCPToolResponse to legacy format for 2024-11-05 protocol
   */
  convertToLegacyFormat(response: MCPToolResponse): any {
    // Legacy format expects direct content array without wrapper
    if (this.protocolVersion === '2024-11-05') {
      return {
        content: response.content,
        isError: response.isError || false
      };
    }
    
    // Newer format includes metadata
    return {
      content: response.content,
      isError: response.isError || false,
      _meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Wraps tool handler to provide compatibility
   */
  wrapToolHandler(
    originalHandler: (client: any, params: any) => Promise<MCPToolResponse>
  ): (client: any, params: any) => Promise<any> {
    return async (client: any, params: any) => {
      try {
        // Call original handler
        const response = await originalHandler(client, params);
        
        // Convert response based on protocol version
        const convertedResponse = this.convertToLegacyFormat(response);
        
        // Log for debugging
        logger.debug('Tool response conversion:', {
          protocolVersion: this.protocolVersion,
          original: response,
          converted: convertedResponse
        });
        
        return convertedResponse;
      } catch (error) {
        // Handle errors appropriately for protocol version
        if (this.protocolVersion === '2024-11-05') {
          // Legacy error format
          throw new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : String(error)
          );
        } else {
          // Newer error format with more details
          throw new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : String(error),
            {
              cause: error instanceof Error ? error.stack : undefined
            }
          );
        }
      }
    };
  }

  /**
   * Converts tool input schema for protocol compatibility
   */
  convertToolSchema(schema: any): any {
    if (!schema) {return undefined;}
    
    // Legacy protocol expects simpler schema format
    if (this.protocolVersion === '2024-11-05') {
      // Ensure we have a valid JSON Schema
      if (schema.type === 'object') {
        return {
          type: 'object',
          properties: schema.properties || {},
          required: schema.required || [],
          additionalProperties: false
        };
      }
    }
    
    // Newer protocol supports full JSON Schema Draft 7
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...schema
    };
  }

  /**
   * Sets up compatibility handlers
   */
  setupCompatibilityHandlers(
    tools: Map<string, any>,
    zodToJsonSchema: (schema: any) => any
  ): void {
    
    // Wrap ListTools handler for schema compatibility
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolsList = Array.from(tools.values()).map(tool => {
        const jsonSchema = tool.schema ? zodToJsonSchema(tool.schema) : undefined;
        const compatibleSchema = this.convertToolSchema(jsonSchema);
        
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: compatibleSchema
        };
      });
      
      logger.info(`Returning ${toolsList.length} tools with ${this.protocolVersion} compatibility`);
      return { tools: toolsList };
    });

    // Wrap CallTool handler for response compatibility
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool '${name}' not found`
        );
      }
      
      // Import AkamaiClient dynamically to avoid circular dependencies
      const { AkamaiClient } = await import('../akamai-client');
      
      // Create customer-specific client
      const customerName = args?.['customer'] as string || 'default';
      logger.info(`Executing tool '${name}' for customer '${customerName}' with ${this.protocolVersion} compatibility`);
      
      const client = new AkamaiClient(customerName);
      
      // Use wrapped handler for compatibility
      const wrappedHandler = this.wrapToolHandler(tool.handler);
      const response = await wrappedHandler(client, args || {});
      
      return response;
    });
  }

  /**
   * Updates protocol version based on client
   */
  setProtocolVersion(version: string): void {
    this.protocolVersion = version;
    logger.info(`Set protocol version to: ${version}`);
  }
}

/**
 * Creates a backwards-compatible MCP server
 */
export function createCompatibleMCPServer(
  serverConfig: any,
  tools: Map<string, any>,
  zodToJsonSchema: (schema: any) => any
): { server: Server; wrapper: MCPCompatibilityWrapper } {
  const server = new Server(
    serverConfig,
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  const wrapper = new MCPCompatibilityWrapper(server, {
    enableLegacySupport: true
  });
  
  // Setup compatibility handlers
  wrapper.setupCompatibilityHandlers(tools, zodToJsonSchema);
  
  return { server, wrapper };
}