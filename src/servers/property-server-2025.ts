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
  listPropertyActivations,
  removePropertyHostname,
  addPropertyHostname,
  createEdgeHostname,
} from '../tools/property-manager-tools';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts,
  listProducts,
} from '../tools/property-tools';
import {
  listPropertyVersions,
  getPropertyVersion,
  listPropertyVersionHostnames,
  listEdgeHostnames,
} from '../tools/property-manager-advanced-tools';
import {
  validateRuleTree,
} from '../tools/rule-tree-advanced';
import {
  universalSearchWithCacheHandler,
} from '../tools/universal-search-with-cache';
import {
  listCPCodes,
  createCPCode,
  getCPCode,
} from '../tools/cpcode-tools';
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
    log('INFO', '[EMOJI] ALECS Property Server 2025 starting...');

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

    log('INFO', `[DONE] Server initialized with ${this.tools.size} tools`);
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
        name: 'list_property_versions',
        description: 'List all versions of a specific property',
        inputSchema: PropertyManagerSchemas2025.list_property_versions,
      },
      {
        name: 'get_property_version',
        description: 'Get details of a specific property version',
        inputSchema: PropertyManagerSchemas2025.get_property_version,
      },
      {
        name: 'list_property_activations',
        description: 'List activation history for a property',
        inputSchema: PropertyManagerSchemas2025.list_property_activations,
      },
      {
        name: 'validate_rule_tree',
        description: 'Validate property rule tree configuration',
        inputSchema: PropertyManagerSchemas2025.validate_rule_tree,
      },
      {
        name: 'list_products',
        description: 'List available products for a contract',
        inputSchema: PropertyManagerSchemas2025.list_products,
      },
      {
        name: 'search',
        description: 'Universal search across Akamai resources with intelligent caching',
        inputSchema: PropertyManagerSchemas2025.search,
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
      {
        name: 'remove_property_hostname',
        description: 'Remove hostnames from a property version',
        inputSchema: PropertyManagerSchemas2025.remove_property_hostname,
      },
      {
        name: 'list_property_hostnames',
        description: 'List hostnames configured for a property version',
        inputSchema: PropertyManagerSchemas2025.list_property_hostnames,
      },
      {
        name: 'add_property_hostname',
        description: 'Add a hostname to a property version',
        inputSchema: PropertyManagerSchemas2025.add_property_hostname,
      },
      {
        name: 'list_edge_hostnames',
        description: 'List available edge hostnames for a contract',
        inputSchema: PropertyManagerSchemas2025.list_edge_hostnames,
      },
      {
        name: 'create_edge_hostname',
        description: 'Create a new edge hostname for a property',
        inputSchema: PropertyManagerSchemas2025.create_edge_hostname,
      },
      {
        name: 'list_cpcodes',
        description: 'List CP codes in the account',
        inputSchema: PropertyManagerSchemas2025.list_cpcodes,
      },
      {
        name: 'create_cpcode',
        description: 'Create a new CP code',
        inputSchema: PropertyManagerSchemas2025.create_cpcode,
      },
      {
        name: 'get_cpcode',
        description: 'Get details of a specific CP code',
        inputSchema: PropertyManagerSchemas2025.get_cpcode,
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
            const response = await listProperties(this.client, {
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.contractId && { contractId: validated.contractId }),
              ...(validated.groupId && { groupId: validated.groupId }),
              ...(validated.limit && { limit: validated.limit }),
              ...(validated.includeSubgroups !== undefined && { includeSubgroups: validated.includeSubgroups })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_property': {
            const validated = PropertyManagerZodSchemas.get_property.parse(args);
            const response = await getProperty(this.client, validated);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'create_property': {
            const validated = PropertyManagerZodSchemas.create_property.parse(args);
            const response = await createProperty(this.client, {
              propertyName: validated.propertyName,
              productId: validated.productId,
              contractId: validated.contractId,
              groupId: validated.groupId,
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.ruleFormat && { ruleFormat: validated.ruleFormat })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'activate_property': {
            const validated = PropertyManagerZodSchemas.activate_property.parse(args);
            const response = await activateProperty(this.client, {
              propertyId: validated.propertyId,
              version: validated.version,
              network: validated.network,
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.note && { note: validated.note }),
              ...(validated.emails && { notifyEmails: validated.emails })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_property_versions': {
            const validated = PropertyManagerZodSchemas.list_property_versions.parse(args);
            const response = await listPropertyVersions(this.client, {
              propertyId: validated.propertyId,
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.limit && { limit: validated.limit })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_property_version': {
            const validated = PropertyManagerZodSchemas.get_property_version.parse(args);
            const response = await getPropertyVersion(this.client, {
              propertyId: validated.propertyId,
              version: validated.version,
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_property_activations': {
            const validated = PropertyManagerZodSchemas.list_property_activations.parse(args);
            const response = await listPropertyActivations(this.client, {
              propertyId: validated.propertyId,
              ...(validated.network && { network: validated.network })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'validate_rule_tree': {
            const validated = PropertyManagerZodSchemas.validate_rule_tree.parse(args);
            const response = await validateRuleTree(this.client, {
              propertyId: validated.propertyId,
              ...(validated.version && { version: validated.version }),
              ...(validated.rules && { rules: validated.rules }),
              ...(validated.includeOptimizations !== undefined && { includeOptimizations: validated.includeOptimizations }),
              ...(validated.includeStatistics !== undefined && { includeStatistics: validated.includeStatistics })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_products': {
            const validated = PropertyManagerZodSchemas.list_products.parse(args);
            const response = await listProducts(this.client, {
              contractId: validated.contractId,
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'search': {
            const validated = PropertyManagerZodSchemas.search.parse(args);
            const response = await universalSearchWithCacheHandler(this.client, {
              query: validated.query,
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.detailed !== undefined && { detailed: validated.detailed }),
              ...(validated.useCache !== undefined && { useCache: validated.useCache }),
              ...(validated.warmCache !== undefined && { warmCache: validated.warmCache })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_groups': {
            const response = await listGroups(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_contracts': {
            const response = await listContracts(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'create_property_version': {
            const response = await createPropertyVersion(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_property_rules': {
            const response = await getPropertyRules(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'update_property_rules': {
            const response = await updatePropertyRules(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_activation_status': {
            const response = await getActivationStatus(this.client, args as any);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'remove_property_hostname': {
            const validated = PropertyManagerZodSchemas.remove_property_hostname.parse(args);
            const response = await removePropertyHostname(this.client, {
              propertyId: validated.propertyId,
              version: validated.version,
              hostnames: validated.hostnames,
              ...(validated.customer && { customer: validated.customer }),
              ...(validated.contractId && { contractId: validated.contractId }),
              ...(validated.groupId && { groupId: validated.groupId })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_property_hostnames': {
            const validated = PropertyManagerZodSchemas.list_property_hostnames.parse(args);
            const response = await listPropertyVersionHostnames(this.client, {
              propertyId: validated.propertyId,
              ...(validated.version !== undefined && { version: validated.version }),
              ...(validated.validateCnames !== undefined && { validateCnames: validated.validateCnames }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'add_property_hostname': {
            const validated = PropertyManagerZodSchemas.add_property_hostname.parse(args);
            const response = await addPropertyHostname(this.client, {
              propertyId: validated.propertyId,
              hostname: validated.hostname,
              edgeHostname: validated.edgeHostname,
              ...(validated.version !== undefined && { version: validated.version }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_edge_hostnames': {
            const validated = PropertyManagerZodSchemas.list_edge_hostnames.parse(args);
            const response = await listEdgeHostnames(this.client, {
              ...(validated.contractId && { contractId: validated.contractId }),
              ...(validated.groupId && { groupId: validated.groupId }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'create_edge_hostname': {
            const validated = PropertyManagerZodSchemas.create_edge_hostname.parse(args);
            const response = await createEdgeHostname(this.client, {
              propertyId: validated.propertyId,
              domainPrefix: validated.domainPrefix,
              ...(validated.domainSuffix && { domainSuffix: validated.domainSuffix }),
              ...(validated.productId && { productId: validated.productId }),
              ...(validated.secure !== undefined && { secure: validated.secure }),
              ...(validated.ipVersion && { ipVersion: validated.ipVersion }),
              ...(validated.certificateEnrollmentId !== undefined && { certificateEnrollmentId: validated.certificateEnrollmentId }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_cpcodes': {
            const validated = PropertyManagerZodSchemas.list_cpcodes.parse(args);
            const response = await listCPCodes(this.client, {
              ...(validated.contractId && { contractId: validated.contractId }),
              ...(validated.groupId && { groupId: validated.groupId }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'create_cpcode': {
            const validated = PropertyManagerZodSchemas.create_cpcode.parse(args);
            const response = await createCPCode(this.client, {
              cpcodeName: validated.cpcodeName,
              contractId: validated.contractId,
              groupId: validated.groupId,
              productId: validated.productId,
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_cpcode': {
            const validated = PropertyManagerZodSchemas.get_cpcode.parse(args);
            const response = await getCPCode(this.client, {
              cpcodeId: validated.cpcodeId,
              ...(validated.contractId && { contractId: validated.contractId }),
              ...(validated.groupId && { groupId: validated.groupId }),
              ...(validated.customer && { customer: validated.customer })
            });
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
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
    log('INFO', '[DEPLOY] Property Server 2025 is running');
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
