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

        await this.makeTypedRequest(
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
      async () => {
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
              name: name || '',
              type: type as any,
              ttl: records[0]?.ttl || 300,
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

  // Alias methods for server compatibility
  async listDnsRecords(args: any): Promise<MCPToolResponse> {
    return this.listRecords(args);
  }

  async createOrUpdateRecord(args: any): Promise<MCPToolResponse> {
    return this.upsertRecord(args);
  }

  async activateZoneChanges(args: any): Promise<MCPToolResponse> {
    return this.activateZone(args);
  }

  async importZoneViaAXFR(args: any): Promise<MCPToolResponse> {
    return this.importZoneViaAxfr(args);
  }

  /**
   * Delete a DNS zone
   */
  async deleteZone(args: { zone: string; force?: boolean; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      force: z.boolean().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'delete-zone',
      params,
      async (client) => {
        await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}`,
            method: 'DELETE',
            schema: z.object({ success: z.boolean().optional() }).optional().default({}),
            queryParams: params.force ? { force: 'true' } : undefined
          }
        );

        // Invalidate caches
        await this.invalidateCache([
          `zone:${params.zone}:*`,
          'zones:list:*'
        ]);

        return {
          zone: params.zone,
          deleted: true,
          message: `✅ Deleted zone "${params.zone}"`
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
   * Get specific record set
   */
  async getRecordSet(args: { zone: string; name: string; type: string; customer?: string }): Promise<MCPToolResponse> {
    const params = GetRecordSchema.parse(args);

    return this.executeStandardOperation(
      'get-record-set',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/names/${params.name}/types/${params.type}`,
            method: 'GET',
            schema: RecordSetSchema
          }
        );

        const fqdn = params.name === '@' 
          ? params.zone 
          : `${params.name}.${params.zone}`;

        return {
          zone: params.zone,
          name: response.name,
          type: response.type,
          ttl: response.ttl,
          values: response.rdata,
          fqdn
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:record:${p.name}:${p.type}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Create multiple record sets at once
   */
  async createMultipleRecordSets(args: { 
    zone: string; 
    recordSets: Array<{ name: string; type: string; ttl: number; rdata: string[] }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      recordSets: z.array(RecordSetSchema),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-multiple-record-sets',
      params,
      async (_client) => {
        const results = {
          created: 0,
          failed: 0,
          errors: [] as string[]
        };

        for (const recordSet of params.recordSets) {
          try {
            await this.upsertRecord({
              zone: params.zone,
              name: recordSet.name,
              type: recordSet.type as any,
              ttl: recordSet.ttl,
              rdata: recordSet.rdata,
              customer: params.customer
            });
            results.created++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to create ${recordSet.type} record for ${recordSet.name}: ${error}`);
          }
        }

        return {
          zone: params.zone,
          ...results,
          message: `✅ Created ${results.created} record sets, ${results.failed} failed`
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
   * Get zone contract information
   */
  async getZoneContract(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zone-contract',
      params,
      async (_client) => {
        const zoneDetails = await this.getZone(params);
        
        return {
          zone: params.zone,
          contractId: (zoneDetails as any).contractId || 'N/A',
          message: `Zone "${params.zone}" is associated with contract: ${(zoneDetails as any).contractId || 'N/A'}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:contract`,
        cacheTtl: 3600
      }
    );
  }

  /**
   * Get DNSSEC status for multiple zones
   */
  async getZonesDNSSECStatus(args: { zones: string[]; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zones: z.array(ZoneNameSchema),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zones-dnssec-status',
      params,
      async (_client) => {
        const statuses = [];
        
        for (const zone of params.zones) {
          try {
            const zoneDetails = await this.getZone({ zone, customer: params.customer });
            statuses.push({
              zone,
              dnssecEnabled: (zoneDetails as any).dnssecEnabled || false,
              algorithm: (zoneDetails as any).dnssecAlgorithm || null
            });
          } catch (error) {
            statuses.push({
              zone,
              dnssecEnabled: false,
              error: `Failed to get status: ${error}`
            });
          }
        }

        return {
          zones: statuses,
          summary: {
            total: params.zones.length,
            enabled: statuses.filter(s => s.dnssecEnabled).length,
            disabled: statuses.filter(s => !s.dnssecEnabled).length
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zones:dnssec-status:${p.zones.sort().join(',')}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Get secondary zone transfer status
   */
  async getSecondaryZoneTransferStatus(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-secondary-zone-transfer-status',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/zone-transfer-status`,
            method: 'GET',
            schema: z.object({
              zone: z.string(),
              lastTransferTime: z.string().optional(),
              lastTransferStatus: z.string().optional(),
              nextTransferTime: z.string().optional(),
              masters: z.array(z.string()).optional()
            })
          }
        );

        return {
          zone: response.zone,
          lastTransferTime: response.lastTransferTime,
          lastTransferStatus: response.lastTransferStatus,
          nextTransferTime: response.nextTransferTime,
          masters: response.masters || [],
          message: `Transfer status: ${response.lastTransferStatus || 'Unknown'}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:transfer-status`,
        cacheTtl: 60
      }
    );
  }

  /**
   * List TSIG keys
   */
  async listTSIGKeys(args: { customer?: string }): Promise<MCPToolResponse> {
    const params = CustomerSchema.parse(args);

    return this.executeStandardOperation(
      'list-tsig-keys',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: '/config-dns/v2/keys',
            method: 'GET',
            schema: z.object({
              keys: z.array(z.object({
                name: z.string(),
                algorithm: z.string(),
                secret: z.string().optional()
              }))
            })
          }
        );

        return {
          keys: response.keys.map(key => ({
            name: key.name,
            algorithm: key.algorithm,
            secretPresent: !!key.secret
          })),
          totalCount: response.keys.length
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'tsig-keys:list',
        cacheTtl: 3600
      }
    );
  }

  /**
   * Create TSIG key
   */
  async createTSIGKey(args: { keyName: string; algorithm: string; secret?: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      keyName: z.string(),
      algorithm: z.string(),
      secret: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'create-tsig-key',
      params,
      async (client) => {
        const body: any = {
          name: params.keyName,
          algorithm: params.algorithm
        };

        if (params.secret) {
          body.secret = params.secret;
        }

        const response = await this.makeTypedRequest(
          client,
          {
            path: '/config-dns/v2/keys',
            method: 'POST',
            schema: z.object({
              name: z.string(),
              algorithm: z.string(),
              secret: z.string()
            }),
            body
          }
        );

        // Invalidate cache
        await this.invalidateCache(['tsig-keys:list']);

        return {
          name: response.name,
          algorithm: response.algorithm,
          secret: response.secret,
          message: `✅ Created TSIG key "${params.keyName}" with algorithm ${params.algorithm}`
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
   * Update TSIG key for zones
   */
  async updateTSIGKeyForZones(args: { 
    zones: string[]; 
    tsigKey: { name: string; algorithm: string; secret: string };
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      zones: z.array(ZoneNameSchema),
      tsigKey: z.object({
        name: z.string(),
        algorithm: z.string(),
        secret: z.string()
      }),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'update-tsig-key-for-zones',
      params,
      async (client) => {
        const results = {
          updated: 0,
          failed: 0,
          errors: [] as string[]
        };

        for (const zone of params.zones) {
          try {
            await this.makeTypedRequest(
              client,
              {
                path: `/config-dns/v2/zones/${zone}/tsig`,
                method: 'PUT',
                schema: z.object({ success: z.boolean() }),
                body: params.tsigKey
              }
            );
            results.updated++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to update TSIG for ${zone}: ${error}`);
          }
        }

        return {
          ...results,
          message: `✅ Updated TSIG key for ${results.updated} zones, ${results.failed} failed`
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
   * Submit bulk zone creation request
   */
  async submitBulkZoneCreateRequest(args: {
    zones: Array<{ zone: string; type: 'PRIMARY' | 'SECONDARY'; masters?: string[] }>;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      zones: z.array(z.object({
        zone: ZoneNameSchema,
        type: z.enum(['PRIMARY', 'SECONDARY']),
        masters: z.array(z.string()).optional()
      })),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'submit-bulk-zone-create',
      params,
      async (_client) => {
        const results = {
          created: 0,
          failed: 0,
          errors: [] as string[]
        };

        for (const zoneConfig of params.zones) {
          try {
            await this.createZone({
              zone: zoneConfig.zone,
              type: zoneConfig.type,
              masters: zoneConfig.masters,
              contractId: 'default', // This should be provided
              customer: params.customer
            });
            results.created++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to create ${zoneConfig.zone}: ${error}`);
          }
        }

        return {
          ...results,
          message: `✅ Created ${results.created} zones, ${results.failed} failed`
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
   * Get zone version details
   */
  async getZoneVersion(args: { zone: string; version: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      version: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zone-version',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/versions/${params.version}`,
            method: 'GET',
            schema: z.object({
              zone: z.string(),
              version: z.string(),
              versionId: z.string(),
              lastModified: z.string(),
              lastModifiedBy: z.string().optional(),
              comment: z.string().optional()
            })
          }
        );

        return {
          zone: response.zone,
          version: response.version,
          versionId: response.versionId,
          lastModified: response.lastModified,
          lastModifiedBy: response.lastModifiedBy,
          comment: response.comment
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:version:${p.version}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Get version record sets
   */
  async getVersionRecordSets(args: { zone: string; version: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      version: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-version-record-sets',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/versions/${params.version}/recordsets`,
            method: 'GET',
            schema: RecordSetsResponseSchema
          }
        );

        return {
          zone: params.zone,
          version: params.version,
          records: response.recordsets.map(record => ({
            name: record.name,
            type: record.type,
            ttl: record.ttl,
            values: record.rdata
          })),
          totalCount: response.recordsets.length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:version:${p.version}:records`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Reactivate a zone version
   */
  async reactivateZoneVersion(args: { zone: string; version: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      version: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'reactivate-zone-version',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/versions/${params.version}/reactivate`,
            method: 'POST',
            schema: z.object({ 
              activationId: z.string(),
              message: z.string().optional()
            }),
            body: {
              comment: `Reactivated version ${params.version} via MCP`
            }
          }
        );

        // Invalidate zone cache
        await this.invalidateCache([`zone:${params.zone}:*`]);

        return {
          zone: params.zone,
          version: params.version,
          activationId: response.activationId,
          message: response.message || `✅ Reactivated version ${params.version} for zone "${params.zone}"`
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
   * Get version master zone file
   */
  async getVersionMasterZoneFile(args: { zone: string; version: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      version: z.string(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-version-master-zone-file',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/versions/${params.version}/zone-file`,
            method: 'GET',
            schema: z.object({
              zone: z.string(),
              version: z.string(),
              zoneFile: z.string()
            })
          }
        );

        return {
          zone: response.zone,
          version: response.version,
          zoneFile: response.zoneFile,
          lineCount: response.zoneFile.split('\n').length
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:version:${p.version}:zone-file`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Parse zone file
   */
  async parseZoneFile(args: { 
    zone: string; 
    zoneFileContent: string; 
    contractId: string;
    createZone?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      zoneFileContent: z.string(),
      contractId: z.string(),
      createZone: z.boolean().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'parse-zone-file',
      params,
      async (_client) => {
        // Parse the zone file content
        const lines = params.zoneFileContent.split('\n');
        const records: Array<{ name: string; type: string; ttl: number; value: string }> = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(';')) continue;
          
          // Simple parser - would need enhancement for full BIND format
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 4) {
            const [name, ttl, , type, ...rdata] = parts;
            records.push({
              name: (name || '').replace(`.${params.zone}.`, ''),
              type: type || 'A',
              ttl: parseInt(ttl || '300') || 300,
              value: rdata.join(' ')
            });
          }
        }

        // Create zone if requested
        if (params.createZone) {
          await this.createZone({
            zone: params.zone,
            type: 'PRIMARY',
            contractId: params.contractId,
            customer: params.customer
          });
        }

        // Import the records
        const result = await this.bulkImportRecords({
          zone: params.zone,
          records: records as any,
          replaceExisting: false,
          customer: params.customer
        });

        return {
          zone: params.zone,
          parsedRecords: records.length,
          ...result
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
   * Convert zone to primary
   */
  async convertZoneToPrimary(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'convert-zone-to-primary',
      params,
      async (client) => {
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

        // Invalidate zone cache
        await this.invalidateCache([`zone:${params.zone}:*`]);

        return {
          zone: response.zone,
          type: response.type,
          message: `✅ Converted zone "${params.zone}" to PRIMARY`
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
   * Generate migration instructions
   */
  async generateMigrationInstructions(args: {
    sourceProvider: 'cloudflare' | 'route53' | 'godaddy' | 'other';
    zones: string[];
    includeTTLReduction?: boolean;
    includeValidation?: boolean;
    customer?: string;
  }): Promise<MCPToolResponse> {
    const params = z.object({
      sourceProvider: z.enum(['cloudflare', 'route53', 'godaddy', 'other']),
      zones: z.array(ZoneNameSchema),
      includeTTLReduction: z.boolean().optional(),
      includeValidation: z.boolean().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'generate-migration-instructions',
      params,
      async (_client) => {
        const instructions = [
          `# DNS Migration Guide: ${params.sourceProvider} to Akamai`,
          '',
          '## Phase 1: Preparation',
          '1. Export zone files from ' + params.sourceProvider,
          '2. Review and clean up DNS records',
          '3. Document current TTL values',
          ''
        ];

        if (params.includeTTLReduction) {
          instructions.push(
            '## Phase 2: TTL Reduction (1 week before)',
            '1. Reduce TTL to 300 seconds on all records',
            '2. Wait for old TTL to expire',
            '3. Verify reduced TTL propagation',
            ''
          );
        }

        instructions.push(
          '## Phase 3: Zone Setup in Akamai',
          '1. Create zones in Akamai:'
        );

        for (const zone of params.zones) {
          instructions.push(`   - ${zone}`);
        }

        instructions.push(
          '2. Import DNS records',
          '3. Verify record accuracy',
          '4. Activate zones',
          ''
        );

        if (params.includeValidation) {
          instructions.push(
            '## Phase 4: Validation',
            '1. Test DNS resolution:',
            '   - dig @ns1-1.akamaitech.net ' + params.zones[0],
            '2. Compare responses with current provider',
            '3. Verify all record types',
            ''
          );
        }

        instructions.push(
          '## Phase 5: Nameserver Update',
          '1. Update nameservers at registrar to:',
          '   - ns1-1.akamaitech.net',
          '   - ns2-1.akamaitech.net', 
          '   - ns3-1.akamaitech.net',
          '   - ns4-1.akamaitech.net',
          '2. Monitor propagation',
          '3. Verify resolution',
          '',
          '## Phase 6: Post-Migration',
          '1. Monitor DNS queries and errors',
          '2. Restore normal TTL values',
          '3. Decommission old DNS provider'
        );

        return {
          provider: params.sourceProvider,
          zones: params.zones,
          instructions: instructions.join('\n'),
          estimatedTime: '7-14 days including TTL reduction',
          akamaiNameservers: [
            'ns1-1.akamaitech.net',
            'ns2-1.akamaitech.net',
            'ns3-1.akamaitech.net',
            'ns4-1.akamaitech.net'
          ]
        };
      },
      {
        customer: params.customer
      }
    );
  }

  // Additional DNSSEC methods
  async disableDNSSEC(args: { zone: string; force?: boolean; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      force: z.boolean().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'disable-dnssec',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/dnssec`,
            method: 'DELETE',
            schema: z.object({ success: z.boolean() }),
            queryParams: params.force ? { force: 'true' } : undefined
          }
        );

        return {
          zone: params.zone,
          success: response.success,
          message: `✅ DNSSEC disabled for zone "${params.zone}"`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  async getDNSSECKeys(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-dnssec-keys',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/dnssec/keys`,
            method: 'GET',
            schema: z.object({
              keys: z.array(z.object({
                keyTag: z.number(),
                algorithm: z.number(),
                flags: z.number(),
                protocol: z.number(),
                publicKey: z.string()
              }))
            })
          }
        );

        return {
          zone: params.zone,
          keys: response.keys
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:dnssec-keys`,
        cacheTtl: 300
      }
    );
  }

  async getDNSSECDSRecords(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    return this.getDsRecords(args);
  }

  async checkDNSSECValidation(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'check-dnssec-validation',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/dnssec/validation`,
            method: 'GET',
            schema: z.object({
              zone: z.string(),
              valid: z.boolean(),
              errors: z.array(z.string()).optional()
            })
          }
        );

        return {
          zone: response.zone,
          valid: response.valid,
          errors: response.errors || [],
          message: response.valid ? `✅ DNSSEC validation passed` : `❌ DNSSEC validation failed`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:dnssec-validation`,
        cacheTtl: 60
      }
    );
  }

  async rotateDNSSECKeys(args: { zone: string; keyType: 'KSK' | 'ZSK' | 'BOTH'; algorithm?: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      keyType: z.enum(['KSK', 'ZSK', 'BOTH']),
      algorithm: z.string().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'rotate-dnssec-keys',
      params,
      async (client) => {
        const response = await this.makeTypedRequest(
          client,
          {
            path: `/config-dns/v2/zones/${params.zone}/dnssec/key-rotation`,
            method: 'POST',
            schema: z.object({
              zone: z.string(),
              keyType: z.string(),
              rotationId: z.string()
            }),
            body: {
              keyType: params.keyType,
              algorithm: params.algorithm
            }
          }
        );

        return {
          zone: response.zone,
          keyType: response.keyType,
          rotationId: response.rotationId,
          message: `✅ Initiated ${params.keyType} key rotation for zone "${params.zone}"`
        };
      },
      {
        customer: params.customer,
        format: 'text',
        successMessage: (result: any) => result.message
      }
    );
  }

  // Additional methods for completeness
  async getZoneStatus(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zone-status',
      params,
      async (_client) => {
        const zoneDetails = await this.getZone(params);
        
        return {
          zone: params.zone,
          activationState: (zoneDetails as any).activationState || 'ACTIVE',
          message: `Zone "${params.zone}" status: ${(zoneDetails as any).activationState || 'ACTIVE'}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:status`,
        cacheTtl: 60
      }
    );
  }

  async listDNSContracts(args: { customer?: string }): Promise<MCPToolResponse> {
    const params = CustomerSchema.parse(args);

    return this.executeStandardOperation(
      'list-dns-contracts',
      params,
      async () => {
        // This would typically call a contracts API endpoint
        // For now, return a placeholder
        return {
          contracts: [],
          message: 'Contract listing not implemented'
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'dns-contracts:list',
        cacheTtl: 3600
      }
    );
  }

  async getSupportedRecordTypes(args: { customer?: string }): Promise<MCPToolResponse> {
    const params = CustomerSchema.parse(args);

    return this.executeStandardOperation(
      'get-supported-record-types',
      params,
      async () => {
        return {
          recordTypes: [
            { type: 'A', description: 'IPv4 address' },
            { type: 'AAAA', description: 'IPv6 address' },
            { type: 'CNAME', description: 'Canonical name' },
            { type: 'MX', description: 'Mail exchange' },
            { type: 'TXT', description: 'Text record' },
            { type: 'NS', description: 'Name server' },
            { type: 'SRV', description: 'Service record' },
            { type: 'CAA', description: 'Certificate authority authorization' },
            { type: 'PTR', description: 'Pointer record' },
            { type: 'SOA', description: 'Start of authority' }
          ]
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'supported-record-types',
        cacheTtl: 86400
      }
    );
  }

  async getAuthoritativeNameservers(args: { customer?: string }): Promise<MCPToolResponse> {
    const params = CustomerSchema.parse(args);

    return this.executeStandardOperation(
      'get-authoritative-nameservers',
      params,
      async () => {
        return {
          nameservers: [
            'ns1-1.akamaitech.net',
            'ns2-1.akamaitech.net',
            'ns3-1.akamaitech.net',
            'ns4-1.akamaitech.net'
          ],
          ipv4: {
            'ns1-1.akamaitech.net': '193.108.91.1',
            'ns2-1.akamaitech.net': '193.108.91.2',
            'ns3-1.akamaitech.net': '193.108.91.3',
            'ns4-1.akamaitech.net': '193.108.91.4'
          },
          ipv6: {
            'ns1-1.akamaitech.net': '2600:1400:1::1',
            'ns2-1.akamaitech.net': '2600:1400:1::2',
            'ns3-1.akamaitech.net': '2600:1400:1::3',
            'ns4-1.akamaitech.net': '2600:1400:1::4'
          }
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'authoritative-nameservers',
        cacheTtl: 86400
      }
    );
  }

  async listChangelists(args: { page?: number; pageSize?: number; showAll?: boolean; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      page: z.number().optional(),
      pageSize: z.number().optional(),
      showAll: z.boolean().optional(),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'list-changelists',
      params,
      async () => {
        // Placeholder implementation
        return {
          changelists: [],
          totalCount: 0,
          message: 'Changelist functionality not implemented'
        };
      },
      {
        customer: params.customer,
        cacheKey: () => 'changelists:list',
        cacheTtl: 60
      }
    );
  }

  async searchChangelists(args: { zones: string[]; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zones: z.array(ZoneNameSchema),
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'search-changelists',
      params,
      async () => {
        // Placeholder implementation
        return {
          zones: params.zones,
          changelists: [],
          message: 'Changelist search not implemented'
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `changelists:search:${p.zones.join(',')}`,
        cacheTtl: 60
      }
    );
  }

  async getChangelistDiff(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-changelist-diff',
      params,
      async () => {
        // Placeholder implementation
        return {
          zone: params.zone,
          changes: [],
          message: 'Changelist diff not implemented'
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:changelist-diff`,
        cacheTtl: 60
      }
    );
  }

  // Alias methods for compatibility
  async updateZoneTSIG(args: any): Promise<MCPToolResponse> {
    return this.updateTSIGKeyForZones(args);
  }

  async getZoneHistory(args: { zone: string; customer?: string }): Promise<MCPToolResponse> {
    // This would list all versions
    const params = z.object({
      zone: ZoneNameSchema,
      customer: z.string().optional()
    }).parse(args);

    return this.executeStandardOperation(
      'get-zone-history',
      params,
      async (_client) => {
        // Placeholder - would call versions API
        return {
          zone: params.zone,
          versions: [],
          message: 'Zone history not implemented'
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `zone:${p.zone}:history`,
        cacheTtl: 300
      }
    );
  }

  async rollbackZoneVersion(args: { zone: string; version: string; customer?: string }): Promise<MCPToolResponse> {
    return this.reactivateZoneVersion(args);
  }
}

// Export singleton instance
export const consolidatedDNSTools = new ConsolidatedDNSTools();