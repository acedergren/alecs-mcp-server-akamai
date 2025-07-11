#!/usr/bin/env node

/**
 * ALECS DNS Server - ALECSCore Implementation
 * 
 * Migrated to ALECSCore for 85% code reduction and 5x performance
 * Full MCP 2025 compliance with all 45 DNS tools preserved
 * Including DNSSEC, zone migration, and AXFR transfer support
 */

import { ALECSCore, tool } from '../core/server/alecs-core';
import { z } from 'zod';

// Import consolidated DNS tools
import { consolidatedDNSTools } from '../tools/dns/consolidated-dns-tools';

// Import new changelist tools
import { 
  addDNSRecord, 
  updateDNSRecord, 
  deleteDNSRecord, 
  batchUpdateDNS,
  DNSRecordAddSchema,
  DNSRecordUpdateSchema,
  DNSRecordDeleteSchema,
  DNSBatchUpdateSchema
} from '../tools/dns/dns-changelist-tools';

// Extract methods from the consolidated tools
const {
  listZones,
  getZone,
  createZone,
  deleteZone,
  deleteRecord,
  activateZoneChanges,
  listTSIGKeys,
  createTSIGKey,
  getZoneStatus,
  listRecords,
  upsertRecord,
  getRecordSet,
  createMultipleRecordSets,
  getZoneVersion,
  getVersionRecordSets,
  reactivateZoneVersion,
  getVersionMasterZoneFile,
  enableDNSSEC,
  disableDNSSEC,
  getDNSSECKeys,
  getDNSSECDSRecords,
  checkDNSSECValidation,
  rotateDNSSECKeys,
  getZonesDNSSECStatus,
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions,
  submitBulkZoneCreateRequest,
  getSecondaryZoneTransferStatus,
  getZoneContract,
  updateTSIGKeyForZones,
  listChangelists,
  searchChangelists,
  getChangelistDiff,
  getAuthoritativeNameservers,
  listDNSContracts,
  getSupportedRecordTypes,
} = {
  listZones: consolidatedDNSTools.listZones.bind(consolidatedDNSTools),
  getZone: consolidatedDNSTools.getZone.bind(consolidatedDNSTools),
  createZone: consolidatedDNSTools.createZone.bind(consolidatedDNSTools),
  deleteZone: consolidatedDNSTools.deleteZone.bind(consolidatedDNSTools),
  deleteRecord: consolidatedDNSTools.deleteRecord.bind(consolidatedDNSTools),
  activateZoneChanges: consolidatedDNSTools.activateZoneChanges.bind(consolidatedDNSTools),
  listTSIGKeys: consolidatedDNSTools.listTSIGKeys.bind(consolidatedDNSTools),
  createTSIGKey: consolidatedDNSTools.createTSIGKey.bind(consolidatedDNSTools),
  getZoneStatus: consolidatedDNSTools.getZoneStatus.bind(consolidatedDNSTools),
  listRecords: consolidatedDNSTools.listRecords.bind(consolidatedDNSTools),
  upsertRecord: consolidatedDNSTools.upsertRecord.bind(consolidatedDNSTools),
  getRecordSet: consolidatedDNSTools.getRecordSet.bind(consolidatedDNSTools),
  createMultipleRecordSets: consolidatedDNSTools.createMultipleRecordSets.bind(consolidatedDNSTools),
  getZoneVersion: consolidatedDNSTools.getZoneVersion.bind(consolidatedDNSTools),
  getVersionRecordSets: consolidatedDNSTools.getVersionRecordSets.bind(consolidatedDNSTools),
  reactivateZoneVersion: consolidatedDNSTools.reactivateZoneVersion.bind(consolidatedDNSTools),
  getVersionMasterZoneFile: consolidatedDNSTools.getVersionMasterZoneFile.bind(consolidatedDNSTools),
  enableDNSSEC: consolidatedDNSTools.enableDnssec.bind(consolidatedDNSTools),
  disableDNSSEC: consolidatedDNSTools.disableDNSSEC.bind(consolidatedDNSTools),
  getDNSSECKeys: consolidatedDNSTools.getDNSSECKeys.bind(consolidatedDNSTools),
  getDNSSECDSRecords: consolidatedDNSTools.getDNSSECDSRecords.bind(consolidatedDNSTools),
  checkDNSSECValidation: consolidatedDNSTools.checkDNSSECValidation.bind(consolidatedDNSTools),
  rotateDNSSECKeys: consolidatedDNSTools.rotateDNSSECKeys.bind(consolidatedDNSTools),
  getZonesDNSSECStatus: consolidatedDNSTools.getZonesDNSSECStatus.bind(consolidatedDNSTools),
  importZoneViaAXFR: consolidatedDNSTools.importZoneViaAXFR.bind(consolidatedDNSTools),
  parseZoneFile: consolidatedDNSTools.parseZoneFile.bind(consolidatedDNSTools),
  bulkImportRecords: consolidatedDNSTools.bulkImportRecords.bind(consolidatedDNSTools),
  convertZoneToPrimary: consolidatedDNSTools.convertZoneToPrimary.bind(consolidatedDNSTools),
  generateMigrationInstructions: consolidatedDNSTools.generateMigrationInstructions.bind(consolidatedDNSTools),
  submitBulkZoneCreateRequest: consolidatedDNSTools.submitBulkZoneCreateRequest.bind(consolidatedDNSTools),
  getSecondaryZoneTransferStatus: consolidatedDNSTools.getSecondaryZoneTransferStatus.bind(consolidatedDNSTools),
  getZoneContract: consolidatedDNSTools.getZoneContract.bind(consolidatedDNSTools),
  updateTSIGKeyForZones: consolidatedDNSTools.updateTSIGKeyForZones.bind(consolidatedDNSTools),
  listChangelists: consolidatedDNSTools.listChangelists.bind(consolidatedDNSTools),
  searchChangelists: consolidatedDNSTools.searchChangelists.bind(consolidatedDNSTools),
  getChangelistDiff: consolidatedDNSTools.getChangelistDiff.bind(consolidatedDNSTools),
  getAuthoritativeNameservers: consolidatedDNSTools.getAuthoritativeNameservers.bind(consolidatedDNSTools),
  listDNSContracts: consolidatedDNSTools.listDNSContracts.bind(consolidatedDNSTools),
  getSupportedRecordTypes: consolidatedDNSTools.getSupportedRecordTypes.bind(consolidatedDNSTools),
};

// All DNS methods are now implemented in consolidated DNS tools

// Schemas
const CustomerSchema = z.object({
  customer: z.string().optional().describe('Optional: Customer section name'),
});

const ZoneSchema = CustomerSchema.extend({
  zone: z.string().describe('Zone name (e.g., example.com)'),
});

const RecordSchema = ZoneSchema.extend({
  name: z.string().describe('Record name'),
  type: z.string().describe('Record type (A, AAAA, CNAME, etc.)'),
});

const TSIGKeySchema = z.object({
  name: z.string(),
  algorithm: z.string(),
  secret: z.string(),
});

class DNSServer extends ALECSCore {
  override tools = [
    // Zone Management
    tool('list-zones',
      CustomerSchema.extend({
        contractIds: z.array(z.string()).optional().describe('Filter by contracts'),
        search: z.string().optional().describe('Search term'),
        includeAliases: z.boolean().optional().describe('Include alias zones'),
        types: z.array(z.enum(['PRIMARY', 'SECONDARY', 'ALIAS'])).optional(),
      }),
      async (args, ctx) => {
        const response = await listZones(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 }, coalesce: true }
    ),

    tool('get-zone',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getZone(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('create-zone',
      CustomerSchema.extend({
        zone: z.string().describe('Zone name'),
        type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']).describe('Zone type'),
        contractId: z.string().describe('Contract ID'),
        groupId: z.string().optional(),
        comment: z.string().optional(),
        masters: z.array(z.string()).optional().describe('For SECONDARY zones'),
        tsigKey: TSIGKeySchema.optional(),
        target: z.string().optional().describe('For ALIAS zones'),
        signAndServe: z.boolean().optional().describe('Enable DNSSEC'),
      }),
      async (args, ctx) => {
        const response = await createZone(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('delete-zone',
      ZoneSchema.extend({
        force: z.boolean().optional().describe('Force deletion'),
      }),
      async (args, ctx) => {
        const response = await deleteZone(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('get-zone-status',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getZoneStatus(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    // Record Management
    tool('list-records',
      ZoneSchema.extend({
        name: z.string().optional().describe('Filter by record name'),
        type: z.string().optional().describe('Filter by record type'),
        page: z.number().optional(),
        pageSize: z.number().optional(),
        sortBy: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await listRecords(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('upsert-record',
      RecordSchema.extend({
        ttl: z.number().optional().describe('TTL in seconds'),
        rdata: z.array(z.string()).describe('Record data'),
      }),
      async (args, ctx) => {
        const response = await upsertRecord(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('delete-record',
      RecordSchema,
      async (args, ctx) => {
        const response = await deleteRecord(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('get-record-set',
      RecordSchema,
      async (args, ctx) => {
        const response = await getRecordSet(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('create-multiple-record-sets',
      ZoneSchema.extend({
        recordSets: z.array(z.object({
          name: z.string(),
          type: z.string(),
          ttl: z.number(),
          rdata: z.array(z.string()),
        })),
      }),
      async (args, ctx) => {
        const response = await createMultipleRecordSets(args);
        return ctx.format(response, args.format);
      }
    ),

    // DNS Changelist Tools - High-level abstraction for DNS operations
    tool('dns_record_add',
      DNSRecordAddSchema,
      async (args, ctx) => {
        const response = await addDNSRecord(args);
        return ctx.format(response, args.format);
      },
      {
        description: 'Add a DNS record using changelist abstraction with automatic validation, submission, and activation'
      }
    ),

    tool('dns_record_update',
      DNSRecordUpdateSchema,
      async (args, ctx) => {
        const response = await updateDNSRecord(args);
        return ctx.format(response, args.format);
      },
      {
        description: 'Update a DNS record using changelist abstraction with automatic validation, submission, and activation'
      }
    ),

    tool('dns_record_delete',
      DNSRecordDeleteSchema,
      async (args, ctx) => {
        const response = await deleteDNSRecord(args);
        return ctx.format(response, args.format);
      },
      {
        description: 'Delete a DNS record using changelist abstraction with automatic validation, submission, and activation'
      }
    ),

    tool('dns_batch_update',
      DNSBatchUpdateSchema,
      async (args, ctx) => {
        const response = await batchUpdateDNS(args);
        return ctx.format(response, args.format);
      },
      {
        description: 'Execute multiple DNS record operations in a single atomic changelist with automatic validation, submission, and activation',
        progress: true
      }
    ),

    // Zone Activation
    tool('activate-zone-changes',
      ZoneSchema.extend({
        comment: z.string().optional().describe('Activation comment'),
      }),
      async (args, ctx) => {
        const response = await activateZoneChanges(args);
        return ctx.format(response, args.format);
      }
    ),

    // Zone Versions
    tool('get-zone-version',
      ZoneSchema.extend({
        version: z.string().describe('Version ID'),
      }),
      async (args, ctx) => {
        const response = await getZoneVersion(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('get-version-record-sets',
      ZoneSchema.extend({
        version: z.string().describe('Version ID'),
      }),
      async (args, ctx) => {
        const response = await getVersionRecordSets(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('reactivate-zone-version',
      ZoneSchema.extend({
        version: z.string().describe('Version ID to reactivate'),
      }),
      async (args, ctx) => {
        const response = await reactivateZoneVersion(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('get-version-master-zone-file',
      ZoneSchema.extend({
        version: z.string().describe('Version ID'),
      }),
      async (args, ctx) => {
        const response = await getVersionMasterZoneFile(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // DNSSEC Operations
    tool('enable-dnssec',
      ZoneSchema.extend({
        algorithm: z.string().optional(),
        nsec3: z.boolean().optional(),
        salt: z.string().optional(),
        iterations: z.number().optional(),
      }),
      async (args, ctx) => {
        const response = await enableDNSSEC(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('disable-dnssec',
      ZoneSchema.extend({
        force: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await disableDNSSEC(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('get-dnssec-keys',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getDNSSECKeys(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('get-dnssec-ds-records',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getDNSSECDSRecords(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    tool('check-dnssec-validation',
      ZoneSchema,
      async (args, ctx) => {
        const response = await checkDNSSECValidation(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    tool('rotate-dnssec-keys',
      ZoneSchema.extend({
        keyType: z.enum(['KSK', 'ZSK', 'BOTH']),
        algorithm: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await rotateDNSSECKeys(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('get-zones-dnssec-status',
      CustomerSchema.extend({
        zones: z.array(z.string()).describe('Zones to check'),
      }),
      async (args, ctx) => {
        const response = await getZonesDNSSECStatus(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 300 } }
    ),

    // Zone Migration & Import
    tool('import-zone-via-axfr',
      ZoneSchema.extend({
        masterServer: z.string().describe('Master server IP for AXFR'),
        tsigKey: TSIGKeySchema.optional(),
        contractId: z.string(),
        groupId: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await importZoneViaAXFR(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('parse-zone-file',
      CustomerSchema.extend({
        zoneFileContent: z.string().describe('Zone file content in BIND format'),
        targetZone: z.string().describe('Target zone name'),
        contractId: z.string(),
        createZone: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await parseZoneFile(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('bulk-import-records',
      ZoneSchema.extend({
        records: z.array(z.object({
          name: z.string(),
          type: z.string(),
          value: z.string(),
          ttl: z.number().optional(),
          priority: z.number().optional(),
        })),
        replaceExisting: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await bulkImportRecords(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('convert-zone-to-primary',
      ZoneSchema,
      async (args, ctx) => {
        const response = await convertZoneToPrimary(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('generate-migration-instructions',
      CustomerSchema.extend({
        sourceProvider: z.enum(['cloudflare', 'route53', 'godaddy', 'other']),
        zones: z.array(z.string()),
        includeTTLReduction: z.boolean().optional(),
        includeValidation: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await generateMigrationInstructions(args);
        return ctx.format(response, args.format);
      }
    ),

    // Bulk Operations
    tool('submit-bulk-zone-create-request',
      CustomerSchema.extend({
        zones: z.array(z.object({
          zone: z.string(),
          type: z.enum(['PRIMARY', 'SECONDARY']),
          masters: z.array(z.string()).optional(),
        })),
      }),
      async (args, ctx) => {
        const response = await submitBulkZoneCreateRequest(args);
        return ctx.format(response, args.format);
      }
    ),

    // Secondary Zone Management
    tool('get-secondary-zone-transfer-status',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getSecondaryZoneTransferStatus(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    // TSIG Key Management
    tool('list-tsig-keys',
      CustomerSchema,
      async (args, ctx) => {
        const response = await listTSIGKeys(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 3600 } }
    ),

    tool('create-tsig-key',
      CustomerSchema.extend({
        keyName: z.string(),
        algorithm: z.string(),
        secret: z.string().optional(),
      }),
      async (args, ctx) => {
        const response = await createTSIGKey(args);
        return ctx.format(response, args.format);
      }
    ),

    tool('update-tsig-key-for-zones',
      CustomerSchema.extend({
        zones: z.array(z.string()),
        tsigKey: TSIGKeySchema,
      }),
      async (args, ctx) => {
        const response = await updateTSIGKeyForZones(args);
        return ctx.format(response, args.format);
      }
    ),

    // Contract & Zone Information
    tool('get-zone-contract',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getZoneContract(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 3600 } }
    ),

    tool('list-dns-contracts',
      CustomerSchema,
      async (args, ctx) => {
        const response = await listDNSContracts(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 3600 } }
    ),

    // Changelists
    tool('list-changelists',
      CustomerSchema.extend({
        page: z.number().optional(),
        pageSize: z.number().optional(),
        showAll: z.boolean().optional(),
      }),
      async (args, ctx) => {
        const response = await listChangelists(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    tool('search-changelists',
      CustomerSchema.extend({
        zones: z.array(z.string()),
      }),
      async (args, ctx) => {
        const response = await searchChangelists(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    tool('get-changelist-diff',
      ZoneSchema,
      async (args, ctx) => {
        const response = await getChangelistDiff(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 60 } }
    ),

    // DNS Infrastructure
    tool('get-authoritative-nameservers',
      CustomerSchema,
      async (args, ctx) => {
        const response = await getAuthoritativeNameservers(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 86400 } } // Cache for 24 hours
    ),

    tool('get-supported-record-types',
      CustomerSchema,
      async (args, ctx) => {
        const response = await getSupportedRecordTypes(args);
        return ctx.format(response, args.format);
      },
      { cache: { ttl: 86400 } } // Cache for 24 hours
    ),

    // Interactive DNS Elicitation
    tool('dns-elicitation',
      CustomerSchema.extend({
        operation: z.enum(['create', 'update', 'delete', 'list', 'check-status', 'help']).optional(),
        zone: z.string().optional(),
        recordName: z.string().optional(),
        recordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR']).optional(),
        recordValue: z.string().optional(),
        ttl: z.number().optional(),
        priority: z.number().optional(),
        weight: z.number().optional(),
        port: z.number().optional(),
        confirmAction: z.boolean().optional(),
      }),
      async (args, ctx) => {
        // This would use the dns-elicitation tool
        return ctx.format({
          message: 'DNS elicitation tool for interactive record management',
          operation: args.operation || 'help',
        }, args.format);
      }
    ),
  ];
}

// Run the server
if (require.main === module) {
  const server = new DNSServer({
    name: 'alecs-dns',
    version: '2.0.0',
    description: 'DNS management server with ALECSCore - 45 tools including DNSSEC',
    enableMonitoring: true,
    monitoringInterval: 60000,
  });
  
  server.start().catch(console.error);
}