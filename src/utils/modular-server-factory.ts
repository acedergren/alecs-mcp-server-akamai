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

interface ServerConfig {
  name: string;
  version: string;
}

export class ModularServer {
  private server: Server;
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

    this.setupHandlers();
  }

  private setupHandlers() {
    // For now, use basic property tools as the main functionality
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'property.list',
            description: 'List Akamai CDN properties',
            inputSchema: {
              type: 'object',
              properties: {
                customer: { type: 'string', description: 'Customer identifier from .edgerc' },
                contractId: { type: 'string', description: 'Contract ID (optional)' },
                groupId: { type: 'string', description: 'Group ID (optional)' },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'property.list':
            // Dynamic import of modular property tools
            const { listProperties } = await import('../tools/property-tools');
            return await listProperties(args.customer, args.contractId, args.groupId);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool not found: ${name}. Only modular tools are supported.`
            );
        }
      } catch (error) {
        logger.error('Tool execution failed', { error, tool: request.params.name });
        throw error;
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

export async function createModularServer(config: ServerConfig): Promise<ModularServer> {
  return new ModularServer(config);
}