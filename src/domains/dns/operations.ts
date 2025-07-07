/**
 * DNS Domain Operations - Consolidated Implementation
 * 
 * CODE KAI: Single implementation for all DNS operations
 * Eliminates duplication while maintaining full functionality
 */

import type { AkamaiClient } from '../../akamai-client';
import { 
  performanceOptimized, 
  PerformanceProfiles,
  CacheInvalidation 
} from '../../core/performance';
import { validateCustomer } from '../../core/validation/customer';
import { handleApiError } from '../../core/errors';
import { normalizeId } from '../../core/validation/akamai-ids';

import {
  // Types
  Zone,
  ZoneType,
  RecordSet,
  RecordType,
  DNSError,
  EdgeDNSZonesResponse,
  EdgeDNSZoneResponse,
  EdgeDNSRecordSetsResponse,
  EdgeDNSChangeListResponse,
  EdgeDNSZoneSubmitResponse,
  EdgeDNSZoneActivationStatusResponse,
  EdgeDNSValidationError,
  DNSSECConfig,
  DNSSECKey,
  DSRecord,
  DNSSECStatus,
  ZoneFileRecord,
  MigrationPlan,
  MigrationResult,
  TSIGKey,
  // Parameter types
  ListZonesParams,
  GetZoneParams,
  CreateZoneParams,
  ListRecordsParams,
  CreateRecordParams,
  UpdateRecordParams,
  DeleteRecordParams,
  ActivateZoneParams,
} from './types';

import {
  // Schemas
  ListZonesSchema,
  GetZoneSchema,
  CreateZoneSchema,
  DeleteZoneSchema,
  ListRecordsSchema,
  CreateRecordSchema,
  UpdateRecordSchema,
  DeleteRecordSchema,
  ActivateZoneSchema,
  EnableDNSSECSchema,
  DisableDNSSECSchema,
  RotateDNSSECKeysSchema,
  ImportViaAXFRSchema,
  ParseZoneFileSchema,
  BulkImportRecordsSchema,
  // Validators
  validateZoneName,
  validateRecordName,
  validateTTL,
} from './schemas';

/**
 * Zone Operations
 */

/**
 * List DNS zones with filtering and caching
 */
export const listZones = performanceOptimized(
  async (
    client: AkamaiClient,
    params: ListZonesParams = {}
  ): Promise<EdgeDNSZonesResponse> => {
    // Validate parameters
    const validated = ListZonesSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      
      if (validated.contractIds?.length) {
        queryParams.contractIds = validated.contractIds.join(',');
      }
      if (validated.types?.length) {
        queryParams.types = validated.types.join(',');
      }
      if (validated.search) {
        queryParams.search = validated.search;
      }
      if (validated.showAll) {
        queryParams.showAll = 'true';
      }
      
      const response = await client.request({
        path: '/config-dns/v2/zones',
        method: 'GET',
        queryParams,
      }) as EdgeDNSZonesResponse;
      
      return response;
    } catch (error) {
      handleApiError(error, 'listZones');
    }
  },
  'dns.zones.list',
  PerformanceProfiles.LIST
);

/**
 * Get zone details with caching
 */
export const getZone = performanceOptimized(
  async (
    client: AkamaiClient,
    params: GetZoneParams
  ): Promise<Zone> => {
    // Validate parameters
    const validated = GetZoneSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}`,
        method: 'GET',
      }) as EdgeDNSZoneResponse;
      
      if (!response.zone) {
        throw DNSError.zoneNotFound(validated.zone);
      }
      
      return response.zone as Zone;
    } catch (error) {
      handleApiError(error, 'getZone');
    }
  },
  'dns.zone.get',
  PerformanceProfiles.READ
);

/**
 * Create a new DNS zone
 */
export const createZone = performanceOptimized(
  async (
    client: AkamaiClient,
    params: CreateZoneParams
  ): Promise<EdgeDNSZoneResponse> => {
    // Validate parameters
    const validated = CreateZoneSchema.parse(params);
    validateCustomer(validated.customer);
    
    // Normalize contract ID
    const contractId = normalizeId.contract(validated.contractId);
    
    try {
      // Build request body based on zone type
      const body: any = {
        zone: validated.zone,
        type: validated.type,
        contractId,
        comment: validated.comment || `Created via ALECS MCP - ${new Date().toISOString()}`,
      };
      
      if (validated.groupId) {
        body.groupId = validated.groupId;
      }
      
      // Type-specific configuration
      switch (validated.type) {
        case ZoneType.PRIMARY:
          if (validated.signAndServe) {
            body.signAndServe = true;
            body.signAndServeAlgorithm = validated.signAndServeAlgorithm || 'RSASHA256';
          }
          break;
          
        case ZoneType.SECONDARY:
          body.masters = validated.masters;
          if (validated.tsigKey) {
            body.tsigKey = validated.tsigKey;
          }
          break;
          
        case ZoneType.ALIAS:
          body.target = validated.target;
          break;
      }
      
      const response = await client.request({
        path: '/config-dns/v2/zones',
        method: 'POST',
        body,
      }) as EdgeDNSZoneResponse;
      
      // Invalidate zones list cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.zones.list:*`);
      
      return response;
    } catch (error) {
      handleApiError(error, 'createZone');
    }
  },
  'dns.zone.create',
  PerformanceProfiles.WRITE
);

/**
 * Delete a DNS zone
 */
export const deleteZone = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { zone: string; force?: boolean; customer?: string }
  ): Promise<void> => {
    // Validate parameters
    const validated = DeleteZoneSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      if (validated.force) {
        queryParams.force = 'true';
      }
      
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}`,
        method: 'DELETE',
        queryParams,
      });
      
      // Invalidate all caches for this zone
      await CacheInvalidation.invalidate(`*:*${validated.zone}*`);
    } catch (error) {
      handleApiError(error, 'deleteZone');
    }
  },
  'dns.zone.delete',
  PerformanceProfiles.WRITE
);

/**
 * Record Operations
 */

/**
 * List DNS records in a zone
 */
export const listRecords = performanceOptimized(
  async (
    client: AkamaiClient,
    params: ListRecordsParams
  ): Promise<EdgeDNSRecordSetsResponse> => {
    // Validate parameters
    const validated = ListRecordsSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      
      if (validated.type) {
        queryParams.types = validated.type;
      }
      if (validated.search) {
        queryParams.search = validated.search;
      }
      if (validated.page) {
        queryParams.page = validated.page.toString();
      }
      if (validated.pageSize) {
        queryParams.pageSize = validated.pageSize.toString();
      }
      
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/recordsets`,
        method: 'GET',
        queryParams,
      }) as EdgeDNSRecordSetsResponse;
      
      return response;
    } catch (error) {
      handleApiError(error, 'listRecords');
    }
  },
  'dns.records.list',
  PerformanceProfiles.LIST
);

/**
 * Create or update a DNS record
 */
export const upsertRecord = performanceOptimized(
  async (
    client: AkamaiClient,
    params: CreateRecordParams | UpdateRecordParams
  ): Promise<EdgeDNSZoneSubmitResponse> => {
    // Validate parameters
    const validated = CreateRecordSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // Step 1: Create changelist
      const changelistResponse = await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        queryParams: { zone: validated.zone },
      }) as EdgeDNSChangeListResponse;
      
      // Step 2: Check if record exists (to determine add vs update)
      let operation = 'add-change';
      try {
        await client.request({
          path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/recordsets/${encodeURIComponent(validated.name)}/${validated.type}`,
          method: 'GET',
        });
        operation = 'edit-change';
      } catch (e: any) {
        // 404 means record doesn't exist, use add-change
        if (e.status !== 404) throw e;
      }
      
      // Step 3: Add record change
      await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(validated.zone)}/recordsets/${operation}`,
        method: 'POST',
        body: {
          name: validated.name,
          type: validated.type,
          ttl: validated.ttl,
          rdata: validated.rdata,
        },
      });
      
      // Step 4: Submit changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(validated.zone)}/submit`,
        method: 'POST',
        body: {
          comment: validated.comment || `Record ${operation} via ALECS MCP`,
        },
      }) as EdgeDNSZoneSubmitResponse;
      
      // Invalidate records cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.records.*:*${validated.zone}*`);
      
      return submitResponse;
    } catch (error) {
      handleApiError(error, 'upsertRecord');
    }
  },
  'dns.record.upsert',
  PerformanceProfiles.WRITE
);

/**
 * Delete a DNS record
 */
export const deleteRecord = performanceOptimized(
  async (
    client: AkamaiClient,
    params: DeleteRecordParams
  ): Promise<EdgeDNSZoneSubmitResponse> => {
    // Validate parameters
    const validated = DeleteRecordSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      // Step 1: Create changelist
      const changelistResponse = await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        queryParams: { zone: validated.zone },
      }) as EdgeDNSChangeListResponse;
      
      // Step 2: Add delete change
      await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(validated.zone)}/recordsets/delete-change`,
        method: 'POST',
        body: {
          name: validated.name,
          type: validated.type,
        },
      });
      
      // Step 3: Submit changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(validated.zone)}/submit`,
        method: 'POST',
        body: {
          comment: `Record deletion via ALECS MCP`,
        },
      }) as EdgeDNSZoneSubmitResponse;
      
      // Invalidate records cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.records.*:*${validated.zone}*`);
      
      return submitResponse;
    } catch (error) {
      handleApiError(error, 'deleteRecord');
    }
  },
  'dns.record.delete',
  PerformanceProfiles.WRITE
);

/**
 * Activate pending zone changes
 */
export const activateZone = performanceOptimized(
  async (
    client: AkamaiClient,
    params: ActivateZoneParams
  ): Promise<EdgeDNSZoneSubmitResponse> => {
    // Validate parameters
    const validated = ActivateZoneSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/submit`,
        method: 'POST',
        body: {
          comment: validated.comment || `Zone activation via ALECS MCP`,
        },
      }) as EdgeDNSZoneSubmitResponse;
      
      // Invalidate zone cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.zone.*:*${validated.zone}*`);
      
      return response;
    } catch (error) {
      handleApiError(error, 'activateZone');
    }
  },
  'dns.zone.activate',
  PerformanceProfiles.WRITE
);

/**
 * Get zone activation status
 */
export const getZoneStatus = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { zone: string; customer?: string }
  ): Promise<EdgeDNSZoneActivationStatusResponse> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/status`,
        method: 'GET',
      }) as EdgeDNSZoneActivationStatusResponse;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getZoneStatus');
    }
  },
  'dns.zone.status',
  PerformanceProfiles.STATUS
);

/**
 * DNSSEC Operations
 */

/**
 * Enable DNSSEC for a zone
 */
export const enableDNSSEC = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      algorithm?: string;
      nsec3?: boolean;
      iterations?: number;
      salt?: string;
      customer?: string;
    }
  ): Promise<void> => {
    // Validate parameters
    const validated = EnableDNSSECSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const body: any = {
        enabled: true,
        algorithm: validated.algorithm,
        nsec3: validated.nsec3,
      };
      
      if (validated.nsec3) {
        body.nsec3Iterations = validated.iterations || 1;
        body.nsec3Salt = validated.salt || '';
      }
      
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/dnssec`,
        method: 'PUT',
        body,
      });
      
      // Invalidate DNSSEC cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.dnssec.*:*${validated.zone}*`);
    } catch (error) {
      handleApiError(error, 'enableDNSSEC');
    }
  },
  'dns.dnssec.enable',
  PerformanceProfiles.WRITE
);

/**
 * Disable DNSSEC for a zone
 */
export const disableDNSSEC = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      force?: boolean;
      customer?: string;
    }
  ): Promise<void> => {
    // Validate parameters
    const validated = DisableDNSSECSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      if (validated.force) {
        queryParams.force = 'true';
      }
      
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/dnssec`,
        method: 'PUT',
        body: { enabled: false },
        queryParams,
      });
      
      // Invalidate DNSSEC cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.dnssec.*:*${validated.zone}*`);
    } catch (error) {
      handleApiError(error, 'disableDNSSEC');
    }
  },
  'dns.dnssec.disable',
  PerformanceProfiles.WRITE
);

/**
 * Get DNSSEC status for a zone
 */
export const getDNSSECStatus = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { zone: string; customer?: string }
  ): Promise<DNSSECStatus> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/dnssec`,
        method: 'GET',
      }) as any;
      
      // Get additional status info
      const keysResponse = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/dnssec/keys`,
        method: 'GET',
      }) as any;
      
      return {
        zone: params.zone,
        enabled: response.enabled || false,
        signed: response.signed || false,
        lastSignedDate: response.lastSignedDate,
        nextSigningDate: response.nextSigningDate,
        dsRecordsAtParent: response.dsRecordsAtParent,
        validationErrors: response.validationErrors,
        chainOfTrust: response.chainOfTrust,
      };
    } catch (error) {
      handleApiError(error, 'getDNSSECStatus');
    }
  },
  'dns.dnssec.status',
  PerformanceProfiles.READ
);

/**
 * Rotate DNSSEC keys
 */
export const rotateDNSSECKeys = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      keyType: 'KSK' | 'ZSK' | 'BOTH';
      algorithm?: string;
      customer?: string;
    }
  ): Promise<void> => {
    // Validate parameters
    const validated = RotateDNSSECKeysSchema.parse(params);
    validateCustomer(validated.customer);
    
    try {
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/dnssec/key-rotation`,
        method: 'POST',
        body: {
          keyType: validated.keyType,
          algorithm: validated.algorithm,
        },
      });
      
      // Invalidate DNSSEC cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:dns.dnssec.*:*${validated.zone}*`);
    } catch (error) {
      handleApiError(error, 'rotateDNSSECKeys');
    }
  },
  'dns.dnssec.rotate',
  PerformanceProfiles.WRITE
);

/**
 * Migration Operations
 */

/**
 * Import zone via AXFR transfer
 */
export const importZoneViaAXFR = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      masterServer: string;
      tsigKey?: TSIGKey;
      contractId?: string;
      customer?: string;
    }
  ): Promise<MigrationResult> => {
    // Validate parameters
    const validated = ImportViaAXFRSchema.parse(params);
    validateCustomer(validated.customer);
    
    const startTime = Date.now();
    const errors: Array<{ record: string; error: string }> = [];
    
    try {
      // First create the zone as secondary
      await createZone(client, {
        zone: validated.zone,
        type: ZoneType.SECONDARY,
        contractId: validated.contractId || 'default',
        masters: [validated.masterServer],
        tsigKey: validated.tsigKey,
        customer: validated.customer,
      });
      
      // Wait for initial transfer
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Convert to primary
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(validated.zone)}/zone-transfer`,
        method: 'POST',
        body: { convertToPrimary: true },
      });
      
      // Get record count
      const records = await listRecords(client, {
        zone: validated.zone,
        customer: validated.customer,
      });
      
      return {
        success: true,
        zone: validated.zone,
        recordsMigrated: records.recordsets?.length || 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        errors,
        rollbackAvailable: false,
      };
    } catch (error: any) {
      return {
        success: false,
        zone: validated.zone,
        recordsMigrated: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        errors: [{ record: 'zone', error: error.message }],
        rollbackAvailable: false,
      };
    }
  },
  'dns.migration.axfr',
  PerformanceProfiles.WRITE
);

/**
 * Parse and import zone file
 */
export const parseZoneFile = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      zoneFileContent: string;
      contractId?: string;
      createZone?: boolean;
      customer?: string;
    }
  ): Promise<MigrationResult> => {
    // Validate parameters
    const validated = ParseZoneFileSchema.parse(params);
    validateCustomer(validated.customer);
    
    const startTime = Date.now();
    const errors: Array<{ record: string; error: string }> = [];
    let recordsMigrated = 0;
    
    try {
      // Parse zone file into records
      const records = parseBindZoneFile(validated.zoneFileContent);
      
      // Create zone if requested
      if (validated.createZone && validated.contractId) {
        await createZone(client, {
          zone: validated.zone,
          type: ZoneType.PRIMARY,
          contractId: validated.contractId,
          customer: validated.customer,
        });
      }
      
      // Import records in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          await bulkImportRecordBatch(client, {
            zone: validated.zone,
            records: batch,
            customer: validated.customer,
          });
          recordsMigrated += batch.length;
        } catch (error: any) {
          batch.forEach(record => {
            errors.push({
              record: `${record.name} ${record.type}`,
              error: error.message,
            });
          });
        }
      }
      
      return {
        success: errors.length === 0,
        zone: validated.zone,
        recordsMigrated,
        recordsFailed: errors.length,
        duration: Date.now() - startTime,
        errors,
        rollbackAvailable: false,
      };
    } catch (error: any) {
      return {
        success: false,
        zone: validated.zone,
        recordsMigrated: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        errors: [{ record: 'zone', error: error.message }],
        rollbackAvailable: false,
      };
    }
  },
  'dns.migration.zonefile',
  PerformanceProfiles.WRITE
);

/**
 * Helper Functions
 */

/**
 * Parse BIND zone file format
 */
function parseBindZoneFile(content: string): ZoneFileRecord[] {
  const records: ZoneFileRecord[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    
    // Basic parsing - would need more sophisticated parser for production
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 4) {
      const [name, ttlOrClass, classOrType, typeOrData, ...rest] = parts;
      
      // Handle different formats
      let recordName = name;
      let recordTTL = 3600;
      let recordType = '';
      let recordData = '';
      
      if (/^\d+$/.test(ttlOrClass)) {
        // Format: name ttl class type data
        recordTTL = parseInt(ttlOrClass);
        recordType = typeOrData;
        recordData = rest.join(' ');
      } else if (ttlOrClass === 'IN') {
        // Format: name class type data
        recordType = classOrType;
        recordData = [typeOrData, ...rest].join(' ');
      } else {
        // Format: name type data
        recordType = ttlOrClass;
        recordData = [classOrType, typeOrData, ...rest].join(' ');
      }
      
      records.push({
        name: recordName,
        type: recordType as RecordType,
        ttl: recordTTL,
        data: recordData,
      });
    }
  }
  
  return records;
}

/**
 * Bulk import a batch of records
 */
async function bulkImportRecordBatch(
  client: AkamaiClient,
  params: {
    zone: string;
    records: ZoneFileRecord[];
    customer?: string;
  }
): Promise<void> {
  // Create changelist
  const changelistResponse = await client.request({
    path: '/config-dns/v2/changelists',
    method: 'POST',
    queryParams: { zone: params.zone },
  }) as EdgeDNSChangeListResponse;
  
  // Add all records
  for (const record of params.records) {
    const rdata = parseRecordData(record.type, record.data);
    
    await client.request({
      path: `/config-dns/v2/changelists/${encodeURIComponent(params.zone)}/recordsets/add-change`,
      method: 'POST',
      body: {
        name: record.name,
        type: record.type,
        ttl: record.ttl,
        rdata,
      },
    });
  }
  
  // Submit changelist
  await client.request({
    path: `/config-dns/v2/changelists/${encodeURIComponent(params.zone)}/submit`,
    method: 'POST',
    body: {
      comment: `Bulk import batch via ALECS MCP`,
    },
  });
}

/**
 * Parse record data based on type
 */
function parseRecordData(type: RecordType, data: string): string[] {
  switch (type) {
    case 'MX':
      // MX records need priority and target
      const [priority, ...target] = data.split(/\s+/);
      return [`${priority} ${target.join(' ')}`];
      
    case 'SRV':
      // SRV records need priority, weight, port, target
      return [data];
      
    case 'TXT':
      // TXT records might have quotes
      return [data.replace(/^"(.*)"$/, '$1')];
      
    default:
      return [data];
  }
}

/**
 * Administrative Operations
 */

/**
 * Get authoritative nameservers for zones
 */
export const getAuthoritativeNameservers = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<string[]> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/data/authorities',
        method: 'GET',
      }) as any;
      
      // Extract unique nameservers
      const nameservers = new Set<string>();
      response.contracts?.forEach((contract: any) => {
        contract.authorities?.forEach((ns: string) => {
          nameservers.add(ns);
        });
      });
      
      return Array.from(nameservers).sort();
    } catch (error) {
      handleApiError(error, 'getAuthoritativeNameservers');
    }
  },
  'dns.admin.nameservers',
  PerformanceProfiles.READ
);

/**
 * List available DNS contracts
 */
export const listDNSContracts = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<any[]> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/data/contracts',
        method: 'GET',
      }) as any;
      
      return response.contracts || [];
    } catch (error) {
      handleApiError(error, 'listDNSContracts');
    }
  },
  'dns.admin.contracts',
  PerformanceProfiles.LIST
);

/**
 * Get supported record types
 */
export const getSupportedRecordTypes = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<string[]> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/data/recordsets/types',
        method: 'GET',
      }) as any;
      
      return response.types?.map((t: any) => t.recordType) || [];
    } catch (error) {
      handleApiError(error, 'getSupportedRecordTypes');
    }
  },
  'dns.admin.recordtypes',
  PerformanceProfiles.READ
);

/**
 * Bulk Operations
 */

/**
 * Bulk import DNS records
 */
export const bulkImportRecords = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      records: Array<{
        name: string;
        type: RecordType;
        ttl: number;
        rdata: string[];
      }>;
      replaceExisting?: boolean;
      customer?: string;
    }
  ): Promise<MigrationResult> => {
    // Validate parameters
    const validated = BulkImportRecordsSchema.parse(params);
    validateCustomer(validated.customer);
    
    const startTime = Date.now();
    const errors: Array<{ record: string; error: string }> = [];
    let recordsMigrated = 0;
    
    try {
      // Import records in batches
      const batchSize = 100;
      for (let i = 0; i < validated.records.length; i += batchSize) {
        const batch = validated.records.slice(i, i + batchSize);
        
        try {
          await bulkImportRecordBatch(client, {
            zone: validated.zone,
            records: batch.map(r => ({
              name: r.name,
              type: r.type,
              ttl: r.ttl,
              data: r.rdata.join(' '),
            })),
            customer: validated.customer,
          });
          recordsMigrated += batch.length;
        } catch (error: any) {
          batch.forEach(record => {
            errors.push({
              record: `${record.name} ${record.type}`,
              error: error.message,
            });
          });
        }
      }
      
      return {
        success: errors.length === 0,
        zone: validated.zone,
        recordsMigrated,
        recordsFailed: errors.length,
        duration: Date.now() - startTime,
        errors,
        rollbackAvailable: false,
      };
    } catch (error: any) {
      return {
        success: false,
        zone: validated.zone,
        recordsMigrated: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        errors: [{ record: 'zone', error: error.message }],
        rollbackAvailable: false,
      };
    }
  },
  'dns.bulk.import',
  PerformanceProfiles.WRITE
);

/**
 * Bulk create DNS zones
 */
export const bulkCreateZones = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zones: Array<{
        zone: string;
        type: ZoneType;
        contractId: string;
        groupId?: string;
        masters?: string[];
        target?: string;
        comment?: string;
      }>;
      customer?: string;
    }
  ): Promise<{ requestId: string; status: string }> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/zones/bulk-create',
        method: 'POST',
        body: {
          zones: params.zones.map(zone => ({
            ...zone,
            contractId: normalizeId.contract(zone.contractId),
          })),
        },
      }) as any;
      
      // Invalidate zones list cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:dns.zones.list:*`);
      
      return {
        requestId: response.requestId || 'unknown',
        status: response.status || 'PENDING',
      };
    } catch (error) {
      handleApiError(error, 'bulkCreateZones');
    }
  },
  'dns.bulk.zones',
  PerformanceProfiles.WRITE
);

/**
 * Create multiple DNS record sets
 */
export const createMultipleRecordSets = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      recordSets: Array<{
        name: string;
        type: RecordType;
        ttl: number;
        rdata: string[];
      }>;
      customer?: string;
    }
  ): Promise<EdgeDNSZoneSubmitResponse> => {
    validateCustomer(params.customer);
    
    try {
      // Create changelist
      const changelistResponse = await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        queryParams: { zone: params.zone },
      }) as EdgeDNSChangeListResponse;
      
      // Add all record sets
      for (const recordSet of params.recordSets) {
        await client.request({
          path: `/config-dns/v2/changelists/${encodeURIComponent(params.zone)}/recordsets/add-change`,
          method: 'POST',
          body: recordSet,
        });
      }
      
      // Submit changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(params.zone)}/submit`,
        method: 'POST',
        body: {
          comment: `Created ${params.recordSets.length} record sets via ALECS MCP`,
        },
      }) as EdgeDNSZoneSubmitResponse;
      
      // Invalidate records cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:dns.records.*:*${params.zone}*`);
      
      return submitResponse;
    } catch (error) {
      handleApiError(error, 'createMultipleRecordSets');
    }
  },
  'dns.records.bulk',
  PerformanceProfiles.WRITE
);

/**
 * Changelist Operations
 */

/**
 * List all changelists
 */
export const listChangelists = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      page?: number;
      pageSize?: number;
      showAll?: boolean;
      customer?: string;
    } = {}
  ): Promise<Array<{
    zone: string;
    changeTag: string;
    lastModifiedDate: string;
    lastModifiedBy?: string;
    stale?: boolean;
  }>> => {
    validateCustomer(params.customer);
    
    try {
      const queryParams: Record<string, string> = {};
      if (params.page) queryParams.page = params.page.toString();
      if (params.pageSize) queryParams.pageSize = params.pageSize.toString();
      if (params.showAll) queryParams.showAll = 'true';
      
      const response = await client.request({
        path: '/config-dns/v2/changelists',
        method: 'GET',
        queryParams,
      }) as any;
      
      return response.changelists || [];
    } catch (error) {
      handleApiError(error, 'listChangelists');
    }
  },
  'dns.changelists.list',
  PerformanceProfiles.LIST
);

/**
 * Search changelists by zones
 */
export const searchChangelists = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zones: string[];
      customer?: string;
    }
  ): Promise<Array<{
    zone: string;
    changeTag: string;
    lastModifiedDate: string;
    lastModifiedBy?: string;
    stale?: boolean;
  }>> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/changelists/search',
        method: 'POST',
        body: { zones: params.zones },
      }) as any;
      
      return response.changelists || [];
    } catch (error) {
      handleApiError(error, 'searchChangelists');
    }
  },
  'dns.changelists.search',
  PerformanceProfiles.LIST
);

/**
 * Get changelist diff
 */
export const getChangelistDiff = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      customer?: string;
    }
  ): Promise<{
    zone: string;
    additions?: Array<{ name: string; type: string; ttl: number; rdata: string[] }>;
    modifications?: Array<{
      name: string;
      type: string;
      oldValue: { ttl: number; rdata: string[] };
      newValue: { ttl: number; rdata: string[] };
    }>;
    deletions?: Array<{ name: string; type: string; ttl: number; rdata: string[] }>;
  }> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/changelists/${encodeURIComponent(params.zone)}/diff`,
        method: 'GET',
      }) as any;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getChangelistDiff');
    }
  },
  'dns.changelist.diff',
  PerformanceProfiles.READ
);

/**
 * Zone Version Operations
 */

/**
 * Get zone version
 */
export const getZoneVersion = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      versionId: string;
      customer?: string;
    }
  ): Promise<{
    zone: string;
    versionId: string;
    activationDate: string;
    author: string;
    comment?: string;
    recordSetCount: number;
  }> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/versions/${params.versionId}`,
        method: 'GET',
      }) as any;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getZoneVersion');
    }
  },
  'dns.version.get',
  PerformanceProfiles.READ
);

/**
 * Get version record sets
 */
export const getVersionRecordSets = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      versionId: string;
      customer?: string;
    }
  ): Promise<EdgeDNSRecordSetsResponse> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/versions/${params.versionId}/recordsets`,
        method: 'GET',
      }) as EdgeDNSRecordSetsResponse;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getVersionRecordSets');
    }
  },
  'dns.version.recordsets',
  PerformanceProfiles.READ
);

/**
 * Get version master zone file
 */
export const getVersionMasterZoneFile = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      versionId: string;
      customer?: string;
    }
  ): Promise<string> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/versions/${params.versionId}/zone-file`,
        method: 'GET',
        headers: {
          Accept: 'text/plain',
        },
      }) as string;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getVersionMasterZoneFile');
    }
  },
  'dns.version.zonefile',
  PerformanceProfiles.READ
);

/**
 * Reactivate zone version
 */
export const reactivateZoneVersion = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      versionId: string;
      comment?: string;
      customer?: string;
    }
  ): Promise<{ versionId: string }> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/versions/${params.versionId}/reactivate`,
        method: 'POST',
        body: {
          comment: params.comment || `Reactivated version ${params.versionId}`,
        },
      }) as any;
      
      // Invalidate zone cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:dns.*:*${params.zone}*`);
      
      return response;
    } catch (error) {
      handleApiError(error, 'reactivateZoneVersion');
    }
  },
  'dns.version.reactivate',
  PerformanceProfiles.WRITE
);

/**
 * Zone Transfer Operations
 */

/**
 * Get zone transfer status
 */
export const getZoneTransferStatus = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zones: string[];
      customer?: string;
    }
  ): Promise<Array<{
    zone: string;
    lastTransferTime?: string;
    lastTransferResult?: string;
    lastTransferError?: string;
    nextTransferTime?: string;
    masterServers: string[];
  }>> => {
    validateCustomer(params.customer);
    
    const results = [];
    
    try {
      for (const zone of params.zones) {
        const response = await client.request({
          path: `/config-dns/v2/zones/${encodeURIComponent(zone)}/transfer-status`,
          method: 'GET',
        }) as any;
        
        results.push(response);
      }
      
      return results;
    } catch (error) {
      handleApiError(error, 'getZoneTransferStatus');
    }
  },
  'dns.transfer.status',
  PerformanceProfiles.READ
);

/**
 * Convert secondary zone to primary
 */
export const convertZoneToPrimary = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zone: string;
      customer?: string;
    }
  ): Promise<void> => {
    validateCustomer(params.customer);
    
    try {
      await client.request({
        path: `/config-dns/v2/zones/${encodeURIComponent(params.zone)}/zone-transfer`,
        method: 'POST',
        body: { convertToPrimary: true },
      });
      
      // Invalidate zone cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:dns.zone.*:*${params.zone}*`);
    } catch (error) {
      handleApiError(error, 'convertZoneToPrimary');
    }
  },
  'dns.zone.convert',
  PerformanceProfiles.WRITE
);

/**
 * TSIG Key Operations
 */

/**
 * List TSIG keys
 */
export const listTSIGKeys = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<TSIGKey[]> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/config-dns/v2/tsig-keys',
        method: 'GET',
      }) as any;
      
      return response.keys || [];
    } catch (error) {
      handleApiError(error, 'listTSIGKeys');
    }
  },
  'dns.tsig.list',
  PerformanceProfiles.LIST
);

/**
 * Create TSIG key
 */
export const createTSIGKey = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      keyName: string;
      algorithm: string;
      secret?: string;
      customer?: string;
    }
  ): Promise<TSIGKey> => {
    validateCustomer(params.customer);
    
    try {
      const body: any = {
        keyName: params.keyName,
        algorithm: params.algorithm,
      };
      
      if (params.secret) {
        body.secret = params.secret;
      }
      
      const response = await client.request({
        path: '/config-dns/v2/tsig-keys',
        method: 'POST',
        body,
      }) as TSIGKey;
      
      return response;
    } catch (error) {
      handleApiError(error, 'createTSIGKey');
    }
  },
  'dns.tsig.create',
  PerformanceProfiles.WRITE
);

/**
 * Update TSIG key for zones
 */
export const updateTSIGKeyForZones = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      zones: string[];
      tsigKey: TSIGKey;
      customer?: string;
    }
  ): Promise<Array<{ zone: string; success: boolean; error?: string }>> => {
    validateCustomer(params.customer);
    
    const results: Array<{ zone: string; success: boolean; error?: string }> = [];
    
    for (const zone of params.zones) {
      try {
        // Get current zone config
        const zoneConfig = await getZone(client, { zone, customer: params.customer });
        
        // Update with new TSIG key
        await client.request({
          path: `/config-dns/v2/zones/${encodeURIComponent(zone)}`,
          method: 'PUT',
          body: {
            ...zoneConfig,
            tsigKey: params.tsigKey,
          },
        });
        
        results.push({ zone, success: true });
      } catch (error: any) {
        results.push({
          zone,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }
    
    return results;
  },
  'dns.tsig.update',
  PerformanceProfiles.WRITE
);

/**
 * Migration Support Operations
 */

/**
 * Generate migration instructions
 */
export const generateMigrationInstructions = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      sourceProvider: 'cloudflare' | 'route53' | 'godaddy' | 'other';
      zones: string[];
      customer?: string;
    }
  ): Promise<MigrationPlan> => {
    validateCustomer(params.customer);
    
    // Get Akamai nameservers
    const nameservers = await getAuthoritativeNameservers(client, { customer: params.customer });
    
    // Provider-specific instructions
    const providerInstructions: Record<string, string[]> = {
      cloudflare: [
        'Export zones from Cloudflare dashboard or API',
        'Use parseZoneFile to import zone data',
        'Update nameservers at registrar to Akamai nameservers',
        'Wait for TTL expiration before removing from Cloudflare',
      ],
      route53: [
        'Export zones using AWS CLI: aws route53 list-resource-record-sets',
        'Convert JSON to zone file format',
        'Import using parseZoneFile',
        'Update NS records in Route53 hosted zone',
      ],
      godaddy: [
        'Export DNS records from GoDaddy control panel',
        'Create zones in Akamai',
        'Import records using bulkImportRecords',
        'Change nameservers in GoDaddy domain settings',
      ],
      other: [
        'Export current DNS records in BIND format if possible',
        'Create zones in Akamai Edge DNS',
        'Import records using appropriate method',
        'Update nameservers at domain registrar',
      ],
    };
    
    const conflicts: Array<{ record: string; issue: string; resolution: string }> = [];
    
    // Check for common migration issues
    for (const zone of params.zones) {
      conflicts.push({
        record: `${zone} SOA`,
        issue: 'SOA record will be automatically created',
        resolution: 'Do not import SOA records from source',
      });
      
      if (params.sourceProvider === 'cloudflare') {
        conflicts.push({
          record: `${zone} Proxied records`,
          issue: 'Cloudflare proxy features not available',
          resolution: 'Configure equivalent Akamai features separately',
        });
      }
    }
    
    return {
      sourceRecords: [],
      akamaiRecords: [],
      conflicts,
      estimatedTime: `${params.zones.length * 10} minutes`,
    };
  },
  'dns.migration.plan',
  PerformanceProfiles.READ
);

/**
 * Export Operations
 */

/**
 * Export all DNS operations as a unified API
 */
export const dnsOperations = {
  // Zone operations
  listZones,
  getZone,
  createZone,
  deleteZone,
  getZoneStatus,
  activateZone,
  convertZoneToPrimary,
  
  // Record operations
  listRecords,
  upsertRecord,
  deleteRecord,
  createMultipleRecordSets,
  bulkImportRecords,
  
  // DNSSEC operations
  enableDNSSEC,
  disableDNSSEC,
  getDNSSECStatus,
  rotateDNSSECKeys,
  
  // Migration operations
  importZoneViaAXFR,
  parseZoneFile,
  generateMigrationInstructions,
  
  // Administrative operations
  getAuthoritativeNameservers,
  listDNSContracts,
  getSupportedRecordTypes,
  
  // Changelist operations
  listChangelists,
  searchChangelists,
  getChangelistDiff,
  
  // Version operations
  getZoneVersion,
  getVersionRecordSets,
  getVersionMasterZoneFile,
  reactivateZoneVersion,
  
  // Zone transfer operations
  getZoneTransferStatus,
  
  // TSIG operations
  listTSIGKeys,
  createTSIGKey,
  updateTSIGKeyForZones,
  
  // Bulk operations
  bulkCreateZones,
};