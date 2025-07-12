/**
 * DNS Domain Tools
 * 
 * Complete implementation of Akamai Edge DNS API tools
 * Using the standard Tool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { z } from 'zod';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiOperation } from '../common/akamai-operation';
import { CustomerSchema } from '../common';
import { 
  DNSEndpoints, 
  DNSToolSchemas,
  formatZoneList,
  formatZoneDetails,
  formatRecordList,
  formatRecordCreated,
  formatBulkOperationResult
} from './api';
import { DNSChangelistService } from '../../services/dns-changelist-service';

/**
 * Advanced DNS Operations Schemas
 */
const DNSZoneSchema = CustomerSchema.extend({
  zone: z.string().describe('DNS zone name (e.g., example.com)')
});

const DNSSECConfigSchema = DNSZoneSchema.extend({
  algorithm: z.enum(['RSASHA1', 'RSASHA256', 'RSASHA512', 'ECDSAP256SHA256', 'ECDSAP384SHA384']).default('RSASHA256').describe('DNSSEC algorithm'),
  keySize: z.number().int().refine(val => [1024, 2048, 3072, 4096].includes(val)).default(2048).describe('Key size in bits'),
  keyRotationPolicy: z.object({
    kskRotationInterval: z.number().int().min(30).max(365).default(365).describe('KSK rotation interval in days'),
    zskRotationInterval: z.number().int().min(7).max(180).default(90).describe('ZSK rotation interval in days'),
    autoRotation: z.boolean().default(true).describe('Enable automatic key rotation')
  }).optional(),
  enabled: z.boolean().default(true)
});

const ZoneTransferConfigSchema = DNSZoneSchema.extend({
  transferType: z.enum(['AXFR', 'IXFR']).describe('Zone transfer type'),
  masterServers: z.array(z.object({
    address: z.string().ip().describe('Master server IP address'),
    port: z.number().int().min(1).max(65535).default(53).describe('DNS port'),
    tsigKey: z.object({
      name: z.string().describe('TSIG key name'),
      algorithm: z.enum(['hmac-md5', 'hmac-sha1', 'hmac-sha256', 'hmac-sha512']).default('hmac-sha256'),
      secret: z.string().describe('Base64 encoded TSIG secret')
    }).optional().describe('TSIG authentication for secure transfers')
  })).min(1).describe('Master servers for zone transfers'),
  enabled: z.boolean().default(true)
});

const BulkDNSOperationSchema = DNSZoneSchema.extend({
  operationType: z.enum(['create', 'update', 'delete']).describe('Bulk operation type'),
  records: z.array(z.object({
    name: z.string().describe('Record name'),
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS']),
    rdata: z.array(z.string()).min(1).describe('Record data'),
    ttl: z.number().int().min(30).max(86400).default(300),
    comment: z.string().optional()
  })).min(1).max(1000).describe('DNS records for bulk operation (max 1000)'),
  validationLevel: z.enum(['strict', 'permissive']).default('strict').describe('Validation level for records'),
  rollbackOnError: z.boolean().default(true).describe('Rollback all changes if any record fails')
});

/**
 * Create a DNSChangelistService instance for changelist operations
 */
function createDNSChangelistService(): DNSChangelistService {
  return new DNSChangelistService();
}

/**
 * Format changelist result for display
 */
function formatChangelistResult(result: any): string {
  let text = `✅ **DNS Operation Completed via Changelist!**\n\n`;
  text += `**Zone:** ${result.zone}\n`;
  text += `**Status:** ${result.status}\n`;
  text += `**Records Processed:** ${result.successfulRecords?.length || 0}\n`;
  
  if (result.requestId) {
    text += `**Request ID:** ${result.requestId}\n`;
  }
  
  if (result.message) {
    text += `**Message:** ${result.message}\n`;
  }
  
  text += `\n🎯 **Benefits of Changelist Workflow:**\n`;
  text += `- Atomic operation (all changes succeed or none apply)\n`;
  text += `- Automatic validation and safety checks\n`;
  text += `- Integrated submission and activation\n`;
  text += `- Status tracking and progress monitoring\n`;
  
  return text;
}

/**
 * List all DNS zones
 */
export async function listZones(args: z.infer<typeof DNSToolSchemas.listZones>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_zones_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.limit) {queryParams.limit = args.limit;}
      if (args.offset) {queryParams.offset = args.offset;}
      if (args.contractIds) {queryParams.contractIds = args.contractIds.join(',');}
      if (args.types) {queryParams.types = args.types.join(',');}
      if (args.includeAliases) {queryParams.includeAliases = args.includeAliases;}
      if (args.search) {queryParams.search = args.search;}
      
      return client.request({
        method: 'GET',
        path: DNSEndpoints.listZones(),
        queryParams
      });
    },
    {
      format: args.format || 'text',
      formatter: formatZoneList,
      cacheKey: (p) => `dns:zones:${p.contractIds?.join(',') || 'all'}:${p.search || ''}:${p.offset || 0}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get DNS zone details
 */
export async function getZone(args: z.infer<typeof DNSToolSchemas.getZone>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_zone_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: DNSEndpoints.getZone(args.zone)
      });
    },
    {
      format: 'text',
      formatter: formatZoneDetails,
      cacheKey: (p) => `dns:zone:${p.zone}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new DNS zone
 */
export async function createZone(args: z.infer<typeof DNSToolSchemas.createZone>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_zone_create',
    args,
    async (client) => {
      const body: any = {
        zone: args.zone,
        type: args.type.toUpperCase(),
        contractId: args.contractId
      };
      
      if (args.groupId) {body.groupId = args.groupId;}
      if (args.comment) {body.comment = args.comment;}
      
      // Secondary zone specific
      if (args.type === 'secondary' && args.masters) {
        body.masters = args.masters;
        if (args.tsigKey) {body.tsigKey = args.tsigKey;}
      }
      
      // Alias zone specific
      if (args.type === 'alias' && args.targetZone) {
        body.target = args.targetZone;
      }
      
      await client.request({
        method: 'POST',
        path: DNSEndpoints.createZone(),
        body
      });
      
      return { zone: args.zone, type: args.type };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `✅ **DNS Zone Created Successfully!**\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Type:** ${data.type}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Add DNS records: \`dns_record_create\`\n`;
        text += `2. Configure name servers at your registrar\n`;
        text += `3. Enable DNSSEC if required: \`dns_dnssec_enable\`\n`;
        
        return text;
      }
    }
  );
}

/**
 * List DNS records
 */
export async function listRecords(args: z.infer<typeof DNSToolSchemas.listRecords>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_records_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.name) {queryParams.name = args.name;}
      if (args.type) {queryParams.type = args.type;}
      if (args.search) {queryParams.search = args.search;}
      if (args.sortBy) {queryParams.sortBy = args.sortBy;}
      if (args.limit) {queryParams.limit = args.limit;}
      if (args.offset) {queryParams.offset = args.offset;}
      
      return client.request({
        method: 'GET',
        path: DNSEndpoints.getRecordSets(args.zone),
        queryParams
      });
    },
    {
      format: args.format || 'text',
      formatter: formatRecordList,
      cacheKey: (p) => `dns:records:${p.zone}:${p.type || 'all'}:${p.search || ''}:${p.offset || 0}`,
      cacheTtl: 60 // 1 minute - DNS records change frequently
    }
  );
}

/**
 * Create a DNS record
 * 
 * Can use either direct API calls or the changelist abstraction workflow.
 * When useChangelist=true, provides atomic operations with automatic validation,
 * submission, and activation.
 */
export async function createRecord(args: z.infer<typeof DNSToolSchemas.createRecord>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_create',
    args,
    async (client) => {
      // Use changelist abstraction if requested
      if (args.useChangelist) {
        const service = createDNSChangelistService();
        
        const config = {
          customer: args.customer,
          network: args.network || 'STAGING',
          description: `Create DNS record ${args.name} (${args.type}) via MCP tool`,
          autoActivate: args.autoActivate !== false
        };
        
        const result = await service.addRecord(args.zone, {
          name: args.name,
          type: args.type as any,
          rdata: args.rdata,
          ttl: args.ttl,
          comment: args.comment
        }, config);
        
        return result;
      }
      
      // Direct API approach (original behavior)
      const body = {
        name: args.name,
        type: args.type,
        ttl: args.ttl || 300,
        rdata: args.rdata
      };
      
      await client.request({
        method: 'POST',
        path: DNSEndpoints.createRecord(args.zone),
        body
      });
      
      return { ...args };
    },
    {
      format: 'text',
      formatter: (data) => {
        // Use changelist formatter if changelist was used
        if (args.useChangelist && 'changelistId' in data) {
          return formatChangelistResult(data);
        }
        // Otherwise use the standard formatter
        return formatRecordCreated(data);
      }
    }
  );
}

/**
 * Update a DNS record
 * 
 * Can use either direct API calls or the changelist abstraction workflow.
 * When useChangelist=true, provides atomic operations with automatic validation,
 * submission, and activation.
 */
export async function updateRecord(args: z.infer<typeof DNSToolSchemas.updateRecord>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_update',
    args,
    async (client) => {
      // Use changelist abstraction if requested
      if (args.useChangelist) {
        const service = createDNSChangelistService();
        
        const config = {
          customer: args.customer,
          network: args.network || 'STAGING',
          description: `Update DNS record ${args.name} (${args.type}) via MCP tool`,
          autoActivate: args.autoActivate !== false
        };
        
        const result = await service.updateRecord(args.zone, {
          name: args.name,
          type: args.type as any,
          rdata: args.rdata,
          ttl: args.ttl
        }, config);
        
        return result;
      }
      
      // Direct API approach (original behavior)
      const body = {
        ttl: args.ttl || 300,
        rdata: args.rdata
      };
      
      await client.request({
        method: 'PUT',
        path: DNSEndpoints.updateRecord(args.zone, args.name, args.type),
        body
      });
      
      return { ...args };
    },
    {
      format: 'text',
      formatter: (data) => {
        // Use changelist formatter if changelist was used
        if (args.useChangelist && 'changelistId' in data) {
          return formatChangelistResult(data);
        }
        
        // Otherwise use the standard formatter
        let text = `📝 **DNS Record Updated**\n\n`;
        text += `**Zone:** ${(data as any).zone}\n`;
        text += `**Record:** ${(data as any).name} (${(data as any).type})\n`;
        text += `**New Value:** ${(data as any).rdata?.join(', ')}\n`;
        if ((data as any).ttl) {text += `**TTL:** ${(data as any).ttl} seconds\n`;}
        text += `\n✅ Record updated successfully!`;
        
        return text;
      }
    }
  );
}

/**
 * Delete a DNS record
 * 
 * Can use either direct API calls or the changelist abstraction workflow.
 * When useChangelist=true, provides atomic operations with automatic validation,
 * submission, and activation.
 */
export async function deleteRecord(args: z.infer<typeof DNSToolSchemas.deleteRecord>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_delete',
    args,
    async (client) => {
      // Use changelist abstraction if requested
      if (args.useChangelist) {
        const service = createDNSChangelistService();
        
        const config = {
          customer: args.customer,
          network: args.network || 'STAGING',
          description: `Delete DNS record ${args.name} (${args.type}) via MCP tool`,
          autoActivate: args.autoActivate !== false
        };
        
        const result = await service.deleteRecord(args.zone, {
          name: args.name,
          type: args.type as any
        }, config);
        
        return result;
      }
      
      // Direct API approach (original behavior)
      await client.request({
        method: 'DELETE',
        path: DNSEndpoints.deleteRecord(args.zone, args.name, args.type)
      });
      
      return { ...args };
    },
    {
      format: 'text',
      formatter: (data) => {
        // Use changelist formatter if changelist was used
        if (args.useChangelist && 'changelistId' in data) {
          return formatChangelistResult(data);
        }
        
        // Otherwise use the standard formatter
        let text = `🗑️ **DNS Record Deleted**\n\n`;
        text += `**Zone:** ${(data as any).zone}\n`;
        text += `**Record:** ${(data as any).name} (${(data as any).type})\n`;
        text += `\n✅ Record deleted successfully!`;
        
        return text;
      }
    }
  );
}

/**
 * Bulk DNS record operations
 */
export async function bulkRecords(args: z.infer<typeof DNSToolSchemas.bulkRecords>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_records_bulk',
    args,
    async (client) => {
      const results = [];
      
      for (const op of args.operations) {
        try {
          if (op.action === 'create') {
            await client.request({
              method: 'POST',
              path: DNSEndpoints.createRecord(args.zone),
              body: op.record
            });
            results.push({ status: 'success', action: op.action, record: op.record });
          } else if (op.action === 'update' && op.record.rdata) {
            await client.request({
              method: 'PUT',
              path: DNSEndpoints.updateRecord(args.zone, op.record.name, op.record.type),
              body: {
                ttl: op.record.ttl || 300,
                rdata: op.record.rdata
              }
            });
            results.push({ status: 'success', action: op.action, record: op.record });
          } else if (op.action === 'delete') {
            await client.request({
              method: 'DELETE',
              path: DNSEndpoints.deleteRecord(args.zone, op.record.name, op.record.type)
            });
            results.push({ status: 'success', action: op.action, record: op.record });
          }
        } catch (error) {
          results.push({ 
            status: 'failed', 
            action: op.action, 
            record: op.record,
            error: error instanceof Error ? (error as any).message : 'Unknown error'
          });
        }
      }
      
      return { results };
    },
    {
      format: 'text',
      formatter: formatBulkOperationResult,
      progress: true,
      progressMessage: `Processing ${args.operations.length} DNS record operations...`
    }
  );
}

// Import all DNS operation functions from domain files
import { 
  addDNSRecord, 
  updateDNSRecord, 
  deleteDNSRecord, 
  batchUpdateDNS,
  DNSRecordAddSchema,
  DNSRecordUpdateSchema, 
  DNSRecordDeleteSchema,
  DNSBatchUpdateSchema
} from './dns-changelist';

import {
  getChangeListMetadata,
  getChangeList, 
  submitChangeList,
  discardChangeList,
  waitForZoneActivation,
  upsertRecord as upsertRecordLegacy,
  deleteRecord as deleteRecordLegacy,
  activateZoneChanges as activateZoneChangesLegacy,
  delegateSubzone
} from './dns-changelist-legacy';

/**
 * DNS Operations Registry
 * 
 * Comprehensive DNS management operations for the unified registry
 * Consolidates all DNS tools from across the domain files into a single export
 */
export const dnsOperations = {
  // Core zone operations from dns.ts
  dns_zones_list: {
    name: 'dns_zones_list',
    description: 'List all DNS zones with filtering and pagination support',
    inputSchema: DNSToolSchemas.listZones,
    handler: listZones
  },
  
  dns_zone_get: {
    name: 'dns_zone_get', 
    description: 'Get detailed information about a specific DNS zone',
    inputSchema: DNSToolSchemas.getZone,
    handler: getZone
  },
  
  dns_zone_create: {
    name: 'dns_zone_create',
    description: 'Create a new DNS zone with configuration options',
    inputSchema: DNSToolSchemas.createZone,
    handler: createZone
  },
  
  // Core record operations from dns.ts
  dns_records_list: {
    name: 'dns_records_list',
    description: 'List DNS records in a zone with filtering options',
    inputSchema: DNSToolSchemas.listRecords,
    handler: listRecords
  },
  
  dns_record_create: {
    name: 'dns_record_create',
    description: 'Create a new DNS record with optional changelist workflow',
    inputSchema: DNSToolSchemas.createRecord,
    handler: createRecord
  },
  
  dns_record_update: {
    name: 'dns_record_update',
    description: 'Update an existing DNS record',
    inputSchema: DNSToolSchemas.updateRecord,
    handler: updateRecord
  },
  
  dns_record_delete: {
    name: 'dns_record_delete',
    description: 'Delete a DNS record',
    inputSchema: DNSToolSchemas.deleteRecord,
    handler: deleteRecord
  },
  
  dns_records_bulk: {
    name: 'dns_records_bulk',
    description: 'Perform bulk operations on multiple DNS records',
    inputSchema: DNSToolSchemas.bulkRecords,
    handler: bulkRecords
  },
  
  // Changelist helper operations from dns-changelist.ts
  dns_record_add: {
    name: 'dns_record_add',
    description: 'Add DNS record with automatic changelist management',
    inputSchema: DNSRecordAddSchema,
    handler: addDNSRecord
  },
  
  dns_record_update_changelist: {
    name: 'dns_record_update_changelist',
    description: 'Update DNS record with automatic changelist management',
    inputSchema: DNSRecordUpdateSchema,
    handler: updateDNSRecord
  },
  
  dns_record_delete_changelist: {
    name: 'dns_record_delete_changelist',
    description: 'Delete DNS record with automatic changelist management',
    inputSchema: DNSRecordDeleteSchema,
    handler: deleteDNSRecord
  },
  
  dns_batch_update: {
    name: 'dns_batch_update',
    description: 'Execute multiple DNS operations in a single changelist',
    inputSchema: DNSBatchUpdateSchema,
    handler: batchUpdateDNS
  },
  
  // Legacy changelist operations from dns-changelist-legacy.ts
  dns_changelist_metadata: {
    name: 'dns_changelist_metadata',
    description: 'Get changelist metadata for a DNS zone',
    inputSchema: DNSToolSchemas.getChangeListMetadata,
    handler: getChangeListMetadata
  },
  
  dns_changelist_get: {
    name: 'dns_changelist_get',
    description: 'Get full changelist with all pending changes',
    inputSchema: DNSToolSchemas.getChangeList,
    handler: getChangeList
  },
  
  dns_changelist_submit: {
    name: 'dns_changelist_submit',
    description: 'Submit a changelist for activation',
    inputSchema: DNSToolSchemas.submitChangeList,
    handler: submitChangeList
  },
  
  dns_changelist_discard: {
    name: 'dns_changelist_discard',
    description: 'Discard an existing changelist',
    inputSchema: DNSToolSchemas.discardChangeList,
    handler: discardChangeList
  },
  
  dns_zone_activation_wait: {
    name: 'dns_zone_activation_wait',
    description: 'Wait for zone activation to complete with status monitoring',
    inputSchema: DNSToolSchemas.waitForZoneActivation,
    handler: waitForZoneActivation
  },
  
  dns_record_upsert: {
    name: 'dns_record_upsert',
    description: 'Create or update DNS record using changelist workflow',
    inputSchema: DNSToolSchemas.upsertRecord,
    handler: upsertRecordLegacy
  },
  
  dns_record_delete_legacy: {
    name: 'dns_record_delete_legacy',
    description: 'Delete DNS record using legacy changelist workflow',
    inputSchema: DNSToolSchemas.deleteRecordChangelist,
    handler: deleteRecordLegacy
  },
  
  dns_zone_activate_changes: {
    name: 'dns_zone_activate_changes',
    description: 'Activate zone changes with validation and monitoring',
    inputSchema: DNSToolSchemas.activateZoneChanges,
    handler: activateZoneChangesLegacy
  },
  
  dns_subzone_delegate: {
    name: 'dns_subzone_delegate',
    description: 'Delegate a subzone to external nameservers',
    inputSchema: DNSToolSchemas.delegateSubzone,
    handler: delegateSubzone
  }
};