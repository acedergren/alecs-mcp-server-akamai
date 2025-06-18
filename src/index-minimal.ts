#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Minimal Test Version)
 * Testing with minimal tools to diagnose Claude Desktop issues
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
import { AkamaiClient } from './akamai-client';
import {
  listProperties,
  getProperty,
  listGroups,
} from './tools/property-tools';

const ListPropertiesSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
});

const GetPropertySchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string(),
});

const ListGroupsSchema = z.object({
  customer: z.string().optional(),
  searchTerm: z.string().optional(),
});

class MinimalALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    console.error('🚀 ALECS Minimal Server starting...');
    
    this.server = new Server({
      name: 'alecs-minimal',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.client = new AkamaiClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List only 3 essential tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list-properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc',
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
          name: 'get-property',
          description: 'Get details of a specific property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc',
              },
              propertyId: {
                type: 'string',
                description: 'Property ID (e.g., prp_12345)',
              },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'list-groups',
          description: 'List all groups in your Akamai account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: {
                type: 'string',
                description: 'Optional: Customer section name from .edgerc',
              },
              searchTerm: {
                type: 'string',
                description: 'Optional: Search term to filter groups',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      
      console.error(`🔧 Tool called: ${name}`);
      console.error(`📝 Arguments:`, JSON.stringify(args, null, 2));
      
      const client = this.client;

      try {
        switch (name) {
          case 'list-properties':
            const listPropsArgs = ListPropertiesSchema.parse(args);
            return await listProperties(client, listPropsArgs);

          case 'get-property':
            const getPropArgs = GetPropertySchema.parse(args);
            return await getProperty(client, { propertyId: getPropArgs.propertyId });

          case 'list-groups':
            const listGroupsArgs = ListGroupsSchema.parse(args);
            return await listGroups(client, listGroupsArgs);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool not found: ${name}`
            );
        }
      } catch (error) {
        console.error(`❌ Tool error:`, error);
        
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        
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

  async start() {
    console.error('📍 Looking for credentials in ~/.edgerc');
    
    const transport = new StdioServerTransport();
    
    // Add error handling for transport
    transport.onerror = (error: Error) => {
      console.error('❌ Transport error:', error);
    };
    
    transport.onclose = () => {
      console.error('🔌 Transport closed');
      process.exit(0);
    };
    
    await this.server.connect(transport);
    
    console.error('✅ Server ready, waiting for connections...');
  }
}

// Main entry point
async function main() {
  try {
    const server = new MinimalALECSServer();
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main();