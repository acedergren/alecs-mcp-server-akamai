/**
 * Edge DNS API tools for zone and record management
 * Implements Akamai Edge DNS API v2 with change-list workflow
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';

// DNS API Types
export interface DNSZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  comment?: string;
  signAndServe?: boolean;
  signAndServeAlgorithm?: string;
  masters?: string[];
  tsigKey?: {
    name: string;
    algorithm: string;
    secret: string;
  };
}

export interface DNSZoneList {
  zones: DNSZone[];
}

export interface DNSRecordSet {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

export interface ChangeList {
  zone: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  recordSets: DNSRecordSet[];
}

export interface ZoneSubmitResponse {
  requestId: string;
  expiryDate: string;
}

/**
 * List all DNS zones
 */
export async function listZones(
  client: AkamaiClient,
  args: { contractIds?: string[]; includeAliases?: boolean; search?: string }
): Promise<MCPToolResponse> {
  try {
    const queryParams: any = {};
    
    if (args.contractIds?.length) {
      queryParams.contractIds = args.contractIds.join(',');
    }
    if (args.includeAliases !== undefined) {
      queryParams.includeAliases = args.includeAliases;
    }
    if (args.search) {
      queryParams.search = args.search;
    }

    const response = await client.request({
      path: '/config-dns/v2/zones',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      queryParams
    }) as DNSZoneList;

    if (!response.zones || response.zones.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No DNS zones found'
        }]
      };
    }

    const zonesList = response.zones.map(zone => 
      `• ${zone.zone} (${zone.type})${zone.comment ? ` - ${zone.comment}` : ''}`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${response.zones.length} DNS zones:\n\n${zonesList}`
      }]
    };
  } catch (error) {
    console.error('Error listing DNS zones:', error);
    throw error;
  }
}

/**
 * Get DNS zone details
 */
export async function getZone(
  client: AkamaiClient,
  args: { zone: string }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }) as DNSZone;

    let details = `DNS Zone: ${response.zone}\n`;
    details += `Type: ${response.type}\n`;
    
    if (response.comment) {
      details += `Comment: ${response.comment}\n`;
    }
    if (response.signAndServe !== undefined) {
      details += `DNSSEC: ${response.signAndServe ? 'Enabled' : 'Disabled'}\n`;
    }
    if (response.type === 'SECONDARY' && response.masters) {
      details += `Master servers: ${response.masters.join(', ')}\n`;
    }

    return {
      content: [{
        type: 'text',
        text: details
      }]
    };
  } catch (error) {
    console.error('Error getting DNS zone:', error);
    throw error;
  }
}

/**
 * Create a DNS zone
 */
export async function createZone(
  client: AkamaiClient,
  args: { 
    zone: string;
    type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
    comment?: string;
    contractId?: string;
    groupId?: string;
    masters?: string[];
    target?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const body: any = {
      zone: args.zone,
      type: args.type,
      comment: args.comment
    };

    // Add type-specific fields
    if (args.type === 'SECONDARY' && args.masters) {
      body.masters = args.masters;
    }
    if (args.type === 'ALIAS' && args.target) {
      body.target = args.target;
    }

    const queryParams: any = {};
    if (args.contractId) queryParams.contractId = args.contractId;
    if (args.groupId) queryParams.gid = args.groupId;

    await client.request({
      path: '/config-dns/v2/zones',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body,
      queryParams
    });

    return {
      content: [{
        type: 'text',
        text: `Successfully created DNS zone: ${args.zone} (Type: ${args.type})`
      }]
    };
  } catch (error) {
    console.error('Error creating DNS zone:', error);
    throw error;
  }
}

/**
 * List DNS records for a zone
 */
export async function listRecords(
  client: AkamaiClient,
  args: { zone: string; search?: string; types?: string[] }
): Promise<MCPToolResponse> {
  try {
    const queryParams: any = {};
    if (args.search) queryParams.search = args.search;
    if (args.types?.length) queryParams.types = args.types.join(',');

    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/recordsets`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      queryParams
    }) as { recordsets: DNSRecordSet[] };

    if (!response.recordsets || response.recordsets.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No DNS records found for zone: ${args.zone}`
        }]
      };
    }

    const recordsList = response.recordsets.map(record => {
      const rdataStr = record.rdata.join(', ');
      return `• ${record.name} ${record.ttl} ${record.type} ${rdataStr}`;
    }).join('\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${response.recordsets.length} DNS records in zone ${args.zone}:\n\n${recordsList}`
      }]
    };
  } catch (error) {
    console.error('Error listing DNS records:', error);
    throw error;
  }
}

/**
 * Create or update a DNS record using change list workflow
 */
export async function upsertRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    ttl: number;
    rdata: string[];
    comment?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Step 1: Create a change list
    await client.request({
      path: `/config-dns/v2/changelists`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      queryParams: { zone: args.zone }
    });

    // Step 2: Add/update the record in the change list
    const recordData = {
      name: args.name,
      type: args.type,
      ttl: args.ttl,
      rdata: args.rdata
    };

    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/${args.name}/${args.type}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: recordData
    });

    // Step 3: Submit the change list
    const submitResponse = await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        comment: args.comment || `Updated ${args.type} record for ${args.name}`
      }
    }) as ZoneSubmitResponse;

    return {
      content: [{
        type: 'text',
        text: `Successfully updated DNS record:\n${args.name} ${args.ttl} ${args.type} ${args.rdata.join(' ')}\n\nRequest ID: ${submitResponse.requestId}`
      }]
    };
  } catch (error) {
    console.error('Error updating DNS record:', error);
    throw error;
  }
}

/**
 * Delete a DNS record using change list workflow
 */
export async function deleteRecord(
  client: AkamaiClient,
  args: {
    zone: string;
    name: string;
    type: string;
    comment?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Step 1: Create a change list
    await client.request({
      path: `/config-dns/v2/changelists`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      queryParams: { zone: args.zone }
    });

    // Step 2: Delete the record from the change list
    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/${args.name}/${args.type}`,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Step 3: Submit the change list
    const submitResponse = await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        comment: args.comment || `Deleted ${args.type} record for ${args.name}`
      }
    }) as ZoneSubmitResponse;

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted DNS record: ${args.name} (${args.type})\n\nRequest ID: ${submitResponse.requestId}`
      }]
    };
  } catch (error) {
    console.error('Error deleting DNS record:', error);
    throw error;
  }
}