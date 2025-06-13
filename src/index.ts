#!/usr/bin/env node

/**
 * Akamai MCP Server - Main entry point
 * Provides natural language interface to Akamai CDN management through Claude
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AkamaiClient } from './akamai-client.js';
import { 
  MCPToolResponse
} from './types.js';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups
} from './tools/property-tools.js';

// Tool schemas for validation
const ListPropertiesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetPropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const CreatePropertySchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string(),
  productId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  ruleFormat: z.string().optional(),
});


class AkamaiMCPServer {
  private server: Server;
  private akamaiClients: Map<string, AkamaiClient> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'akamai-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Filter by contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Filter by group ID',
              },
            },
          },
        },
        {
          name: 'get_property',
          description: 'Get detailed information about a specific property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyId: {
                type: 'string',
                description: 'The property ID (e.g., prp_12345)',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'create_property',
          description: 'Create a new CDN property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              propertyName: {
                type: 'string',
                description: 'Name for the new property',
              },
              productId: {
                type: 'string',
                description: 'Product ID (e.g., prd_Web_Accel)',
              },
              contractId: {
                type: 'string',
                description: 'Contract ID for billing',
              },
              groupId: {
                type: 'string',
                description: 'Group ID for organization',
              },
              ruleFormat: {
                type: 'string',
                description: 'Optional: Rule format version (defaults to latest)',
              },
            },
            required: ['propertyName', 'productId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'list_groups',
          description: 'List all available groups and contracts in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search for groups by name or ID',
              },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      
      // Extract customer section from arguments (default to 'default')
      const customer = (args && typeof args === 'object' && 'customer' in args && typeof args.customer === 'string') 
        ? args.customer 
        : 'default';
      
      // Get or create client for this customer section
      if (!this.akamaiClients.has(customer)) {
        try {
          const client = new AkamaiClient(customer);
          this.akamaiClients.set(customer, client);
          console.error(`✅ Akamai EdgeGrid client initialized for customer section [${customer}]`);
        } catch (error) {
          console.error(`❌ Failed to initialize Akamai client for section [${customer}]:`, error);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to initialize Akamai client for section [${customer}]: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      const akamaiClient = this.akamaiClients.get(customer)!;

      try {
        switch (name) {
          case 'list_properties':
            return await this.listProperties(akamaiClient, args);
          
          case 'get_property':
            return await this.getProperty(akamaiClient, args);
          
          case 'create_property':
            return await this.createProperty(akamaiClient, args);
          
          case 'list_groups':
            return await this.listGroups(akamaiClient, args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`Error in tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupErrorHandling() {
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled rejection:', error);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });
  }

  /**
   * List all properties
   */
  private async listProperties(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = ListPropertiesSchema.parse(args);
    return listProperties(client, parsed);
  }

  /**
   * Get property details
   */
  private async getProperty(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = GetPropertySchema.parse(args);
    return getProperty(client, parsed);
  }

  /**
   * Create new property
   */
  private async createProperty(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = CreatePropertySchema.parse(args);
    return createProperty(client, parsed);
  }

  /**
   * List groups and contracts
   */
  private async listGroups(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    return listGroups(client, args);
  }

  async run() {
    console.error('🚀 Akamai MCP Server starting...');
    console.error('📍 Looking for credentials in ~/.edgerc');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ Server ready, waiting for connections...');
  }
}

// Start the server
const server = new AkamaiMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});