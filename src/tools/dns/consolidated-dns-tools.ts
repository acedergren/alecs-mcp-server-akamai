/**
 * Consolidated DNS Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates all DNS tool files into a single module
 * - Provides type-safe Edge DNS API interactions
 * - Implements consistent error handling and caching
 * - Reduces code duplication and TypeScript errors
 * 
 * This module combines DNS zone management, record operations,
 * DNSSEC functionality, and migration tools.
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  ListRequestSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * DNS-specific schemas
 */
const ZoneNameSchema = z.string()
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i)
  .describe('Valid DNS zone name');

const RecordTypeSchema = z.enum([
  'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA'
]);

const ZoneTypeSchema = z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']);

const CreateZoneSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  type: ZoneTypeSchema,
  contractId: z.string(),
  groupId: z.string().optional(),
  comment: z.string().optional(),
  signAndServe: z.boolean().optional().describe('Enable DNSSEC'),
  masters: z.array(z.string()).optional().describe('Master servers for SECONDARY zones'),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string()
  }).optional(),
  target: z.string().optional().describe('Target zone for ALIAS zones')
});

const CreateRecordSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  name: z.string().describe('Record name (e.g., www, @)'),
  type: RecordTypeSchema,
  ttl: z.number().int().min(30).max(86400).default(300),
  rdata: z.array(z.string()).describe('Record data values'),
  priority: z.number().int().min(0).max(65535).optional().describe('For MX records')
});

const GetRecordSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  name: z.string(),
  type: RecordTypeSchema
});

const ListRecordsSchema = CustomerSchema.merge(ListRequestSchema).extend({
  zone: ZoneNameSchema,
  type: RecordTypeSchema.optional(),
  name: z.string().optional()
});

const ActivateZoneSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  comment: z.string().optional()
});

const ImportZoneSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  masterServer: z.string().describe('Master server IP for AXFR'),
  contractId: z.string(),
  groupId: z.string().optional(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string()
  }).optional()
});

const BulkImportRecordsSchema = CustomerSchema.extend({
  zone: ZoneNameSchema,
  records: z.array(z.object({
    name: z.string(),
    type: RecordTypeSchema,
    ttl: z.number().optional(),
    value: z.string(),
    priority: z.number().optional()
  })),
  replaceExisting: z.boolean().optional().default(false)
});

/**
 * DNS response schemas
 */
const ZoneSchema = z.object({
  zone: z.string(),
  type: z.string(),
  comment: z.string().optional(),
  signAndServeAlgorithm: z.string().optional(),
  signAndServe: z.boolean().optional(),
  contractId: z.string().optional(),
  activationState: z.string().optional()
});

const ZoneListResponseSchema = z.object({
  zones: z.array(ZoneSchema)
});

const RecordSetSchema = z.object({
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string())
});

const RecordSetsResponseSchema = z.object({
  recordsets: z.array(RecordSetSchema)
});

/**
 * Consolidated DNS tools implementation
 */
export class ConsolidatedDNSTools extends BaseTool {
  protected readonly domain = 'dns';

  /**
   * List all DNS zones
   */
  async listZones(args: z.infer<typeof ListRequestSchema> & {
    contractIds?: string[];
    types?: string[];
    includeAliases?: boolean;
    search?: string;
  }): Promise<MCPToolResponse> {
    const params = ListRequestSchema.parse(args);

    return this.executeStandardOperation(
      'list-zones',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/config-dns/v2/zones',
            method: 'GET',
            schema: ZoneListResponseSchema,
            queryParams: {
              ...(args.contractIds && { contractIds: args.contractIds.join(',') }),
              ...(args.types && { types: args.types.join(',') }),
              ...(args.search && { search: args.search }),
              ...(params.limit && { limit: params.limit.toString() }),
              ...(params.offset && { offset: params.offset.toString() })
            }
          }
        );

        const zones = response.zones.filter(zone => 
          args.includeAliases || zone.type !== 'ALIAS'
        );

        return {
          zones: zones.map(zone => ({
            zone: zone.zone,
            type: zone.type,
            comment: zone.comment,
            dnssecEnabled: zone.signAndServe,
            contractId: zone.contractId,
            activationState: zone.activationState
          })),
          totalCount: zones.length
        };
      },
      {
        customer: params.customer,
        format: params.format,
        cacheKey: (p) => `zones:list:${args.search || 'all'}:${p.limit}:${p.offset}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Get zone details
   */
  async getZone(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zone',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}`,
            method: 'GET',
            schema: ZoneSchema
          }
        );

        return {
          zone: response.zone,
          type: response.type,
          comment: response.comment,
          dnssecEnabled: response.signAndServe,
          dnssecAlgorithm: response.signAndServeAlgorithm,
          contractId: response.contractId,
          activationState: response.activationState
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}`,
        cacheTtl: 600 // 10 minutes
      }
    );
  }

  /**
   * Create a new DNS zone
   */
  async createZone(args: z.infer<typeof CreateZoneSchema>): Promise<MCPToolResponse> {
    const params = CreateZoneSchema.parse(args);

    return this.executeStandardOperation(
      'create-zone',
      params,
      async (client) => {
        const body: any = {
          zone: params.zone,
          type: params.type,
          comment: params.comment
        };

        // Add type-specific fields
        if (params.type === 'SECONDARY') {
          body.masters = params.masters;
          if (params.tsigKey) {
            body.tsigKey = params.tsigKey;
          }
        } else if (params.type === 'ALIAS') {
          body.target = params.target;
        } else if (params.type === 'PRIMARY' && params.signAndServe) {
          body.signAndServe = true;
        }

        const response = await this.makeTypedRequest(
          client,
          {
            path: '/config-dns/v2/zones',
            method: 'POST',
            schema: z.object({ zone: z.string() }),
            body,
            queryParams: {
              contractId: params.contractId,
              ...(params.groupId && { gid: params.groupId })
            }
          }
        );

        // Invalidate zone list cache
        await this.invalidateCache(['zones:list:*']);

        return {
          zone: response.zone,
          type: params.type,
          message: `✅ Created ${params.type} zone "${params.zone}"`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * List DNS records in a zone
   */
  async listRecords(args: z.infer<typeof ListRecordsSchema>): Promise<MCPToolResponse> {
    const params = ListRecordsSchema.parse(args);

    return this.executeStandardOperation(
      'list-records',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/recordsets`,
            method: 'GET',
            schema: RecordSetsResponseSchema,
            queryParams: {
              ...(params.type && { types: params.type }),
              ...(params.name && { search: params.name }),
              ...(params.limit && { pageSize: params.limit.toString() }),
              ...(params.offset && { page: Math.floor(params.offset / (params.limit || 20)).toString() })
            }
          }
        );

        return {
          zone: params.zone,
          records: response.recordsets.map(record => ({
            name: record.name,
            type: record.type,
            ttl: record.ttl,
            values: record.rdata,
            fqdn: `${record.name === '@' ? '' : record.name + '.'}${params.zone}`
          })),
          totalCount: response.recordsets.length
        };
      },
      {
        customer: params.customer,
        format: params.format,
        cacheKey: (p) => `zone:${p.zone}:records:${p.type || 'all'}:${p.name || 'all'}`,
        cacheTtl: 300 // 5 minutes
      }
    );
  }

  /**
   * Create or update a DNS record
   */
  async upsertRecord(args: z.infer<typeof CreateRecordSchema>): Promise<MCPToolResponse> {
    const params = CreateRecordSchema.parse(args);

    return this.executeStandardOperation(
      'upsert-record',
      params,
      async (client) => {
        // For MX records, prepend priority to rdata
        const rdata = params.type === 'MX' && params.priority !== undefined
          ? params.rdata.map(value => `${params.priority} ${value}`)
          : params.rdata;

        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/names/${params.name}/types/${params.type}`,
            method: 'PUT',
            schema: z.object({ name: z.string(), type: z.string() }),
            body: {
              name: params.name,
              type: params.type,
              ttl: params.ttl,
              rdata
            }
          }
        );

        // Invalidate record cache
        await this.invalidateCache([
          `zone:${params.zone}:records:*`,
          `zone:${params.zone}:record:${params.name}:${params.type}`
        ]);

        const fqdn = params.name === '@' 
          ? params.zone 
          : `${params.name}.${params.zone}`;

        return {
          zone: params.zone,
          name: params.name,
          type: params.type,
          ttl: params.ttl,
          values: params.rdata,
          fqdn,
          message: `✅ Created/updated ${params.type} record "${fqdn}" with values: ${params.rdata.join(', ')}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Delete a DNS record
   */
  async deleteRecord(args: z.infer<typeof GetRecordSchema>): Promise<MCPToolResponse> {
    const params = GetRecordSchema.parse(args);

    return this.executeStandardOperation(
      'delete-record',
      params,
      async (client) => {
        await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/names/${params.name}/types/${params.type}`,
            method: 'DELETE',
            schema: z.object({ success: z.boolean().optional() }).optional().default({})
          }
        );

        // Invalidate caches
        await this.invalidateCache([
          `zone:${params.zone}:records:*`,
          `zone:${params.zone}:record:${params.name}:${params.type}`
        ]);

        const fqdn = params.name === '@' 
          ? params.zone 
          : `${params.name}.${params.zone}`;

        return {
          zone: params.zone,
          name: params.name,
          type: params.type,
          deleted: true,
          message: `✅ Deleted ${params.type} record "${fqdn}"`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Activate pending zone changes
   */
  async activateZone(args: z.infer<typeof ActivateZoneSchema>): Promise<MCPToolResponse> {
    const params = ActivateZoneSchema.parse(args);

    return this.executeStandardOperation(
      'activate-zone',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}`,
            method: 'POST',
            schema: z.object({ 
              activationId: z.string().optional(),
              message: z.string().optional() 
            }),
            queryParams: {
              command: 'activate'
            },
            body: {
              comment: params.comment || `Activated via MCP on ${new Date().toISOString()}`
            }
          }
        );

        // Invalidate zone cache
        await this.invalidateCache([`zone:${params.zone}:*`]);

        return {
          zone: params.zone,
          activationId: response.activationId,
          message: response.message || `✅ Zone "${params.zone}" activation submitted successfully`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Import zone via AXFR transfer
   */
  async importZoneViaAxfr(args: z.infer<typeof ImportZoneSchema>): Promise<MCPToolResponse> {
    const params = ImportZoneSchema.parse(args);

    return this.executeStandardOperation(
      'import-zone-axfr',
      params,
      async (client) => {
        // First create the zone as SECONDARY
        await this.createZone({
          zone: params.zone,
          type: 'SECONDARY',
          contractId: params.contractId,
          groupId: params.groupId,
          masters: [params.masterServer],
          tsigKey: params.tsigKey,
          customer: params.customer
        });

        // Wait for initial transfer
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Convert to PRIMARY zone
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}`,
            method: 'PUT',
            schema: z.object({ 
              zone: z.string(),
              type: z.string() 
            }),
            body: {
              zone: params.zone,
              type: 'PRIMARY'
            }
          }
        );

        // Invalidate caches
        await this.invalidateCache([
          `zone:${params.zone}:*`,
          'zones:list:*'
        ]);

        return {
          zone: response.zone,
          type: response.type,
          message: `✅ Successfully imported zone "${params.zone}" via AXFR from ${params.masterServer}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Bulk import DNS records
   */
  async bulkImportRecords(args: z.infer<typeof BulkImportRecordsSchema>): Promise<MCPToolResponse> {
    const params = BulkImportRecordsSchema.parse(args);

    return this.executeStandardOperation(
      'bulk-import-records',
      params,
      async (client) => {
        // Group records by name and type
        const recordGroups = new Map<string, typeof params.records>();
        
        for (const record of params.records) {
          const key = `${record.name}:${record.type}`;
          if (!recordGroups.has(key)) {
            recordGroups.set(key, []);
          }
          recordGroups.get(key)!.push(record);
        }

        const results = {
          created: 0,
          updated: 0,
          failed: 0,
          errors: [] as string[]
        };

        // Process each record group
        for (const [key, records] of recordGroups) {
          const [name, type] = key.split(':');
          
          try {
            // Combine values for records with same name/type
            const values = records.map(r => {
              if (type === 'MX' && r.priority !== undefined) {
                return `${r.priority} ${r.value}`;
              }
              return r.value;
            });

            await this.upsertRecord({
              zone: params.zone,
              name,
              type: type as any,
              ttl: records[0].ttl || 300,
              rdata: values,
              customer: params.customer
            });

            if (params.replaceExisting) {
              results.updated++;
            } else {
              results.created++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to import ${type} record for ${name}: ${error}`);
          }
        }

        return {
          zone: params.zone,
          ...results,
          message: `✅ Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.failed} failed`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Enable DNSSEC for a zone
   */
  async enableDnssec(args: {
    zone: string;
    algorithm?: string;
    nsec3?: boolean;
    salt?: string;
    iterations?: number;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      algorithm: z.string().optional().default('RSA-SHA256'),
      nsec3: z.boolean().optional().default(true),
      salt: z.string().optional(),
      iterations: z.number().optional().default(1),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'enable-dnssec',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/dnssec`,
            method: 'PUT',
            schema: z.object({
              zone: z.string(),
              signAndServe: z.boolean(),
              signAndServeAlgorithm: z.string()
            }),
            body: {
              signAndServe: true,
              signAndServeAlgorithm: params.algorithm,
              nsec3: params.nsec3,
              nsec3Salt: params.salt,
              nsec3Iterations: params.iterations
            }
          }
        );

        // Invalidate zone cache
        await this.invalidateCache([`zone:${params.zone}:*`]);

        return {
          zone: response.zone,
          dnssecEnabled: response.signAndServe,
          algorithm: response.signAndServeAlgorithm,
          message: `✅ DNSSEC enabled for zone "${params.zone}" with algorithm ${params.algorithm}`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  /**
   * Get DS records for parent zone delegation
   */
  async getDsRecords(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-ds-records',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/ds-records`,
            method: 'GET',
            schema: z.object({
              zone: z.string(),
              dsRecords: z.array(z.object({
                keyTag: z.number(),
                algorithm: z.number(),
                digestType: z.number(),
                digest: z.string()
              }))
            })
          }
        );

        return {
          zone: response.zone,
          dsRecords: response.dsRecords.map(ds => ({
            keyTag: ds.keyTag,
            algorithm: ds.algorithm,
            digestType: ds.digestType,
            digest: ds.digest,
            record: `${params.zone}. IN DS ${ds.keyTag} ${ds.algorithm} ${ds.digestType} ${ds.digest}`
          })),
          instructions: `Add these DS records to the parent zone to complete DNSSEC chain of trust`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:ds-records`,
        cacheTtl: 3600 // 1 hour - DS records don't change often
      }
    );
  }
}

// Export singleton instance
export const consolidatedDNSTools = new ConsolidatedDNSTools();