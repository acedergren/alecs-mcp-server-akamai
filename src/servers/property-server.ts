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
  onboardPropertyTool,
} from '../tools/property-onboarding-tools';
import {
  updatePropertyWithDefaultDV,
} from '../tools/property-manager-tools';
import {
  rollbackPropertyVersion,
} from '../tools/property-version-management';
import {
  validatePropertyActivation,
} from '../tools/property-activation-advanced';
import {
  listPropertyVersions,
  getPropertyVersion,
  listPropertyVersionHostnames,
  listEdgeHostnames,
  removeProperty,
  cloneProperty,
  cancelPropertyActivation,
  getLatestPropertyVersion,
} from '../tools/property-manager-advanced-tools';
import {
  searchPropertiesOptimized,
} from '../tools/property-search-optimized';
import {
  validateRuleTree,
} from '../tools/rule-tree-advanced';
import {
  type PropertyRules,
} from '../tools/rule-tree-management';
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
import { coalesceRequest, KeyNormalizers } from '../utils/request-coalescer';

// Import existing tool implementations

const log = (level: string, message: string, data?: unknown) => {
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
    log('INFO', 'ALECS Property Server 2025 starting...');

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
      {
        name: 'delete_property',
        description: 'Delete a property (must not have active versions)',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID to delete' },
          },
          required: ['propertyId'],
          additionalProperties: false,
        },
      },
      {
        name: 'clone_property',
        description: 'Clone an existing property with configuration',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            sourcePropertyId: { type: 'string', description: 'Source property ID to clone from' },
            propertyName: { type: 'string', description: 'New property name' },
            contractId: { type: 'string', description: 'Target contract ID (optional)' },
            groupId: { type: 'string', description: 'Target group ID (optional)' },
            cloneHostnames: { type: 'boolean', description: 'Clone hostnames with property' },
          },
          required: ['sourcePropertyId', 'propertyName'],
          additionalProperties: false,
        },
      },
      {
        name: 'cancel_property_activation',
        description: 'Cancel a pending property activation',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            activationId: { type: 'string', description: 'Activation ID to cancel' },
          },
          required: ['propertyId', 'activationId'],
          additionalProperties: false,
        },
      },
      {
        name: 'search_properties',
        description: 'Search properties by name, hostname, or other criteria',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyName: { type: 'string', description: 'Search by property name' },
            hostname: { type: 'string', description: 'Search by hostname' },
            edgeHostname: { type: 'string', description: 'Search by edge hostname' },
            contractId: { type: 'string', description: 'Filter by contract ID' },
            groupId: { type: 'string', description: 'Filter by group ID' },
            productId: { type: 'string', description: 'Filter by product ID' },
            activationStatus: {
              type: 'string',
              enum: ['production', 'staging', 'any', 'none'],
              description: 'Filter by activation status'
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'get_latest_property_version',
        description: 'Get the latest version of a property (overall or by network)',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            activatedOn: {
              type: 'string',
              enum: ['PRODUCTION', 'STAGING', 'LATEST'],
              description: 'Get version by activation status'
            },
          },
          required: ['propertyId'],
          additionalProperties: false,
        },
      },
      {
        name: 'onboard_property',
        description: 'Complete property onboarding workflow - creates property, edge hostname, DNS, and activates to staging',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            hostname: { type: 'string', description: 'Primary hostname for the property' },
            originHostname: { type: 'string', description: 'Origin server hostname' },
            contractId: { type: 'string', description: 'Contract ID (auto-detected if not provided)' },
            groupId: { type: 'string', description: 'Group ID (auto-detected if not provided)' },
            productId: { type: 'string', description: 'Product ID (auto-detected if not provided)' },
            network: {
              type: 'string',
              enum: ['STANDARD_TLS', 'ENHANCED_TLS', 'SHARED_CERT'],
              description: 'Edge hostname network type'
            },
            certificateType: {
              type: 'string',
              enum: ['DEFAULT', 'CPS_MANAGED'],
              description: 'Certificate type'
            },
            notificationEmails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Email addresses for activation notifications'
            },
            skipDnsSetup: { type: 'boolean', description: 'Skip DNS setup steps' },
            dnsProvider: { type: 'string', description: 'DNS provider (aws, cloudflare, azure, other)' },
            useCase: {
              type: 'string',
              enum: ['web-app', 'api', 'download', 'streaming', 'basic-web'],
              description: 'Use case for optimized configuration'
            },
          },
          required: ['hostname'],
          additionalProperties: false,
        },
      },
      {
        name: 'update_property_with_default_dv',
        description: 'Update property to use Default DV SSL certificate for HTTPS delivery',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID to update' },
            hostname: { type: 'string', description: 'Hostname for the certificate' },
            network: {
              type: 'string',
              enum: ['STAGING', 'PRODUCTION'],
              description: 'Network to update (default: both)'
            },
            activateChanges: { type: 'boolean', description: 'Automatically activate changes' },
            notificationEmails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Email addresses for notifications'
            },
          },
          required: ['propertyId', 'hostname'],
          additionalProperties: false,
        },
      },
      {
        name: 'rollback_property_version',
        description: 'Rollback to a previous property version by creating new version from it',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            targetVersion: { type: 'number', description: 'Version to rollback to' },
            activateNetwork: {
              type: 'string',
              enum: ['STAGING', 'PRODUCTION', 'BOTH'],
              description: 'Network to activate on'
            },
            reason: { type: 'string', description: 'Reason for rollback' },
            notificationEmails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Email addresses for notifications'
            },
          },
          required: ['propertyId', 'targetVersion'],
          additionalProperties: false,
        },
      },
      {
        name: 'validate_property_activation',
        description: 'Validate property before activation - checks rules, hostnames, origins',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', description: 'Optional: Customer section name' },
            propertyId: { type: 'string', description: 'Property ID' },
            version: { type: 'number', description: 'Version to validate' },
            network: {
              type: 'string',
              enum: ['STAGING', 'PRODUCTION'],
              description: 'Target network for validation'
            },
            checkOrigins: { type: 'boolean', description: 'Validate origin connectivity' },
            checkCertificates: { type: 'boolean', description: 'Validate SSL certificates' },
            checkDns: { type: 'boolean', description: 'Validate DNS configuration' },
          },
          required: ['propertyId', 'version', 'network'],
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
            const response = await coalesceRequest(
              'list_properties',
              validated,
              () => listProperties(this.client, {
                ...(validated.customer && { customer: validated.customer }),
                ...(validated.contractId && { contractId: validated.contractId }),
                ...(validated.groupId && { groupId: validated.groupId }),
                ...(validated.limit && { limit: validated.limit }),
                ...(validated.includeSubgroups !== undefined && { includeSubgroups: validated.includeSubgroups })
              }),
              KeyNormalizers.list
            );
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_property': {
            const validated = PropertyManagerZodSchemas.get_property.parse(args);
            const response = await coalesceRequest(
              'get_property',
              validated,
              () => getProperty(this.client, { propertyId: validated.propertyId }),
              KeyNormalizers.property
            );
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
            // CODE KAI: Type-safe parameter handling for listGroups
            const groupArgs: Parameters<typeof listGroups>[1] = {
              ...(args.customer && { customer: args.customer as string }),
              ...(args.searchTerm && { searchTerm: args.searchTerm as string })
            };
            const response = await listGroups(this.client, groupArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'list_contracts': {
            // CODE KAI: Type-safe parameter handling for listContracts
            const contractArgs: Parameters<typeof listContracts>[1] = {
              ...(args.customer && { customer: args.customer as string }),
              ...(args.searchTerm && { searchTerm: args.searchTerm as string })
            };
            const response = await listContracts(this.client, contractArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'create_property_version': {
            // CODE KAI: Type-safe parameter handling for createPropertyVersion
            const versionArgs: Parameters<typeof createPropertyVersion>[1] = {
              propertyId: args.propertyId as string,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.createFromVersion && { baseVersion: args.createFromVersion as number }),
              ...(args.createFromVersionEtag && { etag: args.createFromVersionEtag as string }),
              ...(args.note && { note: args.note as string })
            };
            const response = await createPropertyVersion(this.client, versionArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_property_rules': {
            // CODE KAI: Type-safe parameter handling for getPropertyRules
            const rulesArgs: Parameters<typeof getPropertyRules>[1] = {
              propertyId: args.propertyId as string,
              version: args.version as number,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.validateRules !== undefined && { validateRules: args.validateRules as boolean })
            };
            const response = await getPropertyRules(this.client, rulesArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'update_property_rules': {
            // CODE KAI: Type-safe parameter handling for updatePropertyRules
            const updateRulesArgs: Parameters<typeof updatePropertyRules>[1] = {
              propertyId: args.propertyId as string,
              version: args.version as number,
              rules: args.rules as PropertyRules,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.validateRules !== undefined && { validateRules: args.validateRules as boolean })
            };
            const response = await updatePropertyRules(this.client, updateRulesArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_activation_status': {
            // CODE KAI: Type-safe parameter handling for getActivationStatus
            const statusArgs: Parameters<typeof getActivationStatus>[1] = {
              propertyId: args.propertyId as string,
              activationId: args.activationId as string,
              ...(args.customer && { customer: args.customer as string })
            };
            const response = await getActivationStatus(this.client, statusArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'remove_property_hostname': {
            const validated = PropertyManagerZodSchemas.remove_property_hostname.parse(args);
            // TODO: Handle batch removal - for now just remove first hostname
            const hostname = validated.hostnames?.[0];
            if (!hostname) {
              throw new McpError(ErrorCode.InvalidParams, 'At least one hostname must be provided');
            }
            const response = await removePropertyHostname(this.client, {
              propertyId: validated.propertyId,
              version: validated.version,
              hostname: hostname,
              ...(validated.customer && { customer: validated.customer })
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

          case 'delete_property': {
            // CODE KAI: Type-safe parameter handling for removeProperty
            const deleteArgs: Parameters<typeof removeProperty>[1] = {
              propertyId: args.propertyId as string,
              ...(args.customer && { customer: args.customer as string })
            };
            const response = await removeProperty(this.client, deleteArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'clone_property': {
            // CODE KAI: Type-safe parameter handling for cloneProperty
            const cloneArgs: Parameters<typeof cloneProperty>[1] = {
              propertyId: args.sourcePropertyId as string,
              newPropertyName: args.propertyName as string,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.contractId && { contractId: args.contractId as string }),
              ...(args.groupId && { groupId: args.groupId as string }),
              ...(args.cloneHostnames !== undefined && { includeHostnames: args.cloneHostnames as boolean })
            };
            const response = await cloneProperty(this.client, cloneArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'cancel_property_activation': {
            // CODE KAI: Type-safe parameter handling for cancelPropertyActivation
            const cancelArgs: Parameters<typeof cancelPropertyActivation>[1] = {
              propertyId: args.propertyId as string,
              activationId: args.activationId as string,
              ...(args.customer && { customer: args.customer as string })
            };
            const response = await cancelPropertyActivation(this.client, cancelArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'search_properties': {
            // CODE KAI: Type-safe parameter handling for searchPropertiesOptimized
            const searchArgs: Parameters<typeof searchPropertiesOptimized>[1] = {
              ...(args.customer && { customer: args.customer as string }),
              ...(args.propertyName && { propertyName: args.propertyName as string }),
              ...(args.hostname && { hostname: args.hostname as string }),
              ...(args.edgeHostname && { edgeHostname: args.edgeHostname as string }),
              ...(args.contractId && { contractId: args.contractId as string }),
              ...(args.groupId && { groupId: args.groupId as string }),
              ...(args.productId && { productId: args.productId as string }),
              ...(args.activationStatus && { activationStatus: args.activationStatus as 'production' | 'staging' | 'any' | 'none' })
            };
            const response = await coalesceRequest(
              'search_properties',
              searchArgs,
              () => searchPropertiesOptimized(this.client, searchArgs),
              KeyNormalizers.search
            );
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'get_latest_property_version': {
            // CODE KAI: Type-safe parameter handling for getLatestPropertyVersion
            const latestArgs: Parameters<typeof getLatestPropertyVersion>[1] = {
              propertyId: args.propertyId as string,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.activatedOn && { activatedOn: args.activatedOn as 'PRODUCTION' | 'STAGING' | 'LATEST' })
            };
            const response = await getLatestPropertyVersion(this.client, latestArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'onboard_property': {
            // CODE KAI: Complete property onboarding workflow with intelligent defaults
            // This tool automates the entire CDN property setup process
            if (!args || typeof args !== 'object' || !('hostname' in args)) {
              throw new McpError(ErrorCode.InvalidParams, 'hostname parameter is required');
            }
            const onboardArgs: Parameters<typeof onboardPropertyTool>[1] = {
              hostname: args['hostname'] as string,
              ...('customer' in args && { customer: args['customer'] as string }),
              ...('originHostname' in args && { originHostname: args['originHostname'] as string }),
              ...('contractId' in args && { contractId: args['contractId'] as string }),
              ...('groupId' in args && { groupId: args['groupId'] as string }),
              ...('productId' in args && { productId: args['productId'] as string }),
              ...('network' in args && { network: args['network'] as 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT' }),
              ...('certificateType' in args && { certificateType: args['certificateType'] as 'DEFAULT' | 'CPS_MANAGED' }),
              ...('notificationEmails' in args && { notificationEmails: args['notificationEmails'] as string[] }),
              ...('skipDnsSetup' in args && typeof args['skipDnsSetup'] === 'boolean' && { skipDnsSetup: args['skipDnsSetup'] }),
              ...('dnsProvider' in args && { dnsProvider: args['dnsProvider'] as string }),
              ...('useCase' in args && { useCase: args['useCase'] as 'web-app' | 'api' | 'download' | 'streaming' | 'basic-web' })
            };
            const response = await onboardPropertyTool(this.client, onboardArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'update_property_with_default_dv': {
            // CODE KAI: Update property for HTTPS with Default DV certificate
            const dvArgs: Parameters<typeof updatePropertyWithDefaultDV>[1] = {
              propertyId: args.propertyId as string,
              hostname: args.hostname as string,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.network && { network: args.network as 'STAGING' | 'PRODUCTION' }),
              ...(args.activateChanges !== undefined && { activateChanges: args.activateChanges as boolean }),
              ...(args.notificationEmails && { notificationEmails: args.notificationEmails as string[] })
            };
            const response = await updatePropertyWithDefaultDV(this.client, dvArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'rollback_property_version': {
            // CODE KAI: Emergency rollback to previous property version
            const rollbackArgs: Parameters<typeof rollbackPropertyVersion>[1] = {
              propertyId: args.propertyId as string,
              targetVersion: args.targetVersion as number,
              ...(args.customer && { customer: args.customer as string }),
              ...(args.activateNetwork && { activateNetwork: args.activateNetwork as 'STAGING' | 'PRODUCTION' | 'BOTH' }),
              ...(args.reason && { reason: args.reason as string }),
              ...(args.notificationEmails && { notificationEmails: args.notificationEmails as string[] })
            };
            const response = await rollbackPropertyVersion(this.client, rollbackArgs);
            result = createMcp2025Response(true, response, undefined, {
              duration: Date.now() - startTime,
              tool: name,
              version: '2.0.0',
            });
            break;
          }

          case 'validate_property_activation': {
            // CODE KAI: Pre-activation validation to ensure smooth deployment
            const validateArgs: Parameters<typeof validatePropertyActivation>[1] = {
              propertyId: args.propertyId as string,
              version: args.version as number,
              network: args.network as 'STAGING' | 'PRODUCTION',
              ...(args.customer && { customer: args.customer as string }),
              ...(args.checkOrigins !== undefined && { checkOrigins: args.checkOrigins as boolean }),
              ...(args.checkCertificates !== undefined && { checkCertificates: args.checkCertificates as boolean }),
              ...(args.checkDns !== undefined && { checkDns: args.checkDns as boolean })
            };
            const response = await validatePropertyActivation(this.client, validateArgs);
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
