#!/usr/bin/env node

/**
 * ALECS Security Server - Security & Protection Module
 * Handles WAF, DDoS protection, bot management, network lists, and security policies
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

// Network Lists Tools
import { basicAppSecTools } from '../tools/security/appsec-basic-tools-v2';
import {
  listNetworkLists,
  getNetworkList,
  createNetworkList,
  updateNetworkList,
  deleteNetworkList,
  activateNetworkList,
  getNetworkListActivationStatus,
  listNetworkListActivations,
  deactivateNetworkList,
  bulkActivateNetworkLists,
  importNetworkListFromCSV,
  exportNetworkListToCSV,
  bulkUpdateNetworkLists,
  mergeNetworkLists,
  validateGeographicCodes,
  getASNInformation,
  generateGeographicBlockingRecommendations,
  generateASNSecurityRecommendations,
  listCommonGeographicCodes,
  getSecurityPolicyIntegrationGuidance,
  generateDeploymentChecklist,
} from '../tools/security/network-lists-integration';

// Application Security Tools

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [SECURITY] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class SecurityALECSServer {
  private server: Server;

  constructor() {
    log('INFO', '🔒 ALECS Security Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

    this.server = new Server(
      {
        name: 'alecs-security',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List all security tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '📋 Tools list requested');

      // Network Lists tools
      const networkListTools = [
        {
          name: 'list-network-lists',
          description: 'List all network lists',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              search: { type: 'string', description: 'Optional: Search term' },
              type: {
                type: 'string',
                enum: ['IP', 'GEO'],
                description: 'Optional: List type filter',
              },
              includeElements: { type: 'boolean', description: 'Optional: Include list elements' },
            },
          },
        },
        {
          name: 'get-network-list',
          description: 'Get details of a specific network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
              includeElements: { type: 'boolean', description: 'Optional: Include list elements' },
            },
            required: ['networkListId'],
          },
        },
        {
          name: 'create-network-list',
          description: 'Create a new network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              name: { type: 'string', description: 'List name' },
              type: { type: 'string', enum: ['IP', 'GEO'], description: 'List type' },
              description: { type: 'string', description: 'Optional: Description' },
              elements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Initial elements',
              },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'number', description: 'Group ID' },
            },
            required: ['name', 'type', 'contractId', 'groupId'],
          },
        },
        {
          name: 'update-network-list',
          description: 'Update a network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
              elements: { type: 'array', items: { type: 'string' }, description: 'New elements' },
              mode: {
                type: 'string',
                enum: ['append', 'replace', 'remove'],
                description: 'Update mode',
              },
              description: { type: 'string', description: 'Optional: Updated description' },
            },
            required: ['networkListId', 'elements', 'mode'],
          },
        },
        {
          name: 'delete-network-list',
          description: 'Delete a network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
            },
            required: ['networkListId'],
          },
        },
        {
          name: 'activate-network-list',
          description: 'Activate a network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              comment: { type: 'string', description: 'Optional: Activation comment' },
              notificationRecipients: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Email recipients',
              },
            },
            required: ['networkListId', 'network'],
          },
        },
        {
          name: 'get-network-list-activation-status',
          description: 'Get network list activation status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
              activationId: { type: 'number', description: 'Activation ID' },
            },
            required: ['networkListId', 'activationId'],
          },
        },
        {
          name: 'list-network-list-activations',
          description: 'List activations for a network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
            },
            required: ['networkListId'],
          },
        },
        {
          name: 'deactivate-network-list',
          description: 'Deactivate a network list',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              comment: { type: 'string', description: 'Optional: Deactivation comment' },
            },
            required: ['networkListId', 'network'],
          },
        },
        {
          name: 'bulk-activate-network-lists',
          description: 'Activate multiple network lists',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Network list IDs',
              },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              comment: { type: 'string', description: 'Optional: Activation comment' },
            },
            required: ['networkListIds', 'network'],
          },
        },
        {
          name: 'import-network-list-from-csv',
          description: 'Import network list from CSV',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              csvContent: { type: 'string', description: 'CSV content' },
              name: { type: 'string', description: 'List name' },
              type: { type: 'string', enum: ['IP', 'GEO'], description: 'List type' },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'number', description: 'Group ID' },
            },
            required: ['csvContent', 'name', 'type', 'contractId', 'groupId'],
          },
        },
        {
          name: 'export-network-list-to-csv',
          description: 'Export network list to CSV',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListId: { type: 'string', description: 'Network list ID' },
            },
            required: ['networkListId'],
          },
        },
        {
          name: 'bulk-update-network-lists',
          description: 'Update multiple network lists',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              updates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    networkListId: { type: 'string' },
                    elements: { type: 'array', items: { type: 'string' } },
                    mode: { type: 'string', enum: ['append', 'replace', 'remove'] },
                  },
                },
                description: 'List of updates',
              },
            },
            required: ['updates'],
          },
        },
        {
          name: 'merge-network-lists',
          description: 'Merge multiple network lists',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              sourceListIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Source list IDs',
              },
              targetListId: { type: 'string', description: 'Target list ID' },
              mode: {
                type: 'string',
                enum: ['union', 'intersection', 'difference'],
                description: 'Merge mode',
              },
            },
            required: ['sourceListIds', 'targetListId', 'mode'],
          },
        },
        {
          name: 'validate-geographic-codes',
          description: 'Validate geographic codes',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              codes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Geographic codes to validate',
              },
            },
            required: ['codes'],
          },
        },
        {
          name: 'get-asn-information',
          description: 'Get ASN information',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              asns: { type: 'array', items: { type: 'number' }, description: 'ASN numbers' },
            },
            required: ['asns'],
          },
        },
        {
          name: 'generate-geographic-blocking-recommendations',
          description: 'Generate geographic blocking recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              analysisType: {
                type: 'string',
                enum: ['threat', 'traffic', 'compliance'],
                description: 'Analysis type',
              },
            },
            required: ['propertyId', 'analysisType'],
          },
        },
        {
          name: 'generate-asn-security-recommendations',
          description: 'Generate ASN security recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              timeRange: { type: 'string', description: 'Time range for analysis' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'list-common-geographic-codes',
          description: 'List common geographic codes',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              region: { type: 'string', description: 'Optional: Filter by region' },
            },
          },
        },
        {
          name: 'get-security-policy-integration-guidance',
          description: 'Get security policy integration guidance',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              policyType: { type: 'string', description: 'Policy type' },
              targetEnvironment: { type: 'string', description: 'Target environment' },
            },
            required: ['policyType'],
          },
        },
        {
          name: 'generate-deployment-checklist',
          description: 'Generate network list deployment checklist',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              networkListIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Network list IDs to deploy',
              },
              targetNetwork: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Target network',
              },
              securityLevel: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                description: 'Security level',
              },
              includeRollbackPlan: { type: 'boolean', description: 'Include rollback plan' },
            },
            required: ['networkListIds'],
          },
        },
      ];

      // Get all application security tools from the imported module
      const appSecToolsList = basicAppSecTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      const tools = [...networkListTools, ...appSecToolsList];

      log('INFO', `✅ Returning ${tools.length} tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `🔧 Tool called: ${name}`, { args });

      const startTime = Date.now();

      try {
        let result;
        const typedArgs = args as any;

        // Check if it's an app sec tool
        const appSecTool = basicAppSecTools.find((t) => t.name === name);
        if (appSecTool) {
          result = await appSecTool.handler(args);
        } else {
          // Handle network list tools
          switch (name) {
            case 'list-network-lists':
              result = await listNetworkLists(typedArgs.customer, typedArgs);
              break;
            case 'get-network-list':
              result = await getNetworkList(typedArgs.networkListId, typedArgs.customer, typedArgs);
              break;
            case 'create-network-list':
              result = await createNetworkList(
                typedArgs.name,
                typedArgs.type,
                typedArgs.elements || [],
                typedArgs.customer,
                typedArgs,
              );
              break;
            case 'update-network-list': {
              const updateOptions: any = {};
              if (typedArgs.mode === 'append') {
                updateOptions.addElements = typedArgs.elements;
              } else if (typedArgs.mode === 'remove') {
                updateOptions.removeElements = typedArgs.elements;
              } else if (typedArgs.mode === 'replace') {
                updateOptions.replaceElements = typedArgs.elements;
              }
              if (typedArgs.description) {
                updateOptions.description = typedArgs.description;
              }
              result = await updateNetworkList(
                typedArgs.networkListId,
                typedArgs.customer,
                updateOptions,
              );
              break;
            }
            case 'delete-network-list':
              result = await deleteNetworkList(typedArgs.networkListId, typedArgs.customer);
              break;
            case 'activate-network-list': {
              const activateOptions: any = {};
              if (typedArgs.comment) {
                activateOptions.comments = typedArgs.comment;
              }
              if (typedArgs.notificationRecipients) {
                activateOptions.notificationEmails = typedArgs.notificationRecipients;
              }
              result = await activateNetworkList(
                typedArgs.networkListId,
                typedArgs.network,
                typedArgs.customer,
                activateOptions,
              );
              break;
            }
            case 'get-network-list-activation-status':
              result = await getNetworkListActivationStatus(
                typedArgs.activationId,
                typedArgs.customer,
              );
              break;
            case 'list-network-list-activations':
              result = await listNetworkListActivations(
                typedArgs.networkListId,
                typedArgs.customer,
              );
              break;
            case 'deactivate-network-list': {
              const deactivateOptions: any = {};
              if (typedArgs.comment) {
                deactivateOptions.comments = typedArgs.comment;
              }
              result = await deactivateNetworkList(
                typedArgs.networkListId,
                typedArgs.network,
                typedArgs.customer,
                deactivateOptions,
              );
              break;
            }
            case 'bulk-activate-network-lists': {
              const bulkActivations = typedArgs.networkListIds.map((id: string) => ({
                uniqueId: id,
                network: typedArgs.network,
              }));
              const bulkOptions: any = {};
              if (typedArgs.comment) {
                bulkOptions.comments = typedArgs.comment;
              }
              result = await bulkActivateNetworkLists(
                bulkActivations,
                typedArgs.customer,
                bulkOptions,
              );
              break;
            }
            case 'import-network-list-from-csv': {
              // First create the list, then import
              const createResult = await createNetworkList(
                typedArgs.name,
                typedArgs.type,
                [],
                typedArgs.customer,
                { contractId: typedArgs.contractId, groupId: typedArgs.groupId },
              );
              // Extract the uniqueId from the response
              const responseText = createResult.content[0]?.text || '';
              const uniqueIdMatch = responseText.match(/ID:\s*([^\s\n]+)/);
              if (uniqueIdMatch && uniqueIdMatch[1]) {
                result = await importNetworkListFromCSV(
                  uniqueIdMatch[1],
                  typedArgs.csvContent,
                  typedArgs.customer,
                  { operation: 'replace' },
                );
              } else {
                result = createResult;
              }
              break;
            }
            case 'export-network-list-to-csv':
              result = await exportNetworkListToCSV(typedArgs.networkListId, typedArgs.customer);
              break;
            case 'bulk-update-network-lists':
              result = await bulkUpdateNetworkLists(typedArgs.updates, typedArgs.customer);
              break;
            case 'merge-network-lists':
              result = await mergeNetworkLists(
                typedArgs.sourceListIds,
                typedArgs.targetListId,
                typedArgs.mode,
                typedArgs.customer,
              );
              break;
            case 'validate-geographic-codes':
              result = await validateGeographicCodes(typedArgs.codes, typedArgs.customer);
              break;
            case 'get-asn-information':
              result = await getASNInformation(typedArgs.asns, typedArgs.customer);
              break;
            case 'generate-geographic-blocking-recommendations':
              result = await generateGeographicBlockingRecommendations(typedArgs.customer, {
                purpose: typedArgs.analysisType,
              });
              break;
            case 'generate-asn-security-recommendations':
              result = await generateASNSecurityRecommendations(typedArgs.customer, {});
              break;
            case 'list-common-geographic-codes':
              result = await listCommonGeographicCodes();
              break;
            case 'get-security-policy-integration-guidance':
              result = await getSecurityPolicyIntegrationGuidance(typedArgs.customer, typedArgs);
              break;
            case 'generate-deployment-checklist':
              result = await generateDeploymentChecklist(
                typedArgs.networkListIds || [],
                typedArgs.customer,
                typedArgs,
              );
              break;

            default:
              throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
          }
        }

        const duration = Date.now() - startTime;
        log('INFO', `✅ Tool ${name} completed in ${duration}ms`);

        return result;
      } catch (_error) {
        const duration = Date.now() - startTime;
        log('ERROR', `❌ Tool ${name} failed after ${duration}ms`, {
          error:
            _error instanceof Error
              ? {
                  message: _error.message,
                  stack: _error.stack,
                }
              : String(error),
        });

        if (_error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${_error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          );
        }

        if (_error instanceof McpError) {
          throw _error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        );
      }
    });

    log('INFO', '✅ Request handlers set up successfully');
  }

  async start() {
    log('INFO', '📍 Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (_error: Error) => {
      log('ERROR', '❌ Transport error', {
        message: _error.message,
        stack: _error.stack,
      });
    };

    transport.onclose = () => {
      log('INFO', '🔌 Transport closed, shutting down...');
      process.exit(0);
    };

    try {
      await this.server.connect(transport);
      log('INFO', '✅ Server connected and ready for MCP connections');
      log('INFO', '📊 Server stats', {
        toolCount: 95,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      });
    } catch (_error) {
      log('ERROR', '❌ Failed to connect server', {
        error:
          _error instanceof Error
            ? {
                message: _error.message,
                stack: _error.stack,
              }
            : String(error),
      });
      throw _error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '🎯 ALECS Security Server main() started');

  try {
    const server = new SecurityALECSServer();
    await server.start();

    // Set up periodic status logging
    setInterval(() => {
      log('DEBUG', '💓 Server heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      });
    }, 30000); // Every 30 seconds
  } catch (_error) {
    log('ERROR', '❌ Failed to start server', {
      error:
        _error instanceof Error
          ? {
              message: _error.message,
              stack: _error.stack,
            }
          : String(error),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (_error) => {
  log('ERROR', '❌ Uncaught exception', {
    error: {
      message: _error.message,
      stack: _error.stack,
    },
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', '❌ Unhandled rejection', {
    reason:
      reason instanceof Error
        ? {
            message: reason.message,
            stack: reason.stack,
          }
        : String(reason),
    promise: String(promise),
  });
  process.exit(1);
});

// Handle signals
process.on('SIGTERM', () => {
  log('INFO', '📛 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', '📛 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
log('INFO', '🚀 Initiating ALECS Security Server...');
main();
