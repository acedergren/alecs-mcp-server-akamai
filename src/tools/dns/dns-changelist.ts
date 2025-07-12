/**
 * DNS Changelist Helper Tools
 * 
 * High-level DNS record management tools that use the DNSChangelistService
 * for simplified, atomic DNS operations with automatic changelist handling.
 * 
 * These tools abstract away the complexity of DNS changelist workflows:
 * - Automatic changelist creation and submission
 * - Batch operations for efficiency  
 * - Status tracking and validation
 * - Error recovery and rollback handling
 * - Support for both staging and production networks
 * 
 * Architecture follows CODE KAI principles:
 * - Single responsibility per tool
 * - Type-safe interfaces with runtime validation
 * - Comprehensive error handling with user-friendly messages
 * - No magic numbers or hardcoded values
 */

import { z } from 'zod';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiOperation } from '../common/akamai-operation';
import { DNSChangelistService, type DNSRecordChange, type ChangelistConfig, type ChangelistResult } from '../../services/dns-changelist-service';

/**
 * Tool schema for adding a single DNS record
 */
export const DNSRecordAddSchema = z.object({
  /** Target DNS zone */
  zone: z.string().min(1).describe('DNS zone name (e.g., "example.com")'),
  /** DNS record name */
  name: z.string().min(1).max(253).describe('Record name (e.g., "www", "api.subdomain")'),
  /** DNS record type */
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('DNS record type'),
  /** Record data values */
  rdata: z.array(z.string()).min(1).describe('Record data values (e.g., ["192.168.1.1"] for A records)'),
  /** Time to live in seconds */
  ttl: z.number().min(30).max(86400).default(300).describe('Time to live in seconds (default: 300)'),
  /** Network environment */
  network: z.enum(['STAGING', 'PRODUCTION']).default('STAGING').describe('Network environment for activation'),
  /** Customer context */
  customer: z.string().optional().describe('Customer context (optional)'),
  /** Optional description */
  description: z.string().max(1000).optional().describe('Description of this DNS change'),
  /** Whether to bypass safety checks */
  bypassSafetyChecks: z.boolean().default(false).describe('Whether to bypass safety checks (use with caution)'),
  /** Whether to auto-activate after submission */
  autoActivate: z.boolean().default(true).describe('Whether to automatically activate the changelist')
});

/**
 * Tool schema for updating a DNS record
 */
export const DNSRecordUpdateSchema = z.object({
  /** Target DNS zone */
  zone: z.string().min(1).describe('DNS zone name (e.g., "example.com")'),
  /** DNS record name */
  name: z.string().min(1).max(253).describe('Record name to update'),
  /** DNS record type */
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('DNS record type'),
  /** New record data values */
  rdata: z.array(z.string()).min(1).describe('New record data values'),
  /** Time to live in seconds */
  ttl: z.number().min(30).max(86400).default(300).describe('Time to live in seconds (default: 300)'),
  /** Network environment */
  network: z.enum(['STAGING', 'PRODUCTION']).default('STAGING').describe('Network environment for activation'),
  /** Customer context */
  customer: z.string().optional().describe('Customer context (optional)'),
  /** Optional description */
  description: z.string().max(1000).optional().describe('Description of this DNS change'),
  /** Whether to bypass safety checks */
  bypassSafetyChecks: z.boolean().default(false).describe('Whether to bypass safety checks'),
  /** Whether to auto-activate after submission */
  autoActivate: z.boolean().default(true).describe('Whether to automatically activate the changelist')
});

/**
 * Tool schema for deleting a DNS record
 */
export const DNSRecordDeleteSchema = z.object({
  /** Target DNS zone */
  zone: z.string().min(1).describe('DNS zone name (e.g., "example.com")'),
  /** DNS record name */
  name: z.string().min(1).max(253).describe('Record name to delete'),
  /** DNS record type */
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('DNS record type'),
  /** Network environment */
  network: z.enum(['STAGING', 'PRODUCTION']).default('STAGING').describe('Network environment for activation'),
  /** Customer context */
  customer: z.string().optional().describe('Customer context (optional)'),
  /** Optional description */
  description: z.string().max(1000).optional().describe('Description of this DNS change'),
  /** Whether to bypass safety checks */
  bypassSafetyChecks: z.boolean().default(false).describe('Whether to bypass safety checks'),
  /** Whether to auto-activate after submission */
  autoActivate: z.boolean().default(true).describe('Whether to automatically activate the changelist')
});

/**
 * Tool schema for batch DNS operations
 */
export const DNSBatchUpdateSchema = z.object({
  /** Target DNS zone */
  zone: z.string().min(1).describe('DNS zone name (e.g., "example.com")'),
  /** Array of DNS record operations */
  operations: z.array(z.object({
    /** Operation type */
    operation: z.enum(['add', 'update', 'delete']).describe('Operation to perform'),
    /** DNS record name */
    name: z.string().min(1).max(253).describe('Record name'),
    /** DNS record type */
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('DNS record type'),
    /** Record data (required for add/update) */
    rdata: z.array(z.string()).optional().describe('Record data values'),
    /** Time to live in seconds */
    ttl: z.number().min(30).max(86400).optional().describe('Time to live in seconds'),
    /** Optional comment for this operation */
    comment: z.string().max(1000).optional().describe('Comment for this operation')
  })).min(1).max(100).describe('Array of DNS operations to perform'),
  /** Network environment */
  network: z.enum(['STAGING', 'PRODUCTION']).default('STAGING').describe('Network environment for activation'),
  /** Customer context */
  customer: z.string().optional().describe('Customer context (optional)'),
  /** Optional description */
  description: z.string().max(1000).optional().describe('Description of this batch operation'),
  /** Whether to bypass safety checks */
  bypassSafetyChecks: z.boolean().default(false).describe('Whether to bypass safety checks'),
  /** Whether to auto-activate after submission */
  autoActivate: z.boolean().default(true).describe('Whether to automatically activate the changelist')
});

/**
 * Create a DNSChangelistService instance
 */
function createDNSChangelistService(): DNSChangelistService {
  return new DNSChangelistService();
}

/**
 * Format changelist operation result for user display
 */
function formatChangelistResult(result: any, operation: string): string {
  let text = `✅ **DNS ${operation} Completed Successfully!**\n\n`;
  
  text += `**Zone:** ${result.zone}\n`;
  text += `**Status:** ${result.status}\n`;
  
  if (result.requestId) {
    text += `**Request ID:** ${result.requestId}\n`;
  }
  
  if (result.changeTag) {
    text += `**Change Tag:** ${result.changeTag}\n`;
  }
  
  if (result.submittedDate) {
    text += `**Submitted:** ${new Date(result.submittedDate).toLocaleString()}\n`;
  }
  
  if (result.completedDate) {
    text += `**Completed:** ${new Date(result.completedDate).toLocaleString()}\n`;
  }
  
  if (result.message) {
    text += `**Message:** ${result.message}\n`;
  }
  
  // Show successful records
  if (result.successfulRecords?.length > 0) {
    text += `\n**Successful Records (${result.successfulRecords.length}):**\n`;
    result.successfulRecords.slice(0, 10).forEach((record: any) => {
      text += `• ${record.name} (${record.type})`;
      if (record.operation === 'delete') {
        text += ` - DELETED`;
      } else if (record.rdata) {
        text += ` → ${record.rdata.join(', ')}`;
        if (record.ttl) {text += ` (TTL: ${record.ttl}s)`;}
      }
      text += '\n';
    });
    
    if (result.successfulRecords.length > 10) {
      text += `_... and ${result.successfulRecords.length - 10} more records_\n`;
    }
  }
  
  // Show failed records
  if (result.failedRecords?.length > 0) {
    text += `\n**Failed Records (${result.failedRecords.length}):**\n`;
    result.failedRecords.forEach((record: any) => {
      text += `• ${record.name} (${record.type}): ${record.error}\n`;
    });
  }
  
  // Show validation results
  if (result.validations) {
    if (result.validations.passing?.length > 0) {
      text += `\n**Passing Validations:**\n`;
      result.validations.passing.forEach((validation: string) => {
        text += `✅ ${validation}\n`;
      });
    }
    
    if (result.validations.failing?.length > 0) {
      text += `\n**Failed Validations:**\n`;
      result.validations.failing.forEach((validation: string) => {
        text += `❌ ${validation}\n`;
      });
    }
  }
  
  text += `\n🎯 **Next Steps:**\n`;
  text += `1. Verify DNS propagation: \`dig ${result.zone} ANY\`\n`;
  text += `2. Check record resolution from multiple locations\n`;
  text += `3. Monitor DNS query performance\n`;
  
  return text;
}

/**
 * Add a single DNS record with automatic changelist management
 */
export async function addDNSRecord(args: z.infer<typeof DNSRecordAddSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_add',
    args,
    async () => {
      const service = createDNSChangelistService();
      
      const config: Partial<ChangelistConfig> = {
        customer: args.customer,
        network: args.network,
        description: args.description || `Add DNS record ${args.name} (${args.type})`,
        bypassSafetyChecks: args.bypassSafetyChecks,
        autoActivate: args.autoActivate
      };
      
      const result = await service.addRecord(args.zone, {
        name: args.name,
        type: args.type,
        rdata: args.rdata,
        ttl: args.ttl
      }, config);
      
      return result;
    },
    {
      format: 'text',
      formatter: (result: ChangelistResult) => formatChangelistResult(result, 'Record Addition'),
      progress: true,
      progressMessage: `Adding DNS record ${args.name} (${args.type}) to zone ${args.zone}...`
    }
  );
}

/**
 * Update a single DNS record with automatic changelist management
 */
export async function updateDNSRecord(args: z.infer<typeof DNSRecordUpdateSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_update',
    args,
    async () => {
      const service = createDNSChangelistService();
      
      const config: Partial<ChangelistConfig> = {
        customer: args.customer,
        network: args.network,
        description: args.description || `Update DNS record ${args.name} (${args.type})`,
        bypassSafetyChecks: args.bypassSafetyChecks,
        autoActivate: args.autoActivate
      };
      
      const result = await service.updateRecord(args.zone, {
        name: args.name,
        type: args.type,
        rdata: args.rdata,
        ttl: args.ttl
      }, config);
      
      return result;
    },
    {
      format: 'text',
      formatter: (result: ChangelistResult) => formatChangelistResult(result, 'Record Update'),
      progress: true,
      progressMessage: `Updating DNS record ${args.name} (${args.type}) in zone ${args.zone}...`
    }
  );
}

/**
 * Delete a single DNS record with automatic changelist management
 */
export async function deleteDNSRecord(args: z.infer<typeof DNSRecordDeleteSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_delete',
    args,
    async () => {
      const service = createDNSChangelistService();
      
      const config: Partial<ChangelistConfig> = {
        customer: args.customer,
        network: args.network,
        description: args.description || `Delete DNS record ${args.name} (${args.type})`,
        bypassSafetyChecks: args.bypassSafetyChecks,
        autoActivate: args.autoActivate
      };
      
      const result = await service.deleteRecord(args.zone, {
        name: args.name,
        type: args.type
      }, config);
      
      return result;
    },
    {
      format: 'text',
      formatter: (result: ChangelistResult) => formatChangelistResult(result, 'Record Deletion'),
      progress: true,
      progressMessage: `Deleting DNS record ${args.name} (${args.type}) from zone ${args.zone}...`
    }
  );
}

/**
 * Execute multiple DNS record operations in a single changelist
 */
export async function batchUpdateDNS(args: z.infer<typeof DNSBatchUpdateSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_batch_update',
    args,
    async () => {
      const service = createDNSChangelistService();
      
      // Convert operations to DNSRecordChange format
      const changes: DNSRecordChange[] = args.operations.map(op => ({
        name: op.name,
        type: op.type,
        operation: op.operation,
        rdata: op.rdata,
        ttl: op.ttl,
        comment: op.comment
      }));
      
      const config: Partial<ChangelistConfig> = {
        customer: args.customer,
        network: args.network,
        description: args.description || `Batch DNS operation with ${args.operations.length} changes`,
        bypassSafetyChecks: args.bypassSafetyChecks,
        autoActivate: args.autoActivate
      };
      
      const result = await service.batchUpdate(args.zone, changes, config);
      
      return result;
    },
    {
      format: 'text',
      formatter: (result: ChangelistResult) => formatChangelistResult(result, 'Batch Update'),
      progress: true,
      progressMessage: `Processing ${args.operations.length} DNS operations in zone ${args.zone}...`
    }
  );
}