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
  BulkZoneCreateRequest,
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
    log('INFO', '[GLOBAL] ALECS DNS Server starting...');
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

    // List all DNS tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('INFO', '[EMOJI] Tools list requested');
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
          name: 'bulk-create-zones',
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
          name: 'generate-migration-guide',
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
          name: 'get-zone-transfer-status',
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
          // Zone Management
          case 'list-zones':
            result = await listZones(client, args as Parameters<typeof listZones>[1]);
            break;
          case 'get-zone':
            result = await getZone(client, args as Parameters<typeof getZone>[1]);
            break;
          case 'create-zone':
            result = await createZone(client, args as Parameters<typeof createZone>[1]);
            break;
          case 'get-zone-contract':
            result = await getZoneContract(client, args as Parameters<typeof getZoneContract>[1]);
            break;
          case 'get-zones-dnssec-status':
            result = await getZonesDNSSECStatus(client, args as Parameters<typeof getZonesDNSSECStatus>[1]);
            break;
          case 'convert-zone-to-primary':
            result = await convertZoneToPrimary(client, args as Parameters<typeof convertZoneToPrimary>[1]);
            break;
          case 'submit-bulk-zone-create-request': {
            // Validate args as BulkZoneCreateRequest interface
            const request = args as Record<string, unknown>;
            if (!request || typeof request !== 'object') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid request parameters');
            }
            if (!Array.isArray(request['zones']) || !request['contractId'] || !request['groupId']) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required fields: zones, contractId, groupId');
            }
            
            // Properly construct BulkZoneCreateRequest
            const bulkRequest: BulkZoneCreateRequest = {
              zones: request['zones'] as Array<{
                zone: string;
                type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
                comment?: string;
                masters?: string[];
                target?: string;
              }>,
              contractId: String(request['contractId']),
              groupId: String(request['groupId'])
            };
            
            result = await submitBulkZoneCreateRequest(client, bulkRequest);
            break;
          }

          // Record Management
          case 'list-records':
            result = await listRecords(client, args as Parameters<typeof listRecords>[1]);
            break;
          case 'upsert-record':
            result = await upsertRecord(client, args as Parameters<typeof upsertRecord>[1]);
            break;
          case 'delete-record':
            result = await deleteRecord(client, args as Parameters<typeof deleteRecord>[1]);
            break;
          case 'get-record-set':
            result = await getRecordSet(client, args as Parameters<typeof getRecordSet>[1]);
            break;
          case 'create-multiple-record-sets':
            result = await createMultipleRecordSets(client, args as Parameters<typeof createMultipleRecordSets>[1]);
            break;
          case 'activate-zone-changes':
            result = await activateZoneChanges(client, args as Parameters<typeof activateZoneChanges>[1]);
            break;

          // Zone Version Management
          case 'get-zone-version':
            result = await getZoneVersion(client, args as Parameters<typeof getZoneVersion>[1]);
            break;
          case 'get-version-record-sets':
            result = await getVersionRecordSets(client, args as Parameters<typeof getVersionRecordSets>[1]);
            break;
          case 'reactivate-zone-version':
            result = await reactivateZoneVersion(client, args as Parameters<typeof reactivateZoneVersion>[1]);
            break;
          case 'get-version-master-zone-file':
            result = await getVersionMasterZoneFile(client, args as Parameters<typeof getVersionMasterZoneFile>[1]);
            break;

          // Migration Tools
          case 'import-zone-via-axfr':
            result = await importZoneViaAXFR(client, args as Parameters<typeof importZoneViaAXFR>[1]);
            break;
          case 'parse-zone-file':
            result = await parseZoneFile(client, args as Parameters<typeof parseZoneFile>[1]);
            break;
          case 'bulk-import-records':
            result = await bulkImportRecords(client, args as Parameters<typeof bulkImportRecords>[1]);
            break;
          case 'generate-migration-instructions':
            result = await generateMigrationInstructions(client, args as Parameters<typeof generateMigrationInstructions>[1]);
            break;

          // Secondary Zone Management
          case 'get-secondary-zone-transfer-status':
            result = await getSecondaryZoneTransferStatus(client, args as Parameters<typeof getSecondaryZoneTransferStatus>[1]);
            break;
          case 'update-tsig-key-for-zones':
            result = await updateTSIGKeyForZones(client, args as Parameters<typeof updateTSIGKeyForZones>[1]);
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
        toolCount: 24,
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
  log('INFO', '[TARGET] ALECS DNS Server main() started');

  try {
    const server = new DNSALECSServer();
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
log('INFO', '[DEPLOY] Initiating ALECS DNS Server...');
main();
