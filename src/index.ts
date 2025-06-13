#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai
 * An MCP server that enables management of Akamai through AI
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
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord
} from './tools/dns-tools.js';

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

// DNS Tool Schemas
const ListZonesSchema = z.object({
  customer: z.string().optional(),
  contractIds: z.array(z.string()).optional(),
  includeAliases: z.boolean().optional(),
  search: z.string().optional(),
});

const GetZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
});

const CreateZoneSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  comment: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  masters: z.array(z.string()).optional(),
  target: z.string().optional(),
});

const ListRecordsSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  search: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const UpsertRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string()),
  comment: z.string().optional(),
});

const DeleteRecordSchema = z.object({
  customer: z.string().optional(),
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  comment: z.string().optional(),
});


class AkamaiMCPServer {
  private server: Server;
  private akamaiClients: Map<string, AkamaiClient> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'alecs-mcp-server-akamai',
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
        // DNS Tools
        {
          name: 'list_zones',
          description: 'List all DNS zones in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              contractIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by contract IDs',
              },
              includeAliases: {
                type: 'boolean',
                description: 'Optional: Include alias zones',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for zones by name',
              },
            },
          },
        },
        {
          name: 'get_zone',
          description: 'Get details of a specific DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'create_zone',
          description: 'Create a new DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              type: {
                type: 'string',
                enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
                description: 'Zone type',
              },
              comment: {
                type: 'string',
                description: 'Optional: Zone comment',
              },
              contractId: {
                type: 'string',
                description: 'Optional: Contract ID',
              },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID',
              },
              masters: {
                type: 'array',
                items: { type: 'string' },
                description: 'Master servers (required for SECONDARY zones)',
              },
              target: {
                type: 'string',
                description: 'Target zone (required for ALIAS zones)',
              },
            },
            required: ['zone', 'type'],
          },
        },
        {
          name: 'list_records',
          description: 'List DNS records in a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              search: {
                type: 'string',
                description: 'Optional: Search for records by name',
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by record types (e.g., ["A", "CNAME"])',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'upsert_record',
          description: 'Create or update a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME, MX, TXT)',
              },
              ttl: {
                type: 'number',
                description: 'Time to live in seconds',
              },
              rdata: {
                type: 'array',
                items: { type: 'string' },
                description: 'Record data (e.g., ["192.0.2.1"] for A record)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'name', 'type', 'ttl', 'rdata'],
          },
        },
        {
          name: 'delete_record',
          description: 'Delete a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc (default: "default")',
              },
              zone: {
                type: 'string',
                description: 'The zone name (e.g., example.com)',
              },
              name: {
                type: 'string',
                description: 'Record name (e.g., www.example.com)',
              },
              type: {
                type: 'string',
                description: 'Record type (e.g., A, AAAA, CNAME)',
              },
              comment: {
                type: 'string',
                description: 'Optional: Change comment',
              },
            },
            required: ['zone', 'name', 'type'],
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
          
          // DNS Tools
          case 'list_zones':
            return await this.listZones(akamaiClient, args);
          
          case 'get_zone':
            return await this.getZone(akamaiClient, args);
          
          case 'create_zone':
            return await this.createZone(akamaiClient, args);
          
          case 'list_records':
            return await this.listRecords(akamaiClient, args);
          
          case 'upsert_record':
            return await this.upsertRecord(akamaiClient, args);
          
          case 'delete_record':
            return await this.deleteRecord(akamaiClient, args);
          
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

  /**
   * DNS Tool Methods
   */
  private async listZones(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = ListZonesSchema.parse(args);
    return listZones(client, parsed);
  }

  private async getZone(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = GetZoneSchema.parse(args);
    return getZone(client, parsed);
  }

  private async createZone(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = CreateZoneSchema.parse(args);
    return createZone(client, parsed);
  }

  private async listRecords(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = ListRecordsSchema.parse(args);
    return listRecords(client, parsed);
  }

  private async upsertRecord(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = UpsertRecordSchema.parse(args);
    return upsertRecord(client, parsed);
  }

  private async deleteRecord(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
    const parsed = DeleteRecordSchema.parse(args);
    return deleteRecord(client, parsed);
  }

  async run() {
    console.error('🚀 ALECS - MCP Server for Akamai starting...');
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