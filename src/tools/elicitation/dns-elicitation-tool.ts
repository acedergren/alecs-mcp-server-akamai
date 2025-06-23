/**
 * DNS Elicitation Tool
 * 
 * A guided, user-friendly tool for DNS record management that:
 * - Asks clear questions to guide users through the process
 * - Explains what's happening at each stage
 * - Handles pending activation states gracefully
 * - Provides helpful status updates and next steps
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAkamaiClient } from '@utils/auth';
import { logger } from '@utils/logger';
import { Spinner, format, icons } from '@utils/progress';
import type { AkamaiClient } from '../../akamai-client';
import type { MCPToolResponse } from '../../types';
import {
  getChangeList,
  ensureCleanChangeList,
  submitChangeList,
  waitForZoneActivation,
  listRecords,
  upsertRecord,
  deleteRecord,
  type DNSRecordSet,
  type ZoneActivationStatus,
} from '../dns-tools';

// DNS operation types
const DNSOperationType = z.enum([
  'create',
  'update',
  'delete',
  'list',
  'check-status',
  'help',
]);

// Record types commonly used
const CommonRecordTypes = z.enum([
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SRV',
  'CAA',
  'PTR',
]);

// Input schema for the elicitation tool
const DNSElicitationSchema = z.object({
  operation: DNSOperationType.optional(),
  zone: z.string().optional(),
  recordName: z.string().optional(),
  recordType: CommonRecordTypes.optional(),
  recordValue: z.union([z.string(), z.array(z.string())]).optional(),
  ttl: z.number().optional(),
  priority: z.number().optional(), // For MX records
  weight: z.number().optional(), // For SRV records
  port: z.number().optional(), // For SRV records
  confirmAction: z.boolean().optional(),
  customer: z.string().optional(),
});

type DNSElicitationInput = z.infer<typeof DNSElicitationSchema>;

// Helper to format record data based on type
function formatRecordData(
  type: string,
  value: string | string[],
  priority?: number,
  weight?: number,
  port?: number,
): string[] {
  const values = Array.isArray(value) ? value : [value];
  
  switch (type) {
    case 'MX':
      return values.map(v => `${priority || 10} ${v}`);
    case 'SRV':
      return values.map(v => `${priority || 0} ${weight || 0} ${port || 0} ${v}`);
    case 'TXT':
      // Ensure TXT records are properly quoted
      return values.map(v => v.startsWith('"') && v.endsWith('"') ? v : `"${v}"`);
    default:
      return values;
  }
}

// Helper to provide user-friendly explanations
function getOperationExplanation(operation: string): string {
  switch (operation) {
    case 'create':
      return 'Creating a new DNS record will add a new entry to your zone. This is commonly used for adding subdomains, email configuration, or verification records.';
    case 'update':
      return 'Updating a DNS record will modify an existing entry. This is useful when changing IP addresses, updating email servers, or modifying other DNS settings.';
    case 'delete':
      return 'Deleting a DNS record will remove it from your zone. Be careful - this can affect services that depend on this record.';
    case 'list':
      return 'Listing DNS records shows all current entries in your zone. This helps you understand your current DNS configuration.';
    case 'check-status':
      return 'Checking the status shows if there are pending DNS changes waiting to be activated and the current activation state of your zone.';
    default:
      return '';
  }
}

// Helper to provide record type explanations
function getRecordTypeExplanation(type: string): string {
  switch (type) {
    case 'A':
      return 'A records point a domain to an IPv4 address (e.g., 192.0.2.1)';
    case 'AAAA':
      return 'AAAA records point a domain to an IPv6 address (e.g., 2001:db8::1)';
    case 'CNAME':
      return 'CNAME records create an alias pointing to another domain name';
    case 'MX':
      return 'MX records specify mail servers for email delivery (requires priority value)';
    case 'TXT':
      return 'TXT records store text data, often used for verification or email security (SPF, DKIM)';
    case 'NS':
      return 'NS records delegate a subdomain to different name servers';
    case 'SRV':
      return 'SRV records specify services available at specific ports (requires priority, weight, and port)';
    case 'CAA':
      return 'CAA records control which certificate authorities can issue SSL certificates';
    case 'PTR':
      return 'PTR records provide reverse DNS lookup (IP to domain name)';
    default:
      return '';
  }
}

// Helper to validate zone format
function validateZoneFormat(zone: string): { valid: boolean; message?: string } {
  if (!zone.includes('.')) {
    return { 
      valid: false, 
      message: 'Zone should be a domain name (e.g., example.com)' 
    };
  }
  
  if (zone.startsWith('.') || zone.endsWith('.')) {
    return { 
      valid: false, 
      message: 'Zone should not start or end with a dot' 
    };
  }
  
  return { valid: true };
}

// Main handler
async function handleDNSElicitation(
  client: AkamaiClient,
  params: DNSElicitationInput,
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  
  try {
    // If no operation specified, provide help
    if (!params.operation || params.operation === 'help') {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.info} DNS Record Management - Interactive Guide\n\n` +
              `Available operations:\n` +
              `  • ${format.cyan('create')} - Add a new DNS record\n` +
              `  • ${format.cyan('update')} - Modify an existing DNS record\n` +
              `  • ${format.cyan('delete')} - Remove a DNS record\n` +
              `  • ${format.cyan('list')} - View all records in a zone\n` +
              `  • ${format.cyan('check-status')} - Check pending changes and activation status\n\n` +
              `To get started, specify an operation and I'll guide you through the process.\n` +
              `Example: { "operation": "create" }`,
          },
        ],
      };
    }
    
    // Provide operation-specific guidance
    const explanation = getOperationExplanation(params.operation);
    
    // Check if zone is provided
    if (!params.zone) {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.question} ${explanation}\n\n` +
              `Please provide the DNS zone (domain) you want to work with.\n` +
              `Example: { "operation": "${params.operation}", "zone": "example.com" }`,
          },
        ],
      };
    }
    
    // Validate zone format
    const zoneValidation = validateZoneFormat(params.zone);
    if (!zoneValidation.valid) {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.error} Invalid zone format: ${zoneValidation.message}\n` +
              `Please provide a valid domain name like "example.com"`,
          },
        ],
      };
    }
    
    // Handle different operations
    switch (params.operation) {
      case 'list':
        return await handleListRecords(client, params.zone);
        
      case 'check-status':
        return await handleCheckStatus(client, params.zone);
        
      case 'create':
      case 'update':
        return await handleCreateOrUpdateRecord(client, params);
        
      case 'delete':
        return await handleDeleteRecord(client, params);
        
      default:
        return {
          content: [
            {
              type: 'text',
              text: `${icons.error} Unknown operation: ${params.operation}`,
            },
          ],
        };
    }
  } catch (error) {
    spinner.fail('Operation failed');
    
    // Provide user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('changelist already exists')) {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.warning} There are pending DNS changes for this zone.\n\n` +
              `You have a few options:\n` +
              `1. Check the status of pending changes: { "operation": "check-status", "zone": "${params.zone}" }\n` +
              `2. Force create a new change (discards pending): Add "confirmAction": true to your request\n` +
              `3. Wait for the pending changes to be activated\n\n` +
              `${icons.info} DNS changes in Akamai require activation to take effect.`,
          },
        ],
      };
    }
    
    if (errorMessage.includes('404')) {
      return {
        content: [
          {
            type: 'text',
            text: `${icons.error} Zone not found: ${params.zone}\n\n` +
              `Please check that the zone exists and you have access to it.\n` +
              `You may need to create the zone first or check your permissions.`,
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.error} Operation failed: ${errorMessage}\n\n` +
            `${icons.info} If you need help, try: { "operation": "help" }`,
        },
      ],
    };
  }
}

// Handle listing records
async function handleListRecords(
  client: AkamaiClient,
  zone: string,
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Fetching DNS records for ${zone}...`);
  
  try {
    const result = await listRecords(client, { zone });
    spinner.succeed('Records fetched successfully');
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.success} DNS Records for ${format.cyan(zone)}\n\n` +
            result.content[0].text + '\n\n' +
            `${icons.info} To modify these records, use:\n` +
            `  • { "operation": "create" } - Add new records\n` +
            `  • { "operation": "update" } - Modify existing records\n` +
            `  • { "operation": "delete" } - Remove records`,
        },
      ],
    };
  } catch (error) {
    spinner.fail('Failed to fetch records');
    throw error;
  }
}

// Handle checking status
async function handleCheckStatus(
  client: AkamaiClient,
  zone: string,
): Promise<MCPToolResponse> {
  const spinner = new Spinner();
  spinner.start(`Checking status for ${zone}...`);
  
  try {
    // Check for pending changes
    const changeList = await getChangeList(client, zone);
    
    // Check activation status
    let activationStatus: ZoneActivationStatus | null = null;
    try {
      activationStatus = await client.request({
        path: `/config-dns/v2/zones/${zone}/status`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      // Status endpoint might not be available for all zones
      logger.debug('Could not fetch activation status', { error });
    }
    
    spinner.succeed('Status check complete');
    
    let statusText = `${icons.info} DNS Zone Status: ${format.cyan(zone)}\n\n`;
    
    // Report on pending changes
    if (changeList && changeList.recordSets && changeList.recordSets.length > 0) {
      statusText += `${icons.warning} Pending Changes Found:\n`;
      statusText += `  Last modified by: ${changeList.lastModifiedBy}\n`;
      statusText += `  Last modified: ${changeList.lastModifiedDate}\n`;
      statusText += `  Number of changes: ${changeList.recordSets.length}\n\n`;
      
      statusText += `${icons.list} Pending record changes:\n`;
      changeList.recordSets.slice(0, 5).forEach((record: DNSRecordSet) => {
        statusText += `  • ${record.name} ${record.ttl} ${record.type} ${record.rdata.join(' ')}\n`;
      });
      
      if (changeList.recordSets.length > 5) {
        statusText += `  ... and ${changeList.recordSets.length - 5} more changes\n`;
      }
      
      statusText += `\n${icons.info} To activate these changes, submit the changelist.\n`;
    } else {
      statusText += `${icons.success} No pending changes\n\n`;
    }
    
    // Report on activation status
    if (activationStatus) {
      statusText += `${icons.info} Activation Status: ${activationStatus.activationState}\n`;
      
      if (activationStatus.propagationStatus) {
        statusText += `  Propagation: ${activationStatus.propagationStatus.percentage}% `;
        statusText += `(${activationStatus.propagationStatus.serversUpdated}/${activationStatus.propagationStatus.totalServers} servers)\n`;
      }
      
      if (activationStatus.lastActivationTime) {
        statusText += `  Last activation: ${activationStatus.lastActivationTime}\n`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
      ],
    };
  } catch (error) {
    spinner.fail('Failed to check status');
    throw error;
  }
}

// Handle creating or updating records
async function handleCreateOrUpdateRecord(
  client: AkamaiClient,
  params: DNSElicitationInput,
): Promise<MCPToolResponse> {
  // Check required fields
  if (!params.recordName) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} What record do you want to ${params.operation}?\n\n` +
            `Please provide the record name:\n` +
            `  • For the root domain, use "@"\n` +
            `  • For subdomains, use the subdomain name (e.g., "www", "mail")\n` +
            `  • For full names, include the domain (e.g., "www.example.com")\n\n` +
            `Example: { "operation": "${params.operation}", "zone": "${params.zone}", "recordName": "www" }`,
        },
      ],
    };
  }
  
  if (!params.recordType) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} What type of DNS record?\n\n` +
            `Common record types:\n` +
            Object.values(CommonRecordTypes.enum).map(type => 
              `  • ${format.cyan(type)} - ${getRecordTypeExplanation(type)}`
            ).join('\n') + '\n\n' +
            `Example: { "operation": "${params.operation}", "zone": "${params.zone}", "recordName": "${params.recordName}", "recordType": "A" }`,
        },
      ],
    };
  }
  
  if (!params.recordValue) {
    const typeExplanation = getRecordTypeExplanation(params.recordType);
    let valueExample = '';
    
    switch (params.recordType) {
      case 'A':
        valueExample = '"192.0.2.1"';
        break;
      case 'AAAA':
        valueExample = '"2001:db8::1"';
        break;
      case 'CNAME':
        valueExample = '"target.example.com"';
        break;
      case 'MX':
        valueExample = '"mail.example.com" (also need priority)';
        break;
      case 'TXT':
        valueExample = '"v=spf1 include:_spf.example.com ~all"';
        break;
      default:
        valueExample = '"your-value-here"';
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} What value for the ${params.recordType} record?\n\n` +
            `${typeExplanation}\n\n` +
            `Example: { ...previous params, "recordValue": ${valueExample} }`,
        },
      ],
    };
  }
  
  // Check for type-specific requirements
  if (params.recordType === 'MX' && params.priority === undefined) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} MX records require a priority value.\n\n` +
            `Priority determines the order mail servers are tried (lower = higher priority).\n` +
            `Common values: 10, 20, 30\n\n` +
            `Example: { ...previous params, "priority": 10 }`,
        },
      ],
    };
  }
  
  if (params.recordType === 'SRV' && (!params.priority || !params.weight || !params.port)) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} SRV records require additional values:\n\n` +
            `  • priority: Order of preference (lower = higher priority)\n` +
            `  • weight: Relative weight for records with same priority\n` +
            `  • port: TCP or UDP port of the service\n\n` +
            `Example: { ...previous params, "priority": 0, "weight": 5, "port": 443 }`,
        },
      ],
    };
  }
  
  // Set default TTL if not provided
  const ttl = params.ttl || 300;
  
  // Confirm action if not already confirmed
  if (!params.confirmAction) {
    const rdata = formatRecordData(
      params.recordType,
      params.recordValue,
      params.priority,
      params.weight,
      params.port,
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Ready to ${params.operation} this DNS record:\n\n` +
            `  Zone: ${format.cyan(params.zone!)}\n` +
            `  Name: ${format.cyan(params.recordName)}\n` +
            `  Type: ${format.green(params.recordType)}\n` +
            `  TTL: ${format.dim(ttl.toString())} seconds\n` +
            `  Value: ${format.yellow(rdata.join(', '))}\n\n` +
            `${icons.warning} This will create a changelist that needs to be activated.\n\n` +
            `Add "confirmAction": true to proceed with this ${params.operation}.`,
        },
      ],
    };
  }
  
  // Perform the operation
  const spinner = new Spinner();
  spinner.start(`${params.operation === 'create' ? 'Creating' : 'Updating'} DNS record...`);
  
  try {
    const rdata = formatRecordData(
      params.recordType,
      params.recordValue,
      params.priority,
      params.weight,
      params.port,
    );
    
    const result = await upsertRecord(client, {
      zone: params.zone!,
      name: params.recordName,
      type: params.recordType,
      ttl,
      rdata,
      comment: `${params.operation === 'create' ? 'Created' : 'Updated'} ${params.recordType} record for ${params.recordName}`,
      force: true, // Force to handle existing changelists
    });
    
    spinner.succeed(`Record ${params.operation}d successfully`);
    
    return {
      content: [
        {
          type: 'text',
          text: result.content[0].text + '\n\n' +
            `${icons.info} Next steps:\n` +
            `1. The record has been added to a changelist\n` +
            `2. The changelist has been automatically submitted for activation\n` +
            `3. DNS propagation typically takes 5-15 minutes\n\n` +
            `To check the status: { "operation": "check-status", "zone": "${params.zone!}" }`,
        },
      ],
    };
  } catch (error) {
    spinner.fail(`Failed to ${params.operation} record`);
    throw error;
  }
}

// Handle deleting records
async function handleDeleteRecord(
  client: AkamaiClient,
  params: DNSElicitationInput,
): Promise<MCPToolResponse> {
  if (!params.recordName) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} Which record do you want to delete?\n\n` +
            `Please provide the record name.\n` +
            `Example: { "operation": "delete", "zone": "${params.zone}", "recordName": "old-subdomain" }`,
        },
      ],
    };
  }
  
  if (!params.recordType) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.question} What type of record to delete?\n\n` +
            `You need to specify the record type (A, AAAA, CNAME, etc.)\n` +
            `Example: { "operation": "delete", "zone": "${params.zone}", "recordName": "${params.recordName}", "recordType": "A" }`,
        },
      ],
    };
  }
  
  if (!params.confirmAction) {
    return {
      content: [
        {
          type: 'text',
          text: `${icons.warning} Confirm record deletion:\n\n` +
            `  Zone: ${format.cyan(params.zone!)}\n` +
            `  Name: ${format.cyan(params.recordName)}\n` +
            `  Type: ${format.green(params.recordType)}\n\n` +
            `${icons.error} This action cannot be undone!\n\n` +
            `Add "confirmAction": true to proceed with deletion.`,
        },
      ],
    };
  }
  
  const spinner = new Spinner();
  spinner.start('Deleting DNS record...');
  
  try {
    const result = await deleteRecord(client, {
      zone: params.zone!,
      name: params.recordName,
      type: params.recordType,
      comment: `Deleted ${params.recordType} record for ${params.recordName}`,
      force: true,
    });
    
    spinner.succeed('Record deleted successfully');
    
    return {
      content: [
        {
          type: 'text',
          text: result.content[0].text + '\n\n' +
            `${icons.info} The record has been marked for deletion.\n` +
            `The change has been submitted and will be activated shortly.\n\n` +
            `To verify: { "operation": "list", "zone": "${params.zone!}" }`,
        },
      ],
    };
  } catch (error) {
    spinner.fail('Failed to delete record');
    throw error;
  }
}

// Tool definition
export const dnsElicitationTool: Tool = {
  name: 'dns-elicitation',
  description: 'Interactive DNS record management with guided questions and clear feedback',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: Object.values(DNSOperationType.enum),
        description: 'The DNS operation to perform',
      },
      zone: {
        type: 'string',
        description: 'The DNS zone (domain) to work with',
      },
      recordName: {
        type: 'string',
        description: 'The record name (use @ for root domain)',
      },
      recordType: {
        type: 'string',
        enum: Object.values(CommonRecordTypes.enum),
        description: 'The DNS record type',
      },
      recordValue: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        description: 'The value(s) for the DNS record',
      },
      ttl: {
        type: 'number',
        description: 'Time to live in seconds (default: 300)',
      },
      priority: {
        type: 'number',
        description: 'Priority for MX/SRV records',
      },
      weight: {
        type: 'number',
        description: 'Weight for SRV records',
      },
      port: {
        type: 'number',
        description: 'Port for SRV records',
      },
      confirmAction: {
        type: 'boolean',
        description: 'Confirm the action (required for create/update/delete)',
      },
      customer: {
        type: 'string',
        description: 'Optional customer identifier for multi-tenant setups',
      },
    },
  },
};

// Export handler
export async function handleDNSElicitationTool(params: DNSElicitationInput): Promise<MCPToolResponse> {
  const client = await getAkamaiClient(params.customer);
  logger.info('DNS elicitation tool request', { params });
  
  return handleDNSElicitation(client, params);
}