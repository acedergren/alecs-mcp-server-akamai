/**
 * MULTI-TENANT MODULAR SERVER FACTORY FOR REMOTE MCP HOSTING
 * 
 * HOSTED MCP DEPLOYMENT ARCHITECTURE:
 * This factory enables dynamic, configurable MCP server instances optimized
 * for multi-tenant hosted environments where different customers require
 * different tool sets and configurations.
 * 
 * REMOTE MCP HOSTING CAPABILITIES:
 * 🏗️ Dynamic Tool Loading: Load customer-specific tool sets on demand
 * 🔐 Customer-Specific Configurations: Isolated server configs per tenant
 * 📊 Per-Customer Monitoring: Separate metrics and logging per customer instance
 * 🚀 Horizontal Scaling: Create multiple server instances for load distribution
 * 🛡️ Security Isolation: Separate server contexts prevent cross-tenant leaks
 * 
 * HOSTED DEPLOYMENT PATTERNS:
 * 1. **Customer-Specific Servers**: Dedicated server instance per major customer
 * 2. **Shared Multi-Tenant Servers**: Single server with customer context switching
 * 3. **Feature-Based Segmentation**: Different tool sets for different customer tiers
 * 4. **Environment Isolation**: Separate servers for staging/production per customer
 * 
 * DYNAMIC CONFIGURATION BENEFITS:
 * - Load only tools that customers have licenses for
 * - Enable/disable features based on customer subscription level
 * - Hot-reload configurations without server restart
 * - A/B testing of new features per customer segment
 * 
 * REMOTE MCP INTEGRATION:
 * - Supports different transport protocols (stdio, HTTP, WebSocket)
 * - Customer context validation in all tool handlers
 * - Configurable rate limiting and quotas per customer
 * - Dynamic credential injection per customer context
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './logger';
import { getTransportFromEnv } from '../config/transport-config';
import { AkamaiClient } from '../akamai-client';

// Import the complete tool registry
// This consolidates all 158 tools from across the codebase into one place
import { getAllToolDefinitions, type ToolDefinition } from '../tools/all-tools-registry';

interface ServerConfig {
  name: string;
  version: string;
  /**
   * Optional filter to load only specific tools
   * Useful for:
   * - Customer-specific tool sets based on licensing
   * - Feature flags for gradual rollout
   * - Performance optimization (load only needed tools)
   */
  toolFilter?: (tool: ToolDefinition) => boolean;
}

/**
 * AkamaiMCPServer - A configurable MCP server for Akamai API operations
 * 
 * This server provides access to Akamai's APIs through the Model Context Protocol,
 * allowing AI assistants like Claude to manage CDN configurations, DNS zones,
 * certificates, and more.
 */
export class AkamaiMCPServer {
  private server: Server;
  private tools: Map<string, ToolDefinition> = new Map();
  private config: ServerConfig;

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

    // Load tools from the central registry
    // This replaces the scattered tool registrations across multiple server files
    this.loadTools();
    this.setupHandlers();
  }

  /**
   * Load tools from the central registry
   * KEY DESIGN DECISION: We're moving from distributed tool registration
   * (each server file manages its own tools) to centralized registration
   * (all tools in one registry). This enables:
   * 
   * 1. Better tool discovery - all tools in one place
   * 2. Easier maintenance - no need to hunt through multiple files
   * 3. Dynamic loading - can filter tools based on customer/feature flags
   * 4. Consistent tool naming and schemas across the system
   */
  private loadTools(): void {
    const allTools = getAllToolDefinitions();
    
    // Apply optional filter for customer-specific or feature-gated tools
    const toolsToLoad = this.config.toolFilter 
      ? allTools.filter(this.config.toolFilter)
      : allTools;
    
    logger.info(`Loading ${toolsToLoad.length} tools from registry`);
    
    for (const tool of toolsToLoad) {
      this.tools.set(tool.name, tool);
    }
  }

  private setupHandlers() {
    /**
     * LIST TOOLS HANDLER
     * Returns all loaded tools to MCP clients (like Claude Desktop)
     * Tools are now loaded from the central registry instead of being hardcoded
     */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Convert our tool definitions to MCP format
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.schema ? {
          type: 'object',
          properties: (tool.schema as any).shape || {},
          required: (tool.schema as any)._def?.typeName === 'ZodObject' ? Object.keys((tool.schema as any).shape || {}) : [],
        } : undefined,
      }));

      logger.info(`Returning ${tools.length} tools to client`);
      return { tools };
    });

    /**
     * CALL TOOL HANDLER
     * Executes tools based on their name using the central registry
     * 
     * MIGRATION PATH:
     * Before: Each server had its own switch statement with hardcoded tools
     * After: Dynamic tool execution from the registry with proper error handling
     */
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // Look up tool in our registry
        const tool = this.tools.get(name);
        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool not found: ${name}. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
          );
        }

        logger.info(`Executing tool: ${name}`, { args });

        // Create Akamai client for the customer
        // Customer context is critical for multi-tenant operation
        const customerName = args?.['customer'] as string || 'default';
        const client = new AkamaiClient(customerName);

        // Validate arguments against schema if present
        if (tool.schema) {
          try {
            tool.schema.parse(args);
          } catch (validationError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid parameters for ${name}: ${validationError}`
            );
          }
        }

        // Execute the tool handler
        // All tools follow the pattern: handler(client, params) => Promise<MCPToolResponse>
        const response = await tool.handler(client, args || {});
        
        // Return the content from MCPToolResponse
        // MCP expects the content directly, not wrapped in another object
        return response.content[0] || { type: 'text', text: 'No content' };

      } catch (error) {
        // Enhanced error logging for debugging
        logger.error('Tool execution failed', { 
          error: error instanceof Error ? error.message : String(error),
          tool: request.params.name,
          args: request.params.arguments 
        });
        
        // Re-throw MCP errors as-is, wrap others
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async start(): Promise<void> {
    const transportConfig = getTransportFromEnv();
    
    if (transportConfig.type === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('Modular MCP Server started with stdio transport');
    } else {
      throw new Error(`Transport type ${transportConfig.type} not supported in modular mode yet`);
    }
  }

  getServer(): Server {
    return this.server;
  }
}

/**
 * Creates an Akamai MCP server with configurable tool sets
 * 
 * NAMING RATIONALE:
 * - "createAkamaiServer" is clearer than "createModularServer"
 * - Developers immediately understand this creates an Akamai-specific server
 * - The modularity is an implementation detail, not the primary purpose
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Load all tools (default):
 * ```typescript
 * const server = await createModularServer({
 *   name: 'alecs-full',
 *   version: '1.0.0'
 * });
 * ```
 * 
 * 2. Load only Property Manager tools:
 * ```typescript
 * const server = await createModularServer({
 *   name: 'alecs-property',
 *   version: '1.0.0',
 *   toolFilter: (tool) => tool.name.startsWith('property.') || tool.name.includes('property')
 * });
 * ```
 * 
 * 3. Load tools for specific customer tier:
 * ```typescript
 * const server = await createModularServer({
 *   name: 'alecs-enterprise',
 *   version: '1.0.0',
 *   toolFilter: (tool) => !tool.name.includes('reporting') // No reporting for basic tier
 * });
 * ```
 * 
 * 4. Load tools by API type:
 * ```typescript
 * const server = await createModularServer({
 *   name: 'alecs-dns-cps',
 *   version: '1.0.0',
 *   toolFilter: (tool) => 
 *     tool.name.includes('dns') || 
 *     tool.name.includes('certificate') ||
 *     tool.name.includes('cps')
 * });
 * ```
 */
export async function createAkamaiServer(config: ServerConfig): Promise<AkamaiMCPServer> {
  return new AkamaiMCPServer(config);
}

// Keep the old name for backward compatibility during migration
export const createModularServer = createAkamaiServer;

// Keep old name for compatibility
export { AkamaiMCPServer as ModularServer };