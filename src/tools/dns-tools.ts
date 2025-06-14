/**
 * Edge DNS API tools for zone and record management
 * Implements Akamai Edge DNS API v2 with change-list workflow
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { Spinner, format, icons } from '../utils/progress.js';

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
  const spinner = new Spinner();
  spinner.start('Fetching DNS zones...');
  
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

    spinner.stop();

    if (!response.zones || response.zones.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `${icons.info} No DNS zones found`
        }]
      };
    }

    const zonesList = response.zones.map(zone => 
      `${icons.dns} ${format.cyan(zone.zone)} (${format.green(zone.type)})${zone.comment ? ` - ${format.dim(zone.comment)}` : ''}`
    ).join('\n');

    return {
      content: [{
        type: 'text',
        text: `${icons.success} Found ${format.bold(response.zones.length.toString())} DNS zones:\n\n${zonesList}`
      }]
    };
  } catch (error) {
    spinner.fail('Failed to fetch DNS zones');
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
  const spinner = new Spinner();
  spinner.start(`Creating ${args.type} zone: ${args.zone}`);
  
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

    spinner.succeed(`Zone created: ${args.zone}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} Successfully created DNS zone: ${format.cyan(args.zone)} (Type: ${format.green(args.type)})`
      }]
    };
  } catch (error) {
    spinner.fail(`Failed to create zone: ${args.zone}`);
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
 * Get existing changelist for a zone
 */
export async function getChangeList(
  client: AkamaiClient,
  zone: string
): Promise<ChangeList | null> {
  try {
    const response = await client.request({
      path: `/config-dns/v2/changelists/${zone}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }) as ChangeList;
    return response;
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Submit an existing changelist
 */
export async function submitChangeList(
  client: AkamaiClient,
  zone: string,
  comment?: string
): Promise<ZoneSubmitResponse> {
  const response = await client.request({
    path: `/config-dns/v2/changelists/${zone}/submit`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: {
      comment: comment || `Submitting pending changes for ${zone}`
    }
  }) as ZoneSubmitResponse;
  return response;
}

/**
 * Discard an existing changelist
 */
export async function discardChangeList(
  client: AkamaiClient,
  zone: string
): Promise<void> {
  await client.request({
    path: `/config-dns/v2/changelists/${zone}`,
    method: 'DELETE',
    headers: {
      'Accept': 'application/json'
    }
  });
}

/**
 * Helper function to ensure a clean change list for a zone
 * This will check for an existing change list and handle it gracefully.
 */
export async function ensureCleanChangeList(
  client: AkamaiClient,
  zone: string,
  spinner?: Spinner,
  force?: boolean
): Promise<void> {
  // Check for existing change list
  if (spinner) spinner.update('Checking for existing change list...');
  
  const existingChangeList = await getChangeList(client, zone);
  
  if (existingChangeList) {
    // Stop spinner to show interactive message
    if (spinner) spinner.stop();
    
    // Format pending changes
    const pendingChanges: string[] = [];
    if (existingChangeList.recordSets && existingChangeList.recordSets.length > 0) {
      existingChangeList.recordSets.forEach(record => {
        pendingChanges.push(`  • ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}`);
      });
    }
    
    if (!force) {
      // Show error with details about existing changelist
      const errorMessage = [
        `${icons.warning} A changelist already exists for zone ${format.cyan(zone)}`,
        '',
        `${icons.info} Last modified by: ${format.dim(existingChangeList.lastModifiedBy)}`,
        `${icons.info} Last modified: ${format.dim(existingChangeList.lastModifiedDate)}`,
        '',
        pendingChanges.length > 0 ? `${icons.list} Pending changes:` : `${icons.info} No pending changes in the changelist`,
        ...pendingChanges.slice(0, 10),
        pendingChanges.length > 10 ? `  ... and ${pendingChanges.length - 10} more changes` : '',
        '',
        `${icons.question} What would you like to do?`,
        '',
        '1. Submit the existing changelist',
        '2. Discard the existing changelist and continue',
        '3. Cancel the operation',
        '',
        `To force discard without asking, use the force option`
      ].filter(line => line !== '').join('\n');
      
      throw new Error(errorMessage);
    }
    
    // Force mode - discard existing changelist
    if (spinner) {
      spinner.start('Discarding existing change list...');
    }
    await discardChangeList(client, zone);
  }
  
  // Create a new change list
  if (spinner) spinner.update('Creating change list...');
  await client.request({
    path: `/config-dns/v2/changelists`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    queryParams: { zone }
  });
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
    force?: boolean;
  }
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  
  try {
    // Step 1: Ensure we have a clean change list
    spinner.start('Preparing DNS changes...');
    await ensureCleanChangeList(client, args.zone, spinner, args.force);

    // Step 2: Add/update the record in the change list
    spinner.update(`Adding ${args.type} record for ${args.name}...`);
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
    spinner.update('Submitting changes...');
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

    spinner.succeed(`Record updated: ${args.name} ${args.type}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} Successfully updated DNS record:\n${icons.dns} ${format.cyan(args.name)} ${format.dim(args.ttl.toString())} ${format.green(args.type)} ${format.yellow(args.rdata.join(' '))}\n\n${icons.info} Request ID: ${format.dim(submitResponse.requestId)}`
      }]
    };
  } catch (error) {
    spinner.fail('Failed to update DNS record');
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
    force?: boolean;
  }
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  
  try {
    // Step 1: Ensure we have a clean change list
    spinner.start('Preparing DNS changes...');
    await ensureCleanChangeList(client, args.zone, spinner, args.force);

    // Step 2: Delete the record from the change list
    spinner.update(`Deleting ${args.type} record for ${args.name}...`);
    await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/recordsets/${args.name}/${args.type}`,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Step 3: Submit the change list
    spinner.update('Submitting changes...');
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

    spinner.succeed(`Record deleted: ${args.name} ${args.type}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} Successfully deleted DNS record:\n${icons.dns} ${format.cyan(args.name)} ${format.green(args.type)}\n\n${icons.info} Request ID: ${format.dim(submitResponse.requestId)}`
      }]
    };
  } catch (error) {
    spinner.fail('Failed to delete DNS record');
    console.error('Error deleting DNS record:', error);
    throw error;
  }
}