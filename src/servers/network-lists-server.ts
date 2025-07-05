#!/usr/bin/env node

// Register module aliases for runtime path resolution

/**
 * ALECS Network Lists Server
 * Specialized server for Network Lists management
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
import { zodToJsonSchema } from 'zod-to-json-schema';

import { AkamaiClient } from '../akamai-client';
import { CustomerConfigManager } from '../utils/customer-config';
import { logger } from '../utils/logger';

// Import Network Lists tools
import {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  deleteNetworkList,
} from '../tools/security/network-lists-tools';

import {
  activateNetworkList,
  getNetworkListActivationStatus,
  listNetworkListActivations,
  deactivateNetworkList,
  bulkActivateNetworkLists,
} from '../tools/security/network-lists-activation';

import {
  importNetworkListFromCSV,
  exportNetworkListToCSV,
  bulkUpdateNetworkLists,
  mergeNetworkLists,
} from '../tools/security/network-lists-bulk';

import {
  validateGeographicCodes,
  getASNInformation,
  generateGeographicBlockingRecommendations,
  generateASNSecurityRecommendations,
  listCommonGeographicCodes,
} from '../tools/security/network-lists-geo-asn';

import {
  getSecurityPolicyIntegrationGuidance,
  generateDeploymentChecklist,
} from '../tools/security/network-lists-integration';

// Schemas
const ListNetworkListsSchema = z.object({
  customer: z.string().optional(),
  includeElements: z.boolean().optional(),
  listType: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']).optional(),
});

const GetNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
  includeElements: z.boolean().optional(),
});

const CreateNetworkListSchema = z.object({
  customer: z.string().optional(),
  name: z.string(),
  type: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']),
  description: z.string().optional(),
  elements: z.array(z.string()).optional(),
});

const UpdateNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
  elements: z.array(z.string()),
  mode: z.enum(['add', 'remove', 'replace']).default('add'),
});

const DeleteNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
});

const ActivateNetworkListSchema = z.object({
  customer: z.string().optional(),
  networkListId: z.string(),
  network: z.enum(['staging', 'production']),
  comments: z.string().optional(),
  notificationEmails: z.array(z.string()).optional(),
});

const ValidateGeographicCodesSchema = z.object({
  customer: z.string().optional(),
  codes: z.array(z.string()),
});

const GetASNInformationSchema = z.object({
  customer: z.string().optional(),
  asns: z.array(z.number()),
});

interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

class NetworkListsServer {
  private server: Server;
  private client: AkamaiClient;
  private _configManager: CustomerConfigManager; // CODE KAI: Customer context validation (used for auth)
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'alecs-network-lists',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.client = new AkamaiClient();
    this._configManager = CustomerConfigManager.getInstance();
    
    this.registerTools();
    this.setupHandlers();
    
    logger.info('Network Lists Server initialized', {
      toolCount: this.tools.size,
    });
  }

  private registerTools(): void {
    // Basic Operations
    this.registerTool({
      name: 'list-network-lists',
      description: 'List all network lists in the account',
      schema: ListNetworkListsSchema,
      handler: listNetworkLists,
    });

    this.registerTool({
      name: 'get-network-list',
      description: 'Get detailed information about a specific network list',
      schema: GetNetworkListSchema,
      handler: getNetworkList,
    });

    this.registerTool({
      name: 'create-network-list',
      description: 'Create a new network list',
      schema: CreateNetworkListSchema,
      handler: async (_client, params) => createNetworkList(
        params.name,
        params.type,
        params.elements,
        params.customer,
        params.options
      ),
    });

    this.registerTool({
      name: 'update-network-list',
      description: 'Update network list elements',
      schema: UpdateNetworkListSchema,
      handler: updateNetworkList,
    });

    this.registerTool({
      name: 'delete-network-list',
      description: 'Delete a network list',
      schema: DeleteNetworkListSchema,
      handler: deleteNetworkList,
    });

    // Activation Tools
    this.registerTool({
      name: 'activate-network-list',
      description: 'Activate network list to staging or production',
      schema: ActivateNetworkListSchema,
      handler: activateNetworkList,
    });

    this.registerTool({
      name: 'get-activation-status',
      description: 'Get network list activation status',
      schema: z.object({
        customer: z.string().optional(),
        activationId: z.string(),
      }),
      handler: getNetworkListActivationStatus,
    });

    this.registerTool({
      name: 'list-network-list-activations',
      description: 'List network list activation history',
      schema: z.object({
        customer: z.string().optional(),
        networkListId: z.string(),
      }),
      handler: listNetworkListActivations,
    });

    this.registerTool({
      name: 'deactivate-network-list',
      description: 'Deactivate network list from a network',
      schema: z.object({
        customer: z.string().optional(),
        networkListId: z.string(),
        network: z.enum(['staging', 'production']),
      }),
      handler: deactivateNetworkList,
    });

    this.registerTool({
      name: 'bulk-activate-network-lists',
      description: 'Activate multiple network lists at once',
      schema: z.object({
        customer: z.string().optional(),
        networkListIds: z.array(z.string()),
        network: z.enum(['staging', 'production']),
        comments: z.string().optional(),
      }),
      handler: bulkActivateNetworkLists,
    });

    // Bulk Operations
    this.registerTool({
      name: 'import-network-list-from-csv',
      description: 'Import network list from CSV file',
      schema: z.object({
        customer: z.string().optional(),
        csvContent: z.string(),
        networkListId: z.string().optional(),
        createNew: z.boolean().optional(),
      }),
      handler: importNetworkListFromCSV,
    });

    this.registerTool({
      name: 'export-network-list-to-csv',
      description: 'Export network list to CSV format',
      schema: z.object({
        customer: z.string().optional(),
        networkListId: z.string(),
      }),
      handler: exportNetworkListToCSV,
    });

    this.registerTool({
      name: 'bulk-update-network-lists',
      description: 'Update multiple network lists in bulk',
      schema: z.object({
        customer: z.string().optional(),
        updates: z.array(z.object({
          networkListId: z.string(),
          elements: z.array(z.string()),
          mode: z.enum(['add', 'remove', 'replace']),
        })),
      }),
      handler: bulkUpdateNetworkLists,
    });

    this.registerTool({
      name: 'merge-network-lists',
      description: 'Merge multiple network lists together',
      schema: z.object({
        customer: z.string().optional(),
        sourceNetworkListIds: z.array(z.string()),
        targetNetworkListId: z.string(),
        removeDuplicates: z.boolean().optional(),
      }),
      handler: mergeNetworkLists,
    });

    // Geo/ASN Tools
    this.registerTool({
      name: 'validate-geo-codes',
      description: 'Validate geographic codes',
      schema: ValidateGeographicCodesSchema,
      handler: validateGeographicCodes,
    });

    this.registerTool({
      name: 'get-asn-information',
      description: 'Get information about ASN',
      schema: GetASNInformationSchema,
      handler: getASNInformation,
    });

    this.registerTool({
      name: 'suggest-geo-blocks',
      description: 'Generate geo-blocking recommendations',
      schema: z.object({
        customer: z.string().optional(),
        analysisType: z.enum(['security', 'compliance', 'performance']),
        propertyIds: z.array(z.string()).optional(),
      }),
      handler: generateGeographicBlockingRecommendations,
    });

    this.registerTool({
      name: 'suggest-asn-blocks',
      description: 'Generate ASN security recommendations',
      schema: z.object({
        customer: z.string().optional(),
        propertyIds: z.array(z.string()).optional(),
      }),
      handler: generateASNSecurityRecommendations,
    });

    this.registerTool({
      name: 'list-geo-codes',
      description: 'List common geographic codes',
      schema: z.object({
        customer: z.string().optional(),
        region: z.enum(['continents', 'countries', 'states']).optional(),
      }),
      handler: listCommonGeographicCodes,
    });

    // Integration Tools
    this.registerTool({
      name: 'get-secpolicy-guidance',
      description: 'Get guidance on integrating network lists with security policies',
      schema: z.object({
        customer: z.string().optional(),
        securityConfigId: z.number().optional(),
      }),
      handler: getSecurityPolicyIntegrationGuidance,
    });

    this.registerTool({
      name: 'generate-deployment-checklist',
      description: 'Generate comprehensive network list deployment checklist',
      schema: z.object({
        customer: z.string().optional(),
        networkListIds: z.array(z.string()),
        includeSecurityPolicies: z.boolean().optional(),
      }),
      handler: generateDeploymentChecklist,
    });
  }

  private registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.name, definition);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.entries()).map(([name, def]) => ({
        name,
        description: def.description,
        inputSchema: this.zodToJsonSchema(def.schema),
      })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        const validatedArgs = tool.schema.parse(args);
        
        // CODE KAI: Validate customer configuration if provided
        if (validatedArgs.customer) {
          const isValid = this._configManager.hasSection(validatedArgs.customer);
          if (!isValid) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid customer configuration: ${validatedArgs.customer}`
            );
          }
        }
        
        const result = await tool.handler(this.client, validatedArgs);
        
        return {
          content: result.content || [
            {
              type: 'text',
              text: JSON.stringify(result.data || result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  private zodToJsonSchema(schema: z.ZodSchema): any {
    // Convert Zod schema to JSON Schema for MCP protocol
    try {
      const jsonSchema = zodToJsonSchema(schema);
      // Remove $schema property as it's not needed for MCP
      if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
        const { $schema, ...rest } = jsonSchema as Record<string, unknown>;
        return rest;
      }
      return jsonSchema;
    } catch (error) {
      logger.error('Failed to convert Zod schema to JSON schema', error);
      // Fallback to basic schema
      return {
        type: 'object',
        properties: {},
        required: [],
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Network Lists Server started');
  }
}

// Start the server
const server = new NetworkListsServer();
server.start().catch((error) => {
  logger.error('Failed to start Network Lists Server', error);
  process.exit(1);
});