#!/usr/bin/env node
// @ts-nocheck

/**
 * ALECS Property Server - Property Manager Module
 * Handles CDN property configuration, rules, and basic certificate integration
 * Includes Default DV (shared certificate) support for property provisioning
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

import { AkamaiClient } from '../akamai-client';

// Property Management Tools - with caching support

// CP Code Tools
import { listCPCodes, createCPCode } from '../tools/cpcode-tools';

// Includes Tools
import { listIncludes, createInclude } from '../tools/includes-tools';
import { listProducts } from '../tools/product-tools';
import {
  listEdgeHostnames,
  cloneProperty,
  removeProperty,
  listPropertyVersions,
  getPropertyVersion,
  searchProperties,
} from '../tools/property-manager-advanced-tools';
import {
  createPropertyVersion,
  getPropertyRules,
  updatePropertyRules,
  createEdgeHostname,
  addPropertyHostname,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate,
} from '../tools/property-manager-tools';

// Rule Tree Tools

// Property Onboarding Tools
import {
  onboardPropertyTool,
  onboardPropertyWizard,
  checkOnboardingStatus,
} from '../tools/property-onboarding-tools';
import {
  listProperties,
  getProperty,
  createProperty,
  listGroups,
  listContracts,
} from '../tools/property-tools';
import { validateRuleTree } from '../tools/rule-tree-advanced';

// Universal Search Tool - now with caching!
import { universalSearchWithCacheHandler } from '../tools/universal-search-with-cache';

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [PROPERTY] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class PropertyALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    log('INFO', '[EMOJI] ALECS Property Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

    this.server = new Server(
      {
        name: 'alecs-property',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    try {
      log('INFO', 'Initializing Akamai client...');
      this.client = new AkamaiClient();
      log('INFO', '[DONE] Akamai client initialized successfully');
    } catch (_error) {
      log('ERROR', '[ERROR] Failed to initialize Akamai client', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List all property and certificate tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '[EMOJI] Tools list requested');
      const tools = [
        // Universal Search - The Main Tool
        {
          name: 'akamai.search',
          description:
            "Search for anything in Akamai - properties, hostnames, edge hostnames, CP codes, contracts, groups, or any other resource. Just type what you're looking for!",
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'Search for anything: hostname, property name, edge hostname, CP code, contract ID, group ID, or any Akamai resource',
              },
              customer: { type: 'string', description: 'Optional: Customer section name' },
              detailed: {
                type: 'boolean',
                description: 'Include detailed information in results (default: true)',
              },
              useCache: {
                type: 'boolean',
                description: 'Use cache for faster results (default: true)',
              },
              warmCache: {
                type: 'boolean',
                description: 'Pre-warm cache before search (default: false)',
              },
            },
            required: ['query'],
          },
        },
        // Property Management Tools
        {
          name: 'list-properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              contractId: { type: 'string', description: 'Optional: Filter by contract ID' },
              groupId: { type: 'string', description: 'Optional: Filter by group ID' },
              useCache: {
                type: 'boolean',
                description: 'Use cache for faster results (default: true)',
              },
              warmCache: {
                type: 'boolean',
                description: 'Pre-warm cache before fetching (default: false)',
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
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID (e.g., prp_12345)' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'onboard-property',
          description: 'Complete property onboarding workflow (HTTPS-only with Enhanced TLS)',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              hostname: {
                type: 'string',
                description: 'Hostname to onboard (e.g., code.example.com)',
              },
              originHostname: { type: 'string', description: 'Origin server hostname' },
              groupId: {
                type: 'string',
                description: 'Optional: Group ID (defaults to first available)',
              },
              productId: {
                type: 'string',
                description: 'Optional: Product ID (defaults to Ion Standard)',
              },
              network: {
                type: 'string',
                enum: ['STANDARD_TLS', 'ENHANCED_TLS', 'SHARED_CERT'],
                description: 'Optional: Network type (defaults to ENHANCED_TLS)',
              },
              certificateType: {
                type: 'string',
                enum: ['DEFAULT', 'CPS_MANAGED'],
                description: 'Optional: Certificate type (defaults to DEFAULT)',
              },
              notificationEmails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Notification email addresses',
              },
              skipDnsSetup: { type: 'boolean', description: 'Optional: Skip DNS setup' },
              dnsProvider: {
                type: 'string',
                description: 'Optional: Current DNS provider (aws, cloudflare, azure, other)',
              },
            },
            required: ['hostname'],
          },
        },
        {
          name: 'onboard-property-wizard',
          description: 'Interactive property onboarding wizard',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              hostname: { type: 'string', description: 'Hostname to onboard' },
            },
            required: ['hostname'],
          },
        },
        {
          name: 'check-onboarding-status',
          description: 'Check the status of property onboarding',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              hostname: { type: 'string', description: 'Hostname being onboarded' },
              propertyId: { type: 'string', description: 'Optional: Property ID to check' },
            },
            required: ['hostname'],
          },
        },
        {
          name: 'create-property',
          description: 'Create a new property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyName: { type: 'string', description: 'Name for the new property' },
              productId: { type: 'string', description: 'Product ID' },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'string', description: 'Group ID' },
              ruleFormat: { type: 'string', description: 'Optional: Rule format version' },
            },
            required: ['propertyName', 'productId', 'contractId', 'groupId'],
          },
        },
        {
          name: 'clone-property',
          description: 'Clone an existing property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              newPropertyName: { type: 'string' },
              groupId: { type: 'string' },
              contractId: { type: 'string' },
            },
            required: ['propertyId', 'newPropertyName'],
          },
        },
        {
          name: 'remove-property',
          description: 'Remove a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'search-properties',
          description: 'Search for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyName: { type: 'string' },
              hostname: { type: 'string' },
              edgeHostname: { type: 'string' },
            },
          },
        },
        {
          name: 'list-property-versions',
          description: 'List all versions of a property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'get-property-version',
          description: 'Get a specific property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
            },
            required: ['propertyId', 'version'],
          },
        },
        {
          name: 'create-property-version',
          description: 'Create a new property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              createFromVersion: { type: 'number' },
              createFromVersionEtag: { type: 'string' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'get-property-rules',
          description: 'Get property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
            },
            required: ['propertyId', 'version'],
          },
        },
        {
          name: 'update-property-rules',
          description: 'Update property rules',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
              rules: { type: 'object' },
            },
            required: ['propertyId', 'version', 'rules'],
          },
        },
        {
          name: 'validate-rule-tree',
          description: 'Validate a rule tree',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              rules: { type: 'object' },
              ruleFormat: { type: 'string' },
            },
            required: ['rules'],
          },
        },
        {
          name: 'activate-property',
          description: 'Activate a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
              network: { type: 'string', enum: ['STAGING', 'PRODUCTION'] },
              note: { type: 'string' },
              emails: { type: 'array', items: { type: 'string' } },
            },
            required: ['propertyId', 'version', 'network'],
          },
        },
        {
          name: 'get-activation-status',
          description: 'Get property activation status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              activationId: { type: 'string' },
            },
            required: ['propertyId', 'activationId'],
          },
        },
        {
          name: 'list-property-activations',
          description: 'List property activations',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
            },
            required: ['propertyId'],
          },
        },
        {
          name: 'add-property-hostname',
          description: 'Add hostname to property',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              propertyId: { type: 'string' },
              version: { type: 'number' },
              hostnames: { type: 'array', items: { type: 'object' } },
            },
            required: ['propertyId', 'version', 'hostnames'],
          },
        },
        {
          name: 'list-groups',
          description: 'List all groups in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              searchTerm: { type: 'string' },
            },
          },
        },
        {
          name: 'list-contracts',
          description: 'List all contracts',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
            },
          },
        },
        {
          name: 'list-products',
          description: 'List available products',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
            },
            required: ['contractId'],
          },
        },
        // Default Certificate Integration (for property provisioning)
        {
          name: 'update-property-with-default-dv',
          description: 'Update property with Default DV certificate (shared certificate)',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              propertyVersion: { type: 'number', description: 'Property version' },
              hostname: { type: 'string', description: 'Hostname to secure with Default DV' },
            },
            required: ['propertyId', 'propertyVersion', 'hostname'],
          },
        },
        {
          name: 'update-property-with-cps-certificate',
          description: 'Update property with CPS certificate',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              propertyVersion: { type: 'number', description: 'Property version' },
              enrollmentId: { type: 'number', description: 'Certificate enrollment ID' },
            },
            required: ['propertyId', 'propertyVersion', 'enrollmentId'],
          },
        },
        // Edge Hostname Tools
        {
          name: 'list-edge-hostnames',
          description: 'List edge hostnames',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
          },
        },
        {
          name: 'create-edge-hostname',
          description: 'Create edge hostname',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              domainPrefix: { type: 'string' },
              domainSuffix: { type: 'string' },
              productId: { type: 'string' },
              ipVersionBehavior: { type: 'string' },
              secure: { type: 'boolean' },
            },
            required: ['domainPrefix', 'domainSuffix', 'productId'],
          },
        },
        // CP Code Tools
        {
          name: 'list-cpcodes',
          description: 'List CP codes',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
          },
        },
        {
          name: 'create-cpcode',
          description: 'Create CP code',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              cpcodeName: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
              productId: { type: 'string' },
            },
            required: ['cpcodeName', 'contractId', 'groupId', 'productId'],
          },
        },
        // Includes Tools
        {
          name: 'list-includes',
          description: 'List includes',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
          },
        },
        {
          name: 'create-include',
          description: 'Create include',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              includeName: { type: 'string' },
              includeType: { type: 'string' },
              contractId: { type: 'string' },
              groupId: { type: 'string' },
            },
            required: ['includeName', 'includeType', 'contractId', 'groupId'],
          },
        },
      ];

      log('INFO', `[DONE] Returning ${tools.length} tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `[CONFIG] Tool called: ${name}`, { args });

      const startTime = Date.now();
      const client = this.client;

      try {
        let result;

        switch (name) {
          // Universal Search
          case 'akamai.search':
            result = await universalSearchWithCacheHandler(client, args as any);
            break;

          // Property Management Tools
          case 'list-properties':
            result = await listProperties(client, args as any);
            break;
          case 'get-property':
            result = await getProperty(client, args as any);
            break;
          case 'onboard-property':
            result = await onboardPropertyTool(client, args as any);
            break;
          case 'onboard-property-wizard':
            result = await onboardPropertyWizard(client, args as any);
            break;
          case 'check-onboarding-status':
            result = await checkOnboardingStatus(client, args as any);
            break;
          case 'create-property':
            result = await createProperty(client, args as any);
            break;
          case 'clone-property':
            result = await cloneProperty(client, args as any);
            break;
          case 'remove-property':
            result = await removeProperty(client, args as any);
            break;
          case 'search-properties':
            result = await searchProperties(client, args as any);
            break;
          case 'list-property-versions':
            result = await listPropertyVersions(client, args as any);
            break;
          case 'get-property-version':
            result = await getPropertyVersion(client, args as any);
            break;
          case 'create-property-version':
            result = await createPropertyVersion(client, args as any);
            break;
          case 'get-property-rules':
            result = await getPropertyRules(client, args as any);
            break;
          case 'update-property-rules':
            result = await updatePropertyRules(client, args as any);
            break;
          case 'validate-rule-tree':
            result = await validateRuleTree(client, args as any);
            break;
          case 'activate-property':
            result = await activateProperty(client, args as any);
            break;
          case 'get-activation-status':
            result = await getActivationStatus(client, args as any);
            break;
          case 'list-property-activations':
            result = await listPropertyActivations(client, args as any);
            break;
          case 'add-property-hostname':
            result = await addPropertyHostname(client, args as any);
            break;
          case 'list-groups':
            result = await listGroups(client, args as any);
            break;
          case 'list-contracts':
            result = await listContracts(client, args as any);
            break;
          case 'list-products':
            result = await listProducts(client, args as any);
            break;

          // Default Certificate Integration
          case 'update-property-with-default-dv':
            result = await updatePropertyWithDefaultDV(client, args as any);
            break;
          case 'update-property-with-cps-certificate':
            result = await updatePropertyWithCPSCertificate(client, args as any);
            break;

          // Edge Hostname Tools
          case 'list-edge-hostnames':
            result = await listEdgeHostnames(client, args as any);
            break;
          case 'create-edge-hostname':
            result = await createEdgeHostname(client, args as any);
            break;

          // CP Code Tools
          case 'list-cpcodes':
            result = await listCPCodes(client, args as any);
            break;
          case 'create-cpcode':
            result = await createCPCode(client, args as any);
            break;

          // Includes Tools
          case 'list-includes':
            result = await listIncludes(client, args as any);
            break;
          case 'create-include':
            result = await createInclude(client, args as any);
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }

        const duration = Date.now() - startTime;
        log('INFO', `[DONE] Tool ${name} completed in ${duration}ms`);

        return result;
      } catch (_error) {
        const duration = Date.now() - startTime;
        log('ERROR', `[ERROR] Tool ${name} failed after ${duration}ms`, {
          error:
            _error instanceof Error
              ? {
                  message: _error.message,
                  stack: _error.stack,
                }
              : String(_error),
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

    log('INFO', '[DONE] Request handlers set up successfully');
  }

  async start() {
    log('INFO', '[EMOJI] Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (_error: Error) => {
      log('ERROR', '[ERROR] Transport error', {
        message: _error.message,
        stack: _error.stack,
      });
    };

    transport.onclose = () => {
      log('INFO', '[EMOJI] Transport closed, shutting down...');
      process.exit(0);
    };

    try {
      await this.server.connect(transport);
      log('INFO', '[DONE] Server connected and ready for MCP connections');
      log('INFO', '[METRICS] Server stats', {
        toolCount: 32,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      });
    } catch (_error) {
      log('ERROR', '[ERROR] Failed to connect server', {
        error:
          _error instanceof Error
            ? {
                message: _error.message,
                stack: _error.stack,
              }
            : String(_error),
      });
      throw _error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '[TARGET] ALECS Property Server main() started');

  try {
    const server = new PropertyALECSServer();
    await server.start();

    // Set up periodic status logging
    setInterval(() => {
      log('DEBUG', '[EMOJI] Server heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      });
    }, 30000); // Every 30 seconds
  } catch (_error) {
    log('ERROR', '[ERROR] Failed to start server', {
      error:
        _error instanceof Error
          ? {
              message: _error.message,
              stack: _error.stack,
            }
          : String(_error),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (_error) => {
  log('ERROR', '[ERROR] Uncaught exception', {
    error: {
      message: _error.message,
      stack: _error.stack,
    },
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', '[ERROR] Unhandled rejection', {
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
  log('INFO', '[EMOJI] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('INFO', '[EMOJI] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
log('INFO', '[DEPLOY] Initiating ALECS Property Server...');
main();
