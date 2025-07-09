/**
 * DNS Domain Tools Export
 * 
 * This module exports all DNS-related tools for use with ALECSCore.
 * It consolidates DNS zone management, record operations, DNSSEC,
 * and migration functionality into a clean interface.
 */

import { consolidatedDNSTools } from './consolidated-dns-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * DNS tool definitions for ALECSCore registration
 */
export const dnsTools = {
  // Zone operations
  'dns_zones_list': {
    description: 'List all DNS zones',
    inputSchema: z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      contractIds: z.array(z.string()).optional(),
      types: z.array(z.string()).optional(),
      includeAliases: z.boolean().optional(),
      search: z.string().optional(),
      customer: z.string().optional(),
      format: z.enum(['json', 'text']).optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.listZones(args)
  },

  'dns_zone_get': {
    description: 'Get DNS zone details',
    inputSchema: z.object({
      zone: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.getZone(args)
  },

  'dns_zone_create': {
    description: 'Create a new DNS zone',
    inputSchema: z.object({
      zone: z.string(),
      type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
      contractId: z.string(),
      groupId: z.string().optional(),
      comment: z.string().optional(),
      signAndServe: z.boolean().optional(),
      masters: z.array(z.string()).optional(),
      tsigKey: z.object({
        name: z.string(),
        algorithm: z.string(),
        secret: z.string()
      }).optional(),
      target: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.createZone(args)
  },

  'dns_zone_activate': {
    description: 'Activate pending zone changes',
    inputSchema: z.object({
      zone: z.string(),
      comment: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.activateZone(args)
  },

  // Record operations
  'dns_records_list': {
    description: 'List DNS records in a zone',
    inputSchema: z.object({
      zone: z.string(),
      type: z.string().optional(),
      name: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional(),
      format: z.enum(['json', 'text']).optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.listRecords(args)
  },

  'dns_record_upsert': {
    description: 'Create or update a DNS record',
    inputSchema: z.object({
      zone: z.string(),
      name: z.string(),
      type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA']),
      ttl: z.number().optional(),
      rdata: z.array(z.string()),
      priority: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.upsertRecord(args)
  },

  'dns_record_delete': {
    description: 'Delete a DNS record',
    inputSchema: z.object({
      zone: z.string(),
      name: z.string(),
      type: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.deleteRecord(args)
  },

  'dns_records_bulk_import': {
    description: 'Bulk import DNS records',
    inputSchema: z.object({
      zone: z.string(),
      records: z.array(z.object({
        name: z.string(),
        type: z.string(),
        ttl: z.number().optional(),
        value: z.string(),
        priority: z.number().optional()
      })),
      replaceExisting: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.bulkImportRecords(args)
  },

  // Migration operations
  'dns_zone_import_axfr': {
    description: 'Import zone via AXFR transfer',
    inputSchema: z.object({
      zone: z.string(),
      masterServer: z.string(),
      contractId: z.string(),
      groupId: z.string().optional(),
      tsigKey: z.object({
        name: z.string(),
        algorithm: z.string(),
        secret: z.string()
      }).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.importZoneViaAxfr(args)
  },

  // DNSSEC operations
  'dns_dnssec_enable': {
    description: 'Enable DNSSEC for a zone',
    inputSchema: z.object({
      zone: z.string(),
      algorithm: z.string().optional(),
      nsec3: z.boolean().optional(),
      salt: z.string().optional(),
      iterations: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.enableDnssec(args)
  },

  'dns_dnssec_ds_records': {
    description: 'Get DS records for parent delegation',
    inputSchema: z.object({
      zone: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.getDsRecords(args)
  },

  'dns_zone_delete': {
    description: 'Delete a DNS zone',
    inputSchema: z.object({
      zone: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedDNSTools.deleteZone(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  listZones,
  getZone,
  createZone,
  deleteZone,
  activateZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  bulkImportRecords,
  importZoneViaAxfr,
  enableDnssec,
  getDsRecords
} = consolidatedDNSTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedDNSTools };

/**
 * DNS domain metadata for ALECSCore
 */
export const dnsDomainMetadata = {
  name: 'dns',
  description: 'Akamai Edge DNS - Authoritative DNS service',
  toolCount: Object.keys(dnsTools).length,
  consolidationStats: {
    originalFiles: 5,
    consolidatedFiles: 2,
    errorReduction: 26,
    codeReduction: '45%'
  }
};