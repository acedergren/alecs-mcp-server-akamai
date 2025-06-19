#!/usr/bin/env node

/**
 * ALECS DNS Server - DNS Management Module
 * Handles Edge DNS zones, records, and migrations
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

// DNS Tools

// DNS Advanced Tools
import {
  getZonesDNSSECStatus,
  getSecondaryZoneTransferStatus,
  getZoneContract,
  getRecordSet,
  updateTSIGKeyForZones,
  submitBulkZoneCreateRequest,
  getZoneVersion,
  getVersionRecordSets,
  reactivateZoneVersion,
  getVersionMasterZoneFile,
  createMultipleRecordSets,
} from '../tools/dns-advanced-tools';

// DNS Migration Tools
import {
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions,
} from '../tools/dns-migration-tools';
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
} from '../tools/dns-tools';

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [DNS] [${level}] ${message}`;
  if (data) {
    console.error(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.error(logMessage);
  }
};

class DNSALECSServer {
  private server: Server;
  private client: AkamaiClient;

  constructor() {
    log('INFO', '🌐 ALECS DNS Server starting...');
    log('INFO', 'Node version:', { version: process.version });
    log('INFO', 'Working directory:', { cwd: process.cwd() });

    this.server = new Server(
      {
        name: 'alecs-dns',
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
    } catch (error) {
      log('ERROR', '❌ Failed to initialize Akamai client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    log('INFO', 'Setting up request handlers...');

    // List all DNS tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '📋 Tools list requested');
      const tools = [
        // Zone Management
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
              includeAliases: { type: 'boolean', description: 'Optional: Include alias zones' },
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
              masters: {
                type: 'array',
                items: { type: 'string' },
                description: 'For SECONDARY zones: master server IPs',
              },
              tsigKey: { type: 'object', description: 'Optional: TSIG key for SECONDARY zones' },
              target: { type: 'string', description: 'For ALIAS zones: target zone' },
              signAndServe: { type: 'boolean', description: 'Optional: Enable DNSSEC' },
            },
            required: ['zone', 'type', 'contractId'],
          },
        },
        {
          name: 'get-zone-contract',
          description: 'Get zone contract details',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
            },
            required: ['zone'],
          },
        },
        {
          name: 'get-zones-dnssec-status',
          description: 'Get DNSSEC status for zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zones: { type: 'array', items: { type: 'string' } },
            },
            required: ['zones'],
          },
        },
        {
          name: 'convert-zone-to-primary',
          description: 'Convert a secondary zone to primary',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
            },
            required: ['zone'],
          },
        },
        {
          name: 'submit-bulk-zone-create-request',
          description: 'Create multiple zones in bulk',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    zone: { type: 'string' },
                    type: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
                    contractId: { type: 'string' },
                    groupId: { type: 'string' },
                  },
                },
              },
            },
            required: ['zones'],
          },
        },
        // Record Management
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
              sortBy: { type: 'string', description: 'Optional: Sort field' },
              page: { type: 'number', description: 'Optional: Page number' },
              pageSize: { type: 'number', description: 'Optional: Page size' },
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
                enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA'],
                description: 'Record type',
              },
              rdata: { type: 'array', items: { type: 'string' }, description: 'Record data' },
              ttl: { type: 'number', description: 'Optional: TTL in seconds' },
            },
            required: ['zone', 'name', 'type', 'rdata'],
          },
        },
        {
          name: 'delete-record',
          description: 'Delete a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              name: { type: 'string', description: 'Record name' },
              type: { type: 'string', description: 'Record type' },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        {
          name: 'get-record-set',
          description: 'Get specific record set details',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
            },
            required: ['zone', 'name', 'type'],
          },
        },
        {
          name: 'create-multiple-record-sets',
          description: 'Create multiple record sets at once',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              recordSets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    rdata: { type: 'array', items: { type: 'string' } },
                    ttl: { type: 'number' },
                  },
                },
              },
            },
            required: ['zone', 'recordSets'],
          },
        },
        {
          name: 'activate-zone-changes',
          description: 'Activate pending changes in a zone',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              comment: { type: 'string', description: 'Optional: Activation comment' },
            },
            required: ['zone'],
          },
        },
        // Zone Version Management
        {
          name: 'get-zone-version',
          description: 'Get zone version details',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['zone', 'version'],
          },
        },
        {
          name: 'get-version-record-sets',
          description: 'Get record sets for a specific zone version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['zone', 'version'],
          },
        },
        {
          name: 'reactivate-zone-version',
          description: 'Reactivate a previous zone version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['zone', 'version'],
          },
        },
        {
          name: 'get-version-master-zone-file',
          description: 'Get master zone file for a version',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zone: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['zone', 'version'],
          },
        },
        // Migration Tools
        {
          name: 'import-zone-via-axfr',
          description: 'Import DNS zone via AXFR transfer',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name to import' },
              masterServer: { type: 'string', description: 'Master server IP for AXFR' },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
                description: 'Optional: TSIG key for authenticated transfer',
              },
              contractId: { type: 'string', description: 'Contract ID for the new zone' },
              groupId: { type: 'string', description: 'Optional: Group ID' },
            },
            required: ['zone', 'masterServer', 'contractId'],
          },
        },
        {
          name: 'parse-zone-file',
          description: 'Parse a zone file and import records',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              zoneFileContent: { type: 'string', description: 'Zone file content in BIND format' },
              createZone: { type: 'boolean', description: "Create zone if it doesn't exist" },
              contractId: {
                type: 'string',
                description: 'Contract ID (required if createZone is true)',
              },
            },
            required: ['zone', 'zoneFileContent'],
          },
        },
        {
          name: 'bulk-import-records',
          description: 'Import multiple DNS records from structured data',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              zone: { type: 'string', description: 'Zone name' },
              records: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    value: { type: 'string' },
                    ttl: { type: 'number' },
                    priority: { type: 'number', description: 'For MX records' },
                  },
                  required: ['name', 'type', 'value'],
                },
                description: 'Records to import',
              },
              replaceExisting: { type: 'boolean', description: 'Replace existing records' },
            },
            required: ['zone', 'records'],
          },
        },
        {
          name: 'generate-migration-instructions',
          description: 'Generate step-by-step DNS migration instructions',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Optional: Customer section name' },
              sourceProvider: { type: 'string', description: 'Current DNS provider' },
              zones: { type: 'array', items: { type: 'string' }, description: 'Zones to migrate' },
              includeValidation: { type: 'boolean', description: 'Include validation steps' },
              includeTTLReduction: {
                type: 'boolean',
                description: 'Include TTL reduction guidance',
              },
            },
            required: ['sourceProvider', 'zones'],
          },
        },
        // Secondary Zone Management
        {
          name: 'get-secondary-zone-transfer-status',
          description: 'Get transfer status for secondary zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zones: { type: 'array', items: { type: 'string' } },
            },
            required: ['zones'],
          },
        },
        {
          name: 'update-tsig-key-for-zones',
          description: 'Update TSIG key for secondary zones',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string' },
              zones: { type: 'array', items: { type: 'string' } },
              tsigKey: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  algorithm: { type: 'string' },
                  secret: { type: 'string' },
                },
              },
            },
            required: ['zones', 'tsigKey'],
          },
        },
      ];

      log('INFO', `✅ Returning ${tools.length} tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;

      log('INFO', `🔧 Tool called: ${name}`, { args });

      const startTime = Date.now();
      const client = this.client;

      try {
        let result;

        switch (name) {
          // Zone Management
          case 'list-zones':
            result = await listZones(client, args as any);
            break;
          case 'get-zone':
            result = await getZone(client, args as any);
            break;
          case 'create-zone':
            result = await createZone(client, args as any);
            break;
          case 'get-zone-contract':
            result = await getZoneContract(client, args as any);
            break;
          case 'get-zones-dnssec-status':
            result = await getZonesDNSSECStatus(client, args as any);
            break;
          case 'convert-zone-to-primary':
            result = await convertZoneToPrimary(client, args as any);
            break;
          case 'submit-bulk-zone-create-request':
            result = await submitBulkZoneCreateRequest(client, args as any);
            break;

          // Record Management
          case 'list-records':
            result = await listRecords(client, args as any);
            break;
          case 'upsert-record':
            result = await upsertRecord(client, args as any);
            break;
          case 'delete-record':
            result = await deleteRecord(client, args as any);
            break;
          case 'get-record-set':
            result = await getRecordSet(client, args as any);
            break;
          case 'create-multiple-record-sets':
            result = await createMultipleRecordSets(client, args as any);
            break;
          case 'activate-zone-changes':
            result = await activateZoneChanges(client, args as any);
            break;

          // Zone Version Management
          case 'get-zone-version':
            result = await getZoneVersion(client, args as any);
            break;
          case 'get-version-record-sets':
            result = await getVersionRecordSets(client, args as any);
            break;
          case 'reactivate-zone-version':
            result = await reactivateZoneVersion(client, args as any);
            break;
          case 'get-version-master-zone-file':
            result = await getVersionMasterZoneFile(client, args as any);
            break;

          // Migration Tools
          case 'import-zone-via-axfr':
            result = await importZoneViaAXFR(client, args as any);
            break;
          case 'parse-zone-file':
            result = await parseZoneFile(client, args as any);
            break;
          case 'bulk-import-records':
            result = await bulkImportRecords(client, args as any);
            break;
          case 'generate-migration-instructions':
            result = await generateMigrationInstructions(client, args as any);
            break;

          // Secondary Zone Management
          case 'get-secondary-zone-transfer-status':
            result = await getSecondaryZoneTransferStatus(client, args as any);
            break;
          case 'update-tsig-key-for-zones':
            result = await updateTSIGKeyForZones(client, args as any);
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }

        const duration = Date.now() - startTime;
        log('INFO', `✅ Tool ${name} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        log('ERROR', `❌ Tool ${name} failed after ${duration}ms`, {
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
        });

        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          );
        }

        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    log('INFO', '✅ Request handlers set up successfully');
  }

  async start() {
    log('INFO', '📍 Starting server connection...');

    const transport = new StdioServerTransport();

    // Add error handling for transport
    transport.onerror = (error: Error) => {
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
        toolCount: 24,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      });
    } catch (error) {
      log('ERROR', '❌ Failed to connect server', {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      });
      throw error;
    }
  }
}

// Main entry point
async function main() {
  log('INFO', '🎯 ALECS DNS Server main() started');

  try {
    const server = new DNSALECSServer();
    await server.start();

    // Set up periodic status logging
    setInterval(() => {
      log('DEBUG', '💓 Server heartbeat', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      });
    }, 30000); // Every 30 seconds
  } catch (error) {
    log('ERROR', '❌ Failed to start server', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : String(error),
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
log('INFO', '🚀 Initiating ALECS DNS Server...');
main();
