#!/usr/bin/env node

/**
 * ALECS Property Server - MCP 2025-06-18 Compliant Version
 * Demonstrates proper tool naming, JSON Schema parameters, and response format
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { AkamaiClient } from '../akamai-client';
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  getActivationStatus,
} from '../tools/property-manager-tools';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts,
} from '../tools/property-tools-cached';
import {
  PropertyManagerSchemas2025,
  PropertyManagerZodSchemas,
  createMcp2025Response,
  type Mcp2025ToolDefinition,
  type Mcp2025ToolResponse,
} from '../types/mcp-2025';
import { wrapToolHandler as _wrapToolHandler } from '../utils/mcp-2025-migration';

// Import existing tool implementations

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [PROPERTY-2025] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class PropertyALECSServer2025 {
  private server: Server;
  private client: AkamaiClient;
  private tools: Map<string, Mcp2025ToolDefinition> = new Map();

  constructor() {
    log('INFO', '🏢 ALECS Property Server 2025 starting...');

    this.server = new Server(
      {
        name: 'alecs-property-server-2025',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.client = new AkamaiClient();
    this.registerTools();
    this.setupHandlers();

    log('INFO', `✅ Server initialized with ${this.tools.size} tools`);
  }

  private registerTools() {
    // Register tools with MCP 2025 compliant names and schemas
    const toolDefinitions: Mcp2025ToolDefinition[] = [
      {
        name: 'list_properties',
        description: 'List all Akamai CDN properties in your account',
        inputSchema: PropertyManagerSchemas2025.list_properties,
      },
      {
        name: 'get_property',
        description: 'Get details of a specific property',
        inputSchema: PropertyManagerSchemas2025.get_property,
      },
      {
        name: 'create_property',
        description: 'Create a new property',
        inputSchema: PropertyManagerSchemas2025.create_property,
      },
      {
        name: 'activate_property',
        description: 'Activate a property version to staging or production',
        inputSchema: PropertyManagerSchemas2025.activate_property,
      },
      {
        name: 'list_groups',
        description: 'List all groups in the account',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'list_contracts',
        description: 'List all contracts in the account',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'create_property_version',
        description: 'Create a new version of a property',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            createFromVersion: { type: 'number', description: 'Version to create from' },
            createFromVersionEtag: { type: 'string', description: 'Version etag' },
          },
          required: ['propertyId'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_property_rules',
        description: 'Get the rule tree for a property version',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            version: { type: 'number', description: 'Property version' },
            validateRules: { type: 'boolean', description: 'Validate rules' },
          },
          required: ['propertyId', 'version'],
          additionalProperties: false,
        },
      },
      {
        name: 'update_property_rules',
        description: 'Update the rule tree for a property version',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            version: { type: 'number', description: 'Property version' },
            rules: { type: 'object', description: 'Rule tree object' },
            validateRules: { type: 'boolean', description: 'Validate rules before saving' },
          },
          required: ['propertyId', 'version', 'rules'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_activation_status',
        description: 'Get the activation status for a property',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            activationId: { type: 'string', description: 'Activation ID' },
          },
          required: ['propertyId', 'activationId'],
          additionalProperties: false,
        },
      },
    ];

    // Register all tools
    for (const tool of toolDefinitions) {
      this.tools.set(tool.name, tool);
      log('DEBUG', `Registered tool: ${tool.name}`);
    }
  }

  private setupHandlers() {
    // Handle list_tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', 'Handling list_tools request');
      const tools = Array.from(this.tools.values());
      return { tools };
    });

    // Handle call_tool request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      log('INFO', `Handling call_tool _request: ${name}`, { args });

      const startTime = Date.now();

      try {
        // Validate tool exists
        if (!this.tools.has(name)) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Handle each tool with MCP 2025 compliant responses
        let result: Mcp2025ToolResponse;

        switch (name) {
          case 'list_properties': {
            const validated = PropertyManagerZodSchemas.list_properties.parse(args);
            const response = await listProperties(this.client, validated);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'get_property': {
            const validated = PropertyManagerZodSchemas.get_property.parse(args);
            const response = await getProperty(this.client, validated);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'create_property': {
            const validated = PropertyManagerZodSchemas.create_property.parse(args);
            const response = await createProperty(this.client, validated);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'activate_property': {
            const validated = PropertyManagerZodSchemas.activate_property.parse(args);
            const response = await activateProperty(this.client, validated);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'list_groups': {
            const response = await listGroups(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'list_contracts': {
            const response = await listContracts(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'create_property_version': {
            const response = await createPropertyVersion(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'get_property_rules': {
            const response = await getPropertyRules(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'update_property_rules': {
            const response = await updatePropertyRules(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          case 'get_activation_status': {
            const response = await getActivationStatus(this.client, args as any);
            result = createMcp2025Response(
              true,
              response,
              undefined,
              {
                duration: Date.now() - startTime,
                tool: name,
                version: '2.0.0',
              },
            );
            break;
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not implemented: ${name}`);
        }

        log('INFO', `Tool ${name} completed successfully`, {
          duration: result._meta?.duration,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (_error) {
        log('ERROR', `Tool ${name} failed`, { error: _error });

        const errorResult = createMcp2025Response(
          false,
          undefined,
          _error instanceof Error ? _error.message : 'Unknown _error',
          {
            duration: Date.now() - startTime,
            tool: name,
            version: '2.0.0',
            errorType: _error?.constructor?.name,
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errorResult, null, 2),
            },
          ],
        };
      }
    });
  }

  async run() {
    log('INFO', 'Starting server transport...');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log('INFO', '🚀 Property Server 2025 is running');
  }
}

// Run the server
if (require.main === module) {
  const server = new PropertyALECSServer2025();
  server.run().catch((_error) => {
    log('FATAL', 'Failed to start server', { error: _error });
    process.exit(1);
  });
}
