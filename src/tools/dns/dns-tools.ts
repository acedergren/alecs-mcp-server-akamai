/**
 * DNS Domain Tools
 * 
 * Complete implementation of Akamai Edge DNS API tools
 * Using the standard BaseTool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import { type MCPToolResponse, BaseTool } from '../common';
import { 
  DNSEndpoints, 
  DNSToolSchemas,
  formatZoneList,
  formatZoneDetails,
  formatRecordList,
  formatRecordCreated,
  formatBulkOperationResult
} from './dns-api-implementation';
import type { z } from 'zod';

/**
 * List all DNS zones
 */
export async function listZones(args: z.infer<typeof DNSToolSchemas.listZones>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'dns',
    'dns_zones_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      if (args.contractIds) queryParams.contractIds = args.contractIds.join(',');
      if (args.types) queryParams.types = args.types.join(',');
      if (args.includeAliases) queryParams.includeAliases = args.includeAliases;
      if (args.search) queryParams.search = args.search;
      
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
  return BaseTool.execute(
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
  return BaseTool.execute(
    'dns',
    'dns_zone_create',
    args,
    async (client) => {
      const body: any = {
        zone: args.zone,
        type: args.type.toUpperCase(),
        contractId: args.contractId
      };
      
      if (args.groupId) body.groupId = args.groupId;
      if (args.comment) body.comment = args.comment;
      
      // Secondary zone specific
      if (args.type === 'secondary' && args.masters) {
        body.masters = args.masters;
        if (args.tsigKey) body.tsigKey = args.tsigKey;
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
  return BaseTool.execute(
    'dns',
    'dns_records_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.name) queryParams.name = args.name;
      if (args.type) queryParams.type = args.type;
      if (args.search) queryParams.search = args.search;
      if (args.sortBy) queryParams.sortBy = args.sortBy;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
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
 */
export async function createRecord(args: z.infer<typeof DNSToolSchemas.createRecord>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'dns',
    'dns_record_create',
    args,
    async (client) => {
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
      formatter: formatRecordCreated
    }
  );
}

/**
 * Update a DNS record
 */
export async function updateRecord(args: z.infer<typeof DNSToolSchemas.updateRecord>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'dns',
    'dns_record_update',
    args,
    async (client) => {
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
        let text = `📝 **DNS Record Updated**\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Record:** ${data.name} (${data.type})\n`;
        text += `**New Value:** ${data.rdata.join(', ')}\n`;
        if (data.ttl) text += `**TTL:** ${data.ttl} seconds\n`;
        text += `\n✅ Record updated successfully!`;
        
        return text;
      }
    }
  );
}

/**
 * Delete a DNS record
 */
export async function deleteRecord(args: z.infer<typeof DNSToolSchemas.deleteRecord>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'dns',
    'dns_record_delete',
    args,
    async (client) => {
      await client.request({
        method: 'DELETE',
        path: DNSEndpoints.deleteRecord(args.zone, args.name, args.type)
      });
      
      return { ...args };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `🗑️ **DNS Record Deleted**\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Record:** ${data.name} (${data.type})\n`;
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
  return BaseTool.execute(
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
            error: error instanceof Error ? error.message : 'Unknown error'
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