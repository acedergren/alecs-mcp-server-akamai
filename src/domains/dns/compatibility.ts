/**
 * DNS Domain Backwards Compatibility Layer
 * 
 * CODE KAI: Maintains compatibility with existing DNS tool interfaces
 * while routing through the consolidated operations
 */

import type { AkamaiClient } from '../../akamai-client';
import type { MCPToolResponse } from '../../types';
import { dnsOperations } from './operations';
import { handleApiError } from '../../core/errors';
import type { RecordType } from './types';

/**
 * DNS Tools Compatibility Layer
 * 
 * These functions maintain the exact same interfaces as the original
 * DNS tool files but route through the consolidated operations.
 */

/**
 * From dns-tools.ts - List DNS zones
 */
export async function listZones(
  client: AkamaiClient,
  args: {
    contractIds?: string[];
    types?: string[];
    customer?: string;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const zones = await dnsOperations.listZones(client, {
      contractIds: args.contractIds,
      types: args.types as any,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Found ${zones.zones?.length || 0} DNS zones`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list zones: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - Get zone details
 */
export async function getZone(
  client: AkamaiClient,
  args: { zone: string; customer?: string }
): Promise<MCPToolResponse> {
  try {
    const zone = await dnsOperations.getZone(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Zone: ${zone.zone}\nType: ${zone.type}\nActivation State: ${zone.activationState || 'Unknown'}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get zone: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - Create DNS zone
 */
export async function createZone(
  client: AkamaiClient,
  args: {
    zone: string;
    type: 'primary' | 'secondary' | 'alias';
    contractId: string;
    comment?: string;
    signAndServe?: boolean;
    masters?: string[];
    target?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const zone = await dnsOperations.createZone(client, {
      zone: args.zone,
      type: args.type.toUpperCase() as any,
      contractId: args.contractId,
      comment: args.comment,
      signAndServe: args.signAndServe,
      masters: args.masters,
      target: args.target,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully created zone: ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to create zone: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - List DNS records
 */
export async function listRecords(
  client: AkamaiClient,
  args: {
    zone: string;
    name?: string;
    type?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const records = await dnsOperations.listRecords(client, {
      zone: args.zone,
      search: args.name,
      type: args.type,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Found ${records.recordsets?.length || 0} DNS records`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list records: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - Create or update DNS record
 */
export async function upsertRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await dnsOperations.upsertRecord(client, {
      zone: args.zone,
      name: args.name,
      type: args.type as RecordType,
      ttl: args.ttl,
      rdata: args.rdata,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully updated record: ${args.name} ${args.type}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to upsert record: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - Delete DNS record
 */
export async function deleteRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    await dnsOperations.deleteRecord(client, {
      zone: args.zone,
      name: args.name,
      type: args.type as RecordType,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully deleted record: ${args.name} ${args.type}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to delete record: ${String(error)}`);
  }
}

/**
 * From dns-tools.ts - Activate zone changes
 */
export async function activateZoneChanges(
  client: AkamaiClient,
  args: {
    zone: string;
    comment?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    await dnsOperations.activateZone(client, {
      zone: args.zone,
      comment: args.comment,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Successfully activated zone: ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to activate zone: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - List changelists
 */
export async function listChangelists(
  client: AkamaiClient,
  args: {
    page?: number;
    pageSize?: number;
    showAll?: boolean;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const changelists = await dnsOperations.listChangelists(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${changelists.length} changelists`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list changelists: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - Search changelists
 */
export async function searchChangelists(
  client: AkamaiClient,
  args: { zones: string[] }
): Promise<MCPToolResponse> {
  try {
    const changelists = await dnsOperations.searchChangelists(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${changelists.length} changelists for specified zones`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to search changelists: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - Get changelist diff
 */
export async function getChangelistDiff(
  client: AkamaiClient,
  args: { zone: string }
): Promise<MCPToolResponse> {
  try {
    const diff = await dnsOperations.getChangelistDiff(client, args);
    
    const totalChanges = (diff.additions?.length || 0) + 
                        (diff.modifications?.length || 0) + 
                        (diff.deletions?.length || 0);
    
    return {
      content: [{
        type: 'text',
        text: `Changelist diff for ${args.zone}: ${totalChanges} total changes`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get changelist diff: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - Get authoritative nameservers
 */
export async function getAuthoritativeNameservers(
  client: AkamaiClient,
  _args: {} = {}
): Promise<MCPToolResponse> {
  try {
    const nameservers = await dnsOperations.getAuthoritativeNameservers(client, {});
    
    return {
      content: [{
        type: 'text',
        text: `Akamai nameservers: ${nameservers.join(', ')}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get nameservers: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - List DNS contracts
 */
export async function listDNSContracts(
  client: AkamaiClient,
  _args: {} = {}
): Promise<MCPToolResponse> {
  try {
    const contracts = await dnsOperations.listDNSContracts(client, {});
    
    return {
      content: [{
        type: 'text',
        text: `Found ${contracts.length} DNS contracts`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list contracts: ${String(error)}`);
  }
}

/**
 * From dns-operations-priority.ts - Get supported record types
 */
export async function getSupportedRecordTypes(
  client: AkamaiClient,
  _args: {} = {}
): Promise<MCPToolResponse> {
  try {
    const types = await dnsOperations.getSupportedRecordTypes(client, {});
    
    return {
      content: [{
        type: 'text',
        text: `Supported record types: ${types.join(', ')}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get record types: ${String(error)}`);
  }
}

/**
 * From dns-dnssec-operations.ts - Enable DNSSEC
 */
export async function enableDNSSEC(
  client: AkamaiClient,
  args: {
    zone: string;
    algorithm?: string;
    nsec3?: boolean;
    salt?: string;
    iterations?: number;
  }
): Promise<MCPToolResponse> {
  try {
    await dnsOperations.enableDNSSEC(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully enabled DNSSEC for zone: ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to enable DNSSEC: ${String(error)}`);
  }
}

/**
 * From dns-dnssec-operations.ts - Disable DNSSEC
 */
export async function disableDNSSEC(
  client: AkamaiClient,
  args: {
    zone: string;
    force?: boolean;
  }
): Promise<MCPToolResponse> {
  try {
    await dnsOperations.disableDNSSEC(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully disabled DNSSEC for zone: ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to disable DNSSEC: ${String(error)}`);
  }
}

/**
 * From dns-dnssec-operations.ts - Get DNSSEC keys
 */
export async function getDNSSECKeys(
  client: AkamaiClient,
  args: { zone: string }
): Promise<MCPToolResponse> {
  try {
    const status = await dnsOperations.getDNSSECStatus(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `DNSSEC status for ${args.zone}: ${status.enabled ? 'Enabled' : 'Disabled'}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get DNSSEC keys: ${String(error)}`);
  }
}

/**
 * From dns-dnssec-operations.ts - Rotate DNSSEC keys
 */
export async function rotateDNSSECKeys(
  client: AkamaiClient,
  args: {
    zone: string;
    keyType: 'KSK' | 'ZSK' | 'BOTH';
    algorithm?: string;
  }
): Promise<MCPToolResponse> {
  try {
    await dnsOperations.rotateDNSSECKeys(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully initiated key rotation for zone: ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to rotate DNSSEC keys: ${String(error)}`);
  }
}

/**
 * From dns-migration-tools.ts - Import zone via AXFR
 */
export async function importZoneViaAXFR(
  client: AkamaiClient,
  args: {
    zone: string;
    masterServer: string;
    tsigKey?: {
      name: string;
      algorithm: string;
      secret: string;
    };
    contractId?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await dnsOperations.importZoneViaAXFR(client, {
      zone: args.zone,
      masterServer: args.masterServer,
      tsigKey: args.tsigKey,
      contractId: args.contractId,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Zone import ${result.success ? 'successful' : 'failed'}: ${result.recordsMigrated} records migrated`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to import zone via AXFR: ${String(error)}`);
  }
}

/**
 * From dns-migration-tools.ts - Parse zone file
 */
export async function parseZoneFile(
  client: AkamaiClient,
  args: {
    zoneContent: string;
    targetZone: string;
    contractId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await dnsOperations.parseZoneFile(client, {
      zone: args.targetZone,
      zoneFileContent: args.zoneContent,
      contractId: args.contractId,
      createZone: true,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Zone file import ${result.success ? 'successful' : 'failed'}: ${result.recordsMigrated} records migrated`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to parse zone file: ${String(error)}`);
  }
}

/**
 * From dns-migration-tools.ts - Bulk import records
 */
export async function bulkImportRecords(
  client: AkamaiClient,
  args: {
    zone: string;
    records: Array<{
      name: string;
      type: string;
      ttl: number;
      rdata: string[];
    }>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const result = await dnsOperations.bulkImportRecords(client, {
      zone: args.zone,
      records: args.records as any,
      customer: args.customer,
    });
    
    return {
      content: [{
        type: 'text',
        text: `Bulk import ${result.success ? 'successful' : 'failed'}: ${result.recordsMigrated} records migrated`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to bulk import records: ${String(error)}`);
  }
}

/**
 * From dns-advanced-tools.ts - Get zone contract
 */
export async function getZoneContract(
  client: AkamaiClient,
  args: { zone: string }
): Promise<MCPToolResponse> {
  try {
    // Get zone details to extract contract info
    const zone = await dnsOperations.getZone(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Zone contract information for ${args.zone}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get zone contract: ${String(error)}`);
  }
}

/**
 * From dns-advanced-tools.ts - Get zone version
 */
export async function getZoneVersion(
  client: AkamaiClient,
  args: { zone: string; versionId: string }
): Promise<MCPToolResponse> {
  try {
    const version = await dnsOperations.getZoneVersion(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Zone version ${version.versionId}: ${version.recordSetCount} records`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to get zone version: ${String(error)}`);
  }
}

/**
 * From dns-advanced-tools.ts - List TSIG keys
 */
export async function listTSIGKeys(
  client: AkamaiClient,
  _args: {} = {}
): Promise<MCPToolResponse> {
  try {
    const keys = await dnsOperations.listTSIGKeys(client, {});
    
    return {
      content: [{
        type: 'text',
        text: `Found ${keys.length} TSIG keys`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to list TSIG keys: ${String(error)}`);
  }
}

/**
 * From dns-advanced-tools.ts - Create TSIG key
 */
export async function createTSIGKey(
  client: AkamaiClient,
  args: {
    keyName: string;
    algorithm: string;
    secret?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const key = await dnsOperations.createTSIGKey(client, args);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully created TSIG key: ${key.name}`,
      }],
    };
  } catch (error) {
    throw new Error(`Failed to create TSIG key: ${String(error)}`);
  }
}

/**
 * Export compatibility layer
 */
export const dnsCompatibility = {
  // Zone operations
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
  
  // Changelist operations
  listChangelists,
  searchChangelists,
  getChangelistDiff,
  
  // Administrative operations
  getAuthoritativeNameservers,
  listDNSContracts,
  getSupportedRecordTypes,
  
  // DNSSEC operations
  enableDNSSEC,
  disableDNSSEC,
  getDNSSECKeys,
  rotateDNSSECKeys,
  
  // Migration operations
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  
  // Advanced operations
  getZoneContract,
  getZoneVersion,
  listTSIGKeys,
  createTSIGKey,
};