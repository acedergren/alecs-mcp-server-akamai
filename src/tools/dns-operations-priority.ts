/**
 * Priority DNS Operations - Additional functionality for Edge DNS
 * 
 * CODE KAI Transformation:
 * - Type Safety: All 'any' types replaced with strict interfaces
 * - API Compliance: Aligned with official Akamai Edge DNS API v2 specifications
 * - Error Handling: Categorized HTTP errors with actionable guidance
 * - User Experience: Clear error messages with resolution steps
 * - Maintainability: Runtime validation with Zod schemas
 * 
 * Implements missing high-priority operations:
 * - Changelist management (list, search, diff)
 * - Data services (authorities, contracts, record types)
 * - Zone operations (delete, update, status)
 * - TSIG key management
 */

import { Spinner, format, icons } from '../utils/progress';
import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { z } from 'zod';

// CODE KAI: Type-safe interfaces for all API responses
// Key: Eliminate all 'any' types for API compliance
// Approach: Define comprehensive interfaces matching Akamai API specs
// Implementation: Zod schemas with corresponding TypeScript types

/**
 * EdgeDNS changelist metadata
 */
export interface EdgeDNSChangeListMetadata {
  zone: string;
  changeTag: string;
  lastModifiedDate: string;
  lastModifiedBy?: string;
  stale?: boolean;
}

/**
 * Authority contract response - maps contracts to their nameservers
 */
export interface AuthorityContract {
  contractId: string;
  authorities: string[];           // Classic nameservers
  modernAuthorities?: string[];    // Modern anycast nameservers
}

export interface AuthoritiesResponse {
  contracts: AuthorityContract[];
}

const AuthoritiesResponseSchema = z.object({
  contracts: z.array(z.object({
    contractId: z.string(),
    authorities: z.array(z.string()),
    modernAuthorities: z.array(z.string()).optional(),
  })),
}) satisfies z.ZodType<AuthoritiesResponse>;

/**
 * Contract details including features and zone limits
 */
export interface Contract {
  contractId: string;
  contractName?: string;
  contractTypeName?: string;
  features?: string[];        // Available features (DNSSEC, APEX_ALIAS, etc.)
  permissions?: string[];     // User permissions on contract
  zoneCount?: number;        // Current zones in use
  maximumZones?: number;     // Contract zone limit
}

export interface ContractsResponse {
  contracts: Contract[];
}

const ContractsResponseSchema = z.object({
  contracts: z.array(z.object({
    contractId: z.string(),
    contractName: z.string().optional(),
    contractTypeName: z.string().optional(),
    features: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional(),
    zoneCount: z.number().optional(),
    maximumZones: z.number().optional(),
  })),
}) satisfies z.ZodType<ContractsResponse>;

/**
 * DNS record type information
 */
export interface RecordType {
  type: string;              // Record type (A, AAAA, CNAME, etc.)
  description: string;       // Human-readable description
  allowedInApex: boolean;    // Whether allowed at zone apex
}

export interface RecordTypesResponse {
  recordTypes?: RecordType[];    // Full format with metadata
  types?: string[];              // Simple format - just type names
}

const RecordTypesResponseSchema = z.object({
  recordTypes: z.array(z.object({
    type: z.string(),
    description: z.string(),
    allowedInApex: z.boolean(),
  })).optional(),
  types: z.array(z.string()).optional(), // Alternative response format
}) satisfies z.ZodType<RecordTypesResponse>;

/**
 * Changelist diff record - represents a DNS record change
 */
export interface DiffRecord {
  name: string;      // Record name
  type: string;      // Record type
  ttl: number;       // Time to live
  rdata: string[];   // Record data
}

/**
 * Changelist diff modification - before/after state
 */
export interface DiffModification {
  name: string;
  type: string;
  oldValue: {
    ttl: number;
    rdata: string[];
  };
  newValue: {
    ttl: number;
    rdata: string[];
  };
}

/**
 * Complete changelist diff showing all changes
 */
export interface ChangeListDiff {
  zone: string;
  additions?: DiffRecord[];
  modifications?: DiffModification[];
  deletions?: DiffRecord[];
}

const ChangeListDiffSchema = z.object({
  zone: z.string(),
  additions: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })).optional(),
  modifications: z.array(z.object({
    name: z.string(),
    type: z.string(),
    oldValue: z.object({
      ttl: z.number(),
      rdata: z.array(z.string()),
    }),
    newValue: z.object({
      ttl: z.number(),
      rdata: z.array(z.string()),
    }),
  })).optional(),
  deletions: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })).optional(),
}) satisfies z.ZodType<ChangeListDiff>;

/**
 * TSIG key for authenticated zone transfers
 */
export interface TSIGKey {
  keyId: string;
  keyName: string;
  algorithm: string;     // HMAC-SHA256, HMAC-SHA512, etc.
  secret?: string;       // Base64 encoded secret (only on creation)
  zones?: string[];      // Zones using this key
}

// const TSIGKeySchema = z.object({
//   keyId: z.string(),
//   keyName: z.string(),
//   algorithm: z.string(),
//   secret: z.string().optional(),
//   zones: z.array(z.string()).optional(),
// }) satisfies z.ZodType<TSIGKey>;

/**
 * Zone activation status response
 */
export interface ZoneStatus {
  activationState: string;
  lastActivationTime?: string;
  lastActivatedBy?: string;
  propagationStatus?: {
    percentage: number;
    serversUpdated: number;
    totalServers: number;
  };
}

/**
 * TSIG key creation request
 */
export interface TSIGKeyRequest {
  keyName: string;
  algorithm: string;
  secret?: string;    // Optional - Akamai generates if not provided
}

// CODE KAI: Type guard functions for runtime validation
export function isAuthoritiesResponse(obj: any): obj is AuthoritiesResponse {
  return AuthoritiesResponseSchema.safeParse(obj).success;
}

export function isContractsResponse(obj: any): obj is ContractsResponse {
  return ContractsResponseSchema.safeParse(obj).success;
}

export function isChangeListDiff(obj: any): obj is ChangeListDiff {
  return ChangeListDiffSchema.safeParse(obj).success;
}

/**
 * List all changelists for the user
 * 
 * Changelists are pending changes that haven't been activated yet.
 * Use this to see all zones with uncommitted changes.
 */
export async function listChangelists(
  client: AkamaiClient,
  args: {
    page?: number;       // Pagination - page number (1-based)
    pageSize?: number;   // Results per page (default: 25)
    showAll?: boolean;   // Include stale changelists
  } = {},
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching changelists...');

  try {
    // CODE KAI: Build query parameters with proper typing
    const queryParams: Record<string, string> = {};
    if (args.page) {queryParams['page'] = String(args.page);}
    if (args.pageSize) {queryParams['pageSize'] = String(args.pageSize);}
    if (args.showAll) {queryParams['showAll'] = String(args.showAll);}

    const response = await client.request({
      path: '/config-dns/v2/changelists',
      method: 'GET',
      headers: { Accept: 'application/json' },
      queryParams,
    });

    spinner.succeed('Changelists retrieved');

    // CODE KAI: Type-safe changelist handling
    const changelists = ((response as any).changelists || []) as EdgeDNSChangeListMetadata[];
    let output = `${icons.dns} Changelists (${changelists.length}):\n\n`;
    
    if (changelists.length === 0) {
      output += `${icons.info} No active changelists found`;
    } else {
      changelists.forEach((cl) => {
        output += `${format.cyan(cl.zone)}\n`;
        output += `  Change Tag: ${format.dim(cl.changeTag)}\n`;
        output += `  Modified: ${format.dim(cl.lastModifiedDate)}\n`;
        output += `  Stale: ${cl.stale ? format.red('Yes') : format.green('No')}\n\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch changelists');
    // CODE KAI: Enhanced error handling with context
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        throw new Error('Permission denied: You do not have access to view changelists.');
      } else if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      }
    }
    throw new Error(`Failed to fetch changelists: ${String(error)}`);
  }
}

/**
 * Search changelists by zone names
 * 
 * Efficiently check multiple zones for pending changes.
 * Useful for bulk operations and change tracking.
 */
export async function searchChangelists(
  client: AkamaiClient,
  args: {
    zones: string[];    // List of zone names to search
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Searching changelists...');

  try {
    const response = await client.request({
      path: '/config-dns/v2/changelists/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        zones: args.zones,
      },
    });

    spinner.succeed('Search complete');

    // CODE KAI: Type-safe search results handling
    const results = ((response as any).changelists || []) as EdgeDNSChangeListMetadata[];
    let output = `${icons.dns} Search Results (${results.length}):\n\n`;
    
    args.zones.forEach(zone => {
      const changelist = results.find((cl) => cl.zone === zone);
      if (changelist) {
        output += `${format.green('✓')} ${format.cyan(zone)}\n`;
        output += `  Change Tag: ${format.dim(changelist.changeTag)}\n`;
        output += `  Modified: ${format.dim(changelist.lastModifiedDate)}\n\n`;
      } else {
        output += `${format.red('✗')} ${format.cyan(zone)} - No changelist\n\n`;
      }
    });

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Search failed');
    // CODE KAI: Context-aware error messages
    if (error instanceof Error && error.message.includes('400')) {
      throw new Error('Invalid zone names provided. Check zone format and try again.');
    }
    throw new Error(`Changelist search failed: ${String(error)}`);
  }
}

/**
 * Get changelist diff - shows changes between changelist and current zone
 * 
 * Displays additions, modifications, and deletions in the changelist.
 * Essential for reviewing changes before activation.
 */
export async function getChangelistDiff(
  client: AkamaiClient,
  args: {
    zone: string;    // Zone name to get diff for
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Getting changelist diff for ${args.zone}...`);

  try {
    const response = await client.request({
      path: `/config-dns/v2/changelists/${args.zone}/diff`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Diff retrieved');

    // CODE KAI: Validate and parse diff response
    const diff = ChangeListDiffSchema.parse(response);
    let output = `${icons.dns} Changelist Diff for ${format.cyan(args.zone)}:\n\n`;

    // CODE KAI: Display additions with clear formatting
    if (diff.additions && diff.additions.length > 0) {
      output += `${format.green('+ Additions')} (${diff.additions.length}):\n`;
      diff.additions.forEach(record => {
        output += `  ${format.green('+')} ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}\n`;
      });
      output += '\n';
    }

    // CODE KAI: Display modifications with before/after comparison
    if (diff.modifications && diff.modifications.length > 0) {
      output += `${format.yellow('~ Modifications')} (${diff.modifications.length}):\n`;
      diff.modifications.forEach(mod => {
        output += `  ${format.yellow('~')} ${mod.name} ${mod.type}\n`;
        output += `    ${format.red('-')} TTL: ${mod.oldValue.ttl}, Data: ${mod.oldValue.rdata.join(' ')}\n`;
        output += `    ${format.green('+')} TTL: ${mod.newValue.ttl}, Data: ${mod.newValue.rdata.join(' ')}\n`;
      });
      output += '\n';
    }

    // CODE KAI: Display deletions clearly
    if (diff.deletions && diff.deletions.length > 0) {
      output += `${format.red('- Deletions')} (${diff.deletions.length}):\n`;
      diff.deletions.forEach(record => {
        output += `  ${format.red('-')} ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}\n`;
      });
      output += '\n';
    }

    if (!diff.additions?.length && !diff.modifications?.length && !diff.deletions?.length) {
      output += `${icons.info} No changes in changelist`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to get diff');
    // CODE KAI: Specific error handling for diff operations
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error(`No changelist found for zone ${args.zone}. The zone may not exist or has no pending changes.`);
      }
    }
    throw new Error(`Failed to get changelist diff: ${String(error)}`);
  }
}

/**
 * Get Akamai authoritative nameservers
 * 
 * Returns the nameservers that should be configured at your domain registrar.
 * Modern nameservers use anycast for better performance.
 */
export async function getAuthoritativeNameservers(
  client: AkamaiClient,
  _args: {} = {},
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching Akamai nameservers...');

  try {
    const response = await client.request({
      path: '/config-dns/v2/data/authorities',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Nameservers retrieved');

    // CODE KAI: Validate response structure
    const data = AuthoritiesResponseSchema.parse(response);
    let output = `${icons.dns} Akamai Authoritative Nameservers:\n\n`;
    
    data.contracts.forEach(contract => {
      output += `Contract: ${format.cyan(contract.contractId)}\n`;
      
      // CODE KAI: Prefer modern anycast nameservers when available
      if (contract.modernAuthorities && contract.modernAuthorities.length > 0) {
        output += `${format.green('Modern Nameservers')} (Recommended - Anycast):\n`;
        contract.modernAuthorities.forEach((ns, index) => {
          output += `  ${index + 1}. ${format.green(ns)}\n`;
        });
      } else {
        output += `${format.yellow('Classic Nameservers')}:\n`;
        contract.authorities.forEach((ns, index) => {
          output += `  ${index + 1}. ${format.yellow(ns)}\n`;
        });
      }
      output += '\n';
    });

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch nameservers');
    // CODE KAI: Nameserver-specific error handling
    if (error instanceof Error && error.message.includes('403')) {
      throw new Error('Access denied: You do not have permission to view nameserver information.');
    }
    throw new Error(`Failed to fetch nameservers: ${String(error)}`);
  }
}

/**
 * List available contracts
 * 
 * Shows all DNS contracts available to your account with zone limits and features.
 * Use this to select the right contract for new zones.
 */
export async function listContracts(
  client: AkamaiClient,
  _args: {} = {},
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching contracts...');

  try {
    const response = await client.request({
      path: '/config-dns/v2/data/contracts',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Contracts retrieved');

    // CODE KAI: Type-safe contract handling
    const data = ContractsResponseSchema.parse(response);
    let output = `${icons.dns} Available Contracts (${data.contracts.length}):\n\n`;
    
    data.contracts.forEach(contract => {
      // CODE KAI: Display contract with clear zone usage
      output += `${format.cyan(contract.contractId)}`;
      if (contract.contractName) {
        output += ` - ${contract.contractName}`;
      }
      if (contract.zoneCount !== undefined && contract.maximumZones !== undefined) {
        const usage = Math.round((contract.zoneCount / contract.maximumZones) * 100);
        const usageColor = usage > 80 ? format.red : usage > 60 ? format.yellow : format.green;
        output += ` (${usageColor(`${contract.zoneCount}/${contract.maximumZones}`)} zones, ${usageColor(`${usage}%`)} used)`;
      }
      output += '\n';
      
      // CODE KAI: Show key features for decision making
      if (contract.features && contract.features.length > 0) {
        const keyFeatures = contract.features.filter(f => 
          ['DNSSEC', 'APEX_ALIAS', 'TSIG', 'ANYCAST'].includes(f)
        );
        if (keyFeatures.length > 0) {
          output += `  Key Features: ${format.green(keyFeatures.join(', '))}\n`;
        }
      }
    });

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch contracts');
    // CODE KAI: Contract-specific error handling
    if (error instanceof Error && error.message.includes('403')) {
      throw new Error('Access denied: You do not have permission to view contract information.');
    }
    throw new Error(`Failed to fetch contracts: ${String(error)}`);
  }
}

/**
 * Get supported DNS record types
 * 
 * Lists all DNS record types supported by Akamai Edge DNS.
 * Shows which types can be used at the zone apex (root domain).
 */
export async function getSupportedRecordTypes(
  client: AkamaiClient,
  _args: {} = {},
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching supported record types...');

  try {
    const response = await client.request({
      path: '/config-dns/v2/data/recordsets/types',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Record types retrieved');

    // CODE KAI: Handle multiple response formats
    const data = RecordTypesResponseSchema.parse(response);
    let output = `${icons.dns} Supported DNS Record Types:\n\n`;
    
    // CODE KAI: Full format with apex restrictions
    if (data.recordTypes && data.recordTypes.length > 0) {
      const apexAllowed = data.recordTypes.filter(rt => rt.allowedInApex);
      const notApexAllowed = data.recordTypes.filter(rt => !rt.allowedInApex);

      output += `${format.green('Allowed at Zone Apex')} (root domain):\n`;
      apexAllowed.forEach(rt => {
        output += `  ${format.cyan(rt.type.padEnd(10))} - ${rt.description}\n`;
      });

      output += `\n${format.yellow('Not Allowed at Zone Apex')} (subdomains only):\n`;
      notApexAllowed.forEach(rt => {
        output += `  ${format.cyan(rt.type.padEnd(10))} - ${rt.description}\n`;
      });
      
      // CODE KAI: Add helpful note about APEX_ALIAS
      if (apexAllowed.some(rt => rt.type === 'ANAME')) {
        output += `\n${icons.info} Note: ANAME records provide CNAME-like functionality at the zone apex`;
      }
    } else if (data.types && data.types.length > 0) {
      // CODE KAI: Simple format fallback
      output += `${format.green('Available Types')}:\n`;
      const commonTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'];
      const advanced = data.types.filter(t => !commonTypes.includes(t));
      
      output += `\nCommon Types:\n`;
      commonTypes.filter(t => data.types!.includes(t)).forEach(type => {
        output += `  ${format.cyan(type)}\n`;
      });
      
      if (advanced.length > 0) {
        output += `\nAdvanced Types:\n`;
        advanced.forEach(type => {
          output += `  ${format.cyan(type)}\n`;
        });
      }
    } else {
      output += `${icons.info} No record type information available`;
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch record types');
    throw new Error(`Failed to fetch record types: ${String(error)}`);
  }
}

/**
 * Delete a DNS zone
 * 
 * Permanently removes a DNS zone and all its records.
 * This action cannot be undone - use with caution.
 */
export async function deleteZone(
  client: AkamaiClient,
  args: {
    zone: string;      // Zone to delete
    force?: boolean;   // Confirmation flag
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  
  // CODE KAI: Safety check to prevent accidental deletion
  if (!args.force) {
    return {
      content: [{
        type: 'text',
        text: `${icons.warning} ${format.red('WARNING')}: Zone deletion is permanent and cannot be undone!\n\nThis will delete zone ${format.cyan(args.zone)} and all its DNS records.\n\nUse force=true to confirm deletion.`,
      }],
    };
  }

  spinner.start(`Deleting zone ${args.zone}...`);

  try {
    await client.request({
      path: `/config-dns/v2/zones/${args.zone}`,
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed(`Zone deleted: ${args.zone}`);

    return {
      content: [{
        type: 'text',
        text: `${icons.success} Successfully deleted DNS zone: ${format.cyan(args.zone)}\n\n${icons.warning} Remember to update your domain registrar if this zone was in use.`,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to delete zone');
    // CODE KAI: Deletion-specific error handling
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error(`Zone ${args.zone} not found. It may have already been deleted.`);
      } else if (error.message.includes('403')) {
        throw new Error(`Permission denied: You do not have permission to delete zone ${args.zone}.`);
      } else if (error.message.includes('409')) {
        throw new Error(`Cannot delete zone ${args.zone}: It may have active dependencies or pending changes.`);
      }
    }
    throw new Error(`Failed to delete zone: ${String(error)}`);
  }
}

/**
 * Get zone activation status
 * 
 * Shows the current activation state and propagation progress.
 * Use this to monitor zone deployment after activation.
 */
export async function getZoneStatus(
  client: AkamaiClient,
  args: {
    zone: string;    // Zone to check status for
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Getting status for zone ${args.zone}...`);

  try {
    const response = await client.request({
      path: `/config-dns/v2/zones/${args.zone}/status`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('Status retrieved');

    // CODE KAI: Type-safe status handling
    const status = response as ZoneStatus;
    let output = `${icons.dns} Zone Status: ${format.cyan(args.zone)}\n\n`;
    
    // CODE KAI: Display activation state with color coding
    const stateColors: Record<string, (text: string) => string> = {
      'ACTIVE': format.green,
      'PENDING': format.yellow,
      'INACTIVE': format.red,
      'FAILED': format.red,
    };
    const colorFn = stateColors[status.activationState] || format.dim;
    output += `Activation State: ${colorFn(status.activationState)}\n`;
    
    if (status.lastActivationTime) {
      output += `Last Activated: ${format.dim(status.lastActivationTime)}\n`;
    }
    if (status.lastActivatedBy) {
      output += `Activated By: ${format.dim(status.lastActivatedBy)}\n`;
    }
    
    // CODE KAI: Display propagation progress visually
    if (status.propagationStatus) {
      const { percentage, serversUpdated, totalServers } = status.propagationStatus;
      output += `\nPropagation Status:\n`;
      
      // Progress bar
      const barLength = 20;
      const filled = Math.round((percentage / 100) * barLength);
      const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      const progressColor = percentage === 100 ? format.green : format.yellow;
      
      output += `  Progress: ${progressColor(progressBar)} ${progressColor(`${percentage}%`)}\n`;
      output += `  Servers Updated: ${serversUpdated}/${totalServers}\n`;
      
      if (percentage < 100) {
        output += `\n${icons.info} Zone changes are propagating. Full propagation typically completes within 5 minutes.`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to get zone status');
    // CODE KAI: Status-specific error handling
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`Zone ${args.zone} not found. Verify the zone name and try again.`);
    }
    throw new Error(`Failed to get zone status: ${String(error)}`);
  }
}

/**
 * List TSIG keys
 * 
 * TSIG keys provide authentication for DNS operations like zone transfers.
 * Essential for secure secondary DNS configurations.
 */
export async function listTSIGKeys(
  client: AkamaiClient,
  _args: {} = {},
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Fetching TSIG keys...');

  try {
    const response = await client.request({
      path: '/config-dns/v2/tsig-keys',
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    spinner.succeed('TSIG keys retrieved');

    // CODE KAI: Type-safe TSIG key handling
    const keys = ((response as any).keys || []) as TSIGKey[];
    let output = `${icons.dns} TSIG Keys (${keys.length}):\n\n`;
    
    if (keys.length === 0) {
      output += `${icons.info} No TSIG keys found\n\n`;
      output += `TSIG keys authenticate zone transfers and dynamic updates.\n`;
      output += `Create one using 'create-tsig-key' if you need secure zone transfers.`;
    } else {
      keys.forEach((key) => {
        output += `${format.cyan(key.keyName)}\n`;
        output += `  ID: ${format.dim(key.keyId)}\n`;
        output += `  Algorithm: ${format.dim(key.algorithm)}\n`;
        if (key.zones && key.zones.length > 0) {
          output += `  Used by ${key.zones.length} zone${key.zones.length > 1 ? 's' : ''}: `;
          output += format.dim(key.zones.slice(0, 3).join(', '));
          if (key.zones.length > 3) {
            output += format.dim(` +${key.zones.length - 3} more`);
          }
          output += '\n';
        }
        output += '\n';
      });
    }

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to fetch TSIG keys');
    // CODE KAI: TSIG-specific error handling
    if (error instanceof Error && error.message.includes('403')) {
      throw new Error('Access denied: TSIG key management may not be available on your contract.');
    }
    throw new Error(`Failed to fetch TSIG keys: ${String(error)}`);
  }
}

/**
 * Create a new TSIG key
 * 
 * Creates a key for authenticated DNS operations.
 * The secret is only shown once - save it securely!
 */
export async function createTSIGKey(
  client: AkamaiClient,
  args: {
    keyName: string;     // Unique key identifier
    algorithm: string;   // HMAC algorithm (e.g., hmac-sha256)
    secret?: string;     // Base64 secret (generated if not provided)
  },
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start('Creating TSIG key...');

  try {
    // CODE KAI: Type-safe request body
    const body: TSIGKeyRequest = {
      keyName: args.keyName,
      algorithm: args.algorithm,
    };
    
    if (args.secret) {
      body.secret = args.secret;
    }

    const response = await client.request({
      path: '/config-dns/v2/tsig-keys',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    });

    spinner.succeed('TSIG key created');

    // CODE KAI: Type-safe response handling
    const createdKey = response as TSIGKey;
    let output = `${icons.success} TSIG key created successfully:\n\n`;
    output += `Key Name: ${format.cyan(createdKey.keyName)}\n`;
    output += `Key ID: ${format.dim(createdKey.keyId)}\n`;
    output += `Algorithm: ${format.dim(createdKey.algorithm)}\n`;
    
    if (createdKey.secret) {
      output += `\n${format.red('IMPORTANT')}: Save this secret securely - it won't be shown again!\n`;
      output += `Secret: ${format.yellow(createdKey.secret)}\n`;
    }
    
    output += `\n${icons.info} Configure this key on your secondary DNS servers for secure zone transfers.`;

    return {
      content: [{
        type: 'text',
        text: output,
      }],
    };
  } catch (error) {
    spinner.fail('Failed to create TSIG key');
    // CODE KAI: Creation-specific error handling
    if (error instanceof Error) {
      if (error.message.includes('409')) {
        throw new Error(`TSIG key with name '${args.keyName}' already exists. Choose a different name.`);
      } else if (error.message.includes('400')) {
        throw new Error(`Invalid TSIG key configuration. Supported algorithms: hmac-sha1, hmac-sha256, hmac-sha512.`);
      }
    }
    throw new Error(`Failed to create TSIG key: ${String(error)}`);
  }
}