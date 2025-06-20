#!/usr/bin/env node

/**
 * ALECS - MCP Server for Akamai (Essential Tools Only)
 * Testing with 15 essential tools across different products
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

// Import essential tools only

import { createDVEnrollment, checkDVEnrollmentStatus } from './tools/cps-tools';
import { listZones, getZone, createZone, listRecords, upsertRecord } from './tools/dns-tools';
import { fastPurgeTools } from './tools/fastpurge-tools';
import { activateProperty, getActivationStatus } from './tools/property-manager-tools';
import { listProperties, getProperty, createProperty, listGroups } from './tools/property-tools';
import { reportingTools } from './tools/reporting-tools';

// Schemas
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

// Add timestamp to all console.error for better debugging
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class EssentialALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    log('INFO', '🚀 ALECS Essential Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

    this.server = new Server(
      {
        name: 'alecs-essential',
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
      log('INFO', '✅ Akamai client initialized successfully');
    } catch (_error) {
      log('ERROR', '❌ Failed to initialize Akamai client', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List essential tools only (15 tools)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '📋 Tools list requested');
      const tools = [
        // Property Manager (5 tools)
        {
          name: 'list-properties',
          description: 'List all Akamai CDN properties in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              contractId: { type: 'string', description: 'Optional: Filter by contract ID' },
              groupId: { type: 'string', description: 'Optional: Filter by group ID' },
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
          name: 'activate-property',
          description: 'Activate a property version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              version: { type: 'number', description: 'Version to activate' },
              network: {
                type: 'string',
                enum: ['STAGING', 'PRODUCTION'],
                description: 'Network to activate on',
              },
              note: { type: 'string', description: 'Activation note' },
              emails: {
                type: 'array',
                items: { type: 'string' },
                description: 'Notification emails',
              },
            },
            required: ['propertyId', 'version', 'network'],
          },
        },
        {
          name: 'list-groups',
          description: 'List all groups in your account',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              searchTerm: { type: 'string', description: 'Optional: Search term' },
            },
          },
        },

        // DNS (5 tools)
        {
          name: 'list-zones',
          description: 'List all DNS zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              contractIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Filter by contracts',
              },
              search: { type: 'string', description: 'Optional: Search term' },
            },
          },
        },
        {
          name: 'get-zone',
          description: 'Get details of a specific DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name (e.g., example.com)' },
            },
            required: ['zone'],
          },
        },
        {
          name: 'create-zone',
          description: 'Create a new DNS zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              type: {
                type: 'string',
                enum: ['PRIMARY', 'SECONDARY', 'ALIAS'],
                description: 'Zone type',
              },
              contractId: { type: 'string', description: 'Contract ID' },
              groupId: { type: 'string', description: 'Optional: Group ID' },
              comment: { type: 'string', description: 'Optional: Comment' },
            },
            required: ['zone', 'type', 'contractId'],
          },
        },
        {
          name: 'list-records',
          description: 'List DNS records in a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              type: { type: 'string', description: 'Optional: Filter by record type' },
              name: { type: 'string', description: 'Optional: Filter by record name' },
            },
            required: ['zone'],
          },
        },
        {
          name: 'upsert-record',
          description: 'Create or update a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              name: { type: 'string', description: 'Record name' },
              type: {
                type: 'string',
                enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'],
                description: 'Record type',
              },
              rdata: { type: 'array', items: { type: 'string' }, description: 'Record data' },
              ttl: { type: 'number', description: 'Optional: TTL in seconds' },
            },
            required: ['zone', 'name', 'type', 'rdata'],
          },
        },

        // Certificates (2 tools)
        {
          name: 'create-dv-enrollment',
          description: 'Create a DV certificate enrollment',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              cn: { type: 'string', description: 'Common name' },
              sans: {
                type: 'array',
                items: { type: 'string' },
                description: 'Subject alternative names',
              },
              adminContact: { type: 'object', description: 'Admin contact information' },
              techContact: { type: 'object', description: 'Tech contact information' },
              org: { type: 'object', description: 'Organization information' },
              networkConfiguration: { type: 'object', description: 'Network configuration' },
            },
            required: ['cn', 'adminContact', 'techContact', 'org'],
          },
        },
        {
          name: 'check-dv-enrollment-status',
          description: 'Check DV certificate enrollment status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              enrollmentId: { type: 'number', description: 'Enrollment ID' },
            },
            required: ['enrollmentId'],
          },
        },

        // Fast Purge (1 tool)
        {
          name: 'purge-by-url',
          description: 'Purge content by URL',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              urls: { type: 'array', items: { type: 'string' }, description: 'URLs to purge' },
              network: {
                type: 'string',
                enum: ['staging', 'production'],
                description: 'Optional: Network (default: production)',
              },
            },
            required: ['urls'],
          },
        },

        // Reporting (2 tools)
        {
          name: 'get-traffic-report',
          description: 'Get traffic statistics for properties',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Property IDs',
              },
              startDate: { type: 'string', description: 'Start date (ISO 8601)' },
              endDate: { type: 'string', description: 'End date (ISO 8601)' },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: Metrics to include',
              },
            },
            required: ['propertyIds', 'startDate', 'endDate'],
          },
        },
        {
          name: 'get-activation-status',
          description: 'Get property activation status',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              propertyId: { type: 'string', description: 'Property ID' },
              activationId: { type: 'string', description: 'Activation ID' },
            },
            required: ['propertyId', 'activationId'],
          },
        },
      ];

      log('INFO', `✅ Returning ${tools.length} tools`);
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `🔧 Tool called: ${name}`, { args });

      const startTime = Date.now();
      const client = this.client;

      try {
        let result;

        switch (name) {
          // Property tools
          case 'list-properties': {
            const listPropsArgs = ListPropertiesSchema.parse(args);
            result = await listProperties(client, listPropsArgs);
            break;
          }

          case 'get-property': {
            const getPropArgs = GetPropertySchema.parse(args);
            result = await getProperty(client, { propertyId: getPropArgs.propertyId });
            break;
          }

          case 'create-property': {
            const createPropArgs = CreatePropertySchema.parse(args) as {
              customer?: string;
              propertyName: string;
              productId: string;
              contractId: string;
              groupId: string;
              ruleFormat?: string;
            };
            result = await createProperty(client, createPropArgs);
            break;
          }

          case 'activate-property':
            result = await activateProperty(client, args as any);
            break;

          case 'list-groups':
            result = await listGroups(client, args as any);
            break;

          // DNS tools
          case 'list-zones': {
            const listZonesArgs = ListZonesSchema.parse(args);
            result = await listZones(client, listZonesArgs);
            break;
          }

          case 'get-zone': {
            const getZoneArgs = GetZoneSchema.parse(args);
            result = await getZone(client, { zone: getZoneArgs.zone });
            break;
          }

          case 'create-zone':
            result = await createZone(client, args as any);
            break;

          case 'list-records':
            result = await listRecords(client, args as any);
            break;

          case 'upsert-record':
            result = await upsertRecord(client, args as any);
            break;

          // Certificate tools
          case 'create-dv-enrollment':
            result = await createDVEnrollment(client, args as any);
            break;

          case 'check-dv-enrollment-status':
            result = await checkDVEnrollmentStatus(client, args as any);
            break;

          // Fast Purge
          case 'purge-by-url': {
            const purgeByUrl = fastPurgeTools.find((t) => t.name === 'purge-by-url');
            if (purgeByUrl) {
              result = await purgeByUrl.handler(args);
            }
            break;
          }

          // Reporting
          case 'get-traffic-report': {
            const getTrafficReport = reportingTools.find((t) => t.name === 'get-traffic-report');
            if (getTrafficReport) {
              result = await getTrafficReport.handler(args);
            }
            break;
          }

          case 'get-activation-status':
            result = await getActivationStatus(client, args as any);
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
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

    log('INFO', '✅ Request handlers set up successfully');
  }

  async start() {
    log('INFO', '📍 Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (_error: Error) => {
      log('ERROR', '❌ Transport error', {
        message: error.message,
        stack: error.stack,
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
        toolCount: 15,
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
            : String(_error),
      });
      throw _error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '🎯 ALECS Essential Server main() started');

  try {
    const server = new EssentialALECSServer();
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
          : String(_error),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('ERROR', '❌ Uncaught exception', {
    error: {
      message: error.message,
      stack: error.stack,
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
log('INFO', '🚀 Initiating ALECS Essential Server...');
main();
