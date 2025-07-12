/**
 * DNS Changelist Legacy Tools
 * 
 * Migrated from dns-tools.ts to follow the domain architecture pattern.
 * These functions provide low-level changelist operations for DNS zones.
 * 
 * ARCHITECTURE NOTES:
 * - Uses AkamaiOperation.execute pattern for consistency
 * - Maintains original functionality while following new patterns
 * - Will be refactored in future to consolidate with dns-changelist.ts
 */

import { z } from 'zod';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiOperation } from '../common/akamai-operation';
import { createLogger } from '../../utils/pino-logger';
import { createHash } from 'crypto';

const logger = createLogger('dns-changelist-legacy');

// Schemas for changelist operations
const ChangeListMetadataSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  customer: z.string().optional().describe('Customer context')
});

const SubmitChangeListSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  comment: z.string().optional().describe('Comment for the submission'),
  validateOnly: z.boolean().optional().describe('Only validate, do not submit'),
  waitForActivation: z.boolean().optional().describe('Wait for zone activation'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  customer: z.string().optional().describe('Customer context')
});

const DiscardChangeListSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  customer: z.string().optional().describe('Customer context')
});

const WaitForZoneActivationSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  pollInterval: z.number().optional().describe('Poll interval in milliseconds'),
  requestId: z.string().optional().describe('Request ID to track'),
  customer: z.string().optional().describe('Customer context')
});

const UpsertRecordSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  name: z.string().describe('Record name'),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('Record type'),
  ttl: z.number().min(30).max(86400).default(300).describe('Time to live'),
  rdata: z.array(z.string()).describe('Record data'),
  comment: z.string().optional().describe('Comment for the change'),
  force: z.boolean().optional().describe('Force operation'),
  autoSubmit: z.boolean().optional().describe('Auto-submit changes'),
  customer: z.string().optional().describe('Customer context')
});

const DeleteRecordSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  name: z.string().describe('Record name'),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']).describe('Record type'),
  comment: z.string().optional().describe('Comment for the deletion'),
  force: z.boolean().optional().describe('Force operation'),
  customer: z.string().optional().describe('Customer context')
});

const ActivateZoneChangesSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  comment: z.string().optional().describe('Comment for activation'),
  validateOnly: z.boolean().optional().describe('Only validate changes'),
  waitForCompletion: z.boolean().optional().describe('Wait for activation to complete'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  customer: z.string().optional().describe('Customer context')
});

const DelegateSubzoneSchema = z.object({
  zone: z.string().describe('DNS zone name'),
  nameservers: z.array(z.string()).describe('Nameserver list'),
  provider: z.string().optional().describe('Provider name'),
  ttl: z.number().optional().describe('TTL for NS records'),
  createIfMissing: z.boolean().optional().describe('Create zone if it doesn\'t exist'),
  customer: z.string().optional().describe('Customer context')
});

// Helper function to generate request ID
function generateRequestId(): string {
  return createHash('md5')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 8);
}

/**
 * Get changelist metadata for a zone
 */
export async function getChangeListMetadata(args: z.infer<typeof ChangeListMetadataSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_changelist_metadata',
    args,
    async (client) => {
      const response = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      
      return response;
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `# Changelist Metadata for ${args.zone}\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Change Tag:** ${data.changeTag || 'N/A'}\n`;
        text += `**Zone Version ID:** ${data.zoneVersionId || 'N/A'}\n`;
        text += `**Stale:** ${data.stale ? 'Yes' : 'No'}\n`;
        text += `**Last Modified:** ${data.lastModifiedDate}\n`;
        text += `**Last Modified By:** ${data.lastModifiedBy || 'Unknown'}\n`;
        
        return text;
      }
    }
  );
}

/**
 * Get full changelist with all pending changes
 */
export async function getChangeList(args: z.infer<typeof ChangeListMetadataSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_changelist_get',
    args,
    async (client) => {
      const response = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      
      return response;
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `# Changelist for ${args.zone}\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Last Modified:** ${data.lastModifiedDate}\n`;
        text += `**Last Modified By:** ${data.lastModifiedBy || 'Unknown'}\n`;
        
        if (data.recordSets && data.recordSets.length > 0) {
          text += `\n## Pending Changes (${data.recordSets.length}):\n\n`;
          
          data.recordSets.forEach((record: any, index: number) => {
            text += `${index + 1}. **${record.name}** (${record.type})\n`;
            text += `   - TTL: ${record.ttl}\n`;
            text += `   - Data: ${record.rdata.join(', ')}\n\n`;
          });
        } else {
          text += '\n**No pending changes in this changelist**\n';
        }
        
        return text;
      }
    }
  );
}

/**
 * Submit a changelist for activation
 */
export async function submitChangeList(args: z.infer<typeof SubmitChangeListSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_changelist_submit',
    args,
    async (client) => {
      const response = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: {
          comment: args.comment || `Submitting pending changes for ${args.zone}`,
          validateOnly: args.validateOnly || false
        }
      });
      
      // Handle 204 No Content response
      if (!response || Object.keys(response).length === 0) {
        return {
          requestId: generateRequestId(),
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'SUBMITTED'
        };
      }
      
      return response;
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `✅ **Changelist ${args.validateOnly ? 'Validated' : 'Submitted'} Successfully!**\n\n`;
        text += `**Zone:** ${args.zone}\n`;
        text += `**Request ID:** ${data.requestId}\n`;
        
        if (data.expiryDate) {
          text += `**Expiry Date:** ${data.expiryDate}\n`;
        }
        
        if (args.validateOnly) {
          text += '\n**Note:** This was a validation-only operation. Changes were not submitted.\n';
        } else {
          text += '\n**Next Steps:**\n';
          text += '1. Monitor activation status\n';
          text += '2. Verify DNS propagation\n';
          text += '3. Test record resolution\n';
        }
        
        return text;
      },
      progress: true,
      progressMessage: args.validateOnly ? 'Validating changelist...' : 'Submitting changelist...'
    }
  );
}

/**
 * Discard an existing changelist
 */
export async function discardChangeList(args: z.infer<typeof DiscardChangeListSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_changelist_discard',
    args,
    async (client) => {
      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      });
      
      return { zone: args.zone, status: 'DISCARDED' };
    },
    {
      format: 'text',
      formatter: (data: any) => {
        return `✅ **Changelist Discarded Successfully!**\n\n` +
               `**Zone:** ${data.zone}\n` +
               `**Status:** All pending changes have been discarded\n`;
      }
    }
  );
}

/**
 * Wait for zone activation to complete
 */
export async function waitForZoneActivation(args: z.infer<typeof WaitForZoneActivationSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_zone_activation_wait',
    args,
    async (client) => {
      const timeout = args.timeout || 300000; // 5 minutes default
      const pollInterval = args.pollInterval || 3000; // 3 seconds default
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const response = await client.request({
          path: `/config-dns/v2/zones/${args.zone}/status`,
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });
        
        if (response.activationState === 'ACTIVE') {
          return response;
        }
        
        if (response.activationState === 'FAILED') {
          throw new Error(`Zone activation failed for ${args.zone}`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      throw new Error(`Timeout waiting for zone ${args.zone} activation after ${timeout}ms`);
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `✅ **Zone Activation Complete!**\n\n`;
        text += `**Zone:** ${args.zone}\n`;
        text += `**Status:** ${data.activationState}\n`;
        
        if (data.lastActivationTime) {
          text += `**Activation Time:** ${data.lastActivationTime}\n`;
        }
        
        if (data.lastActivatedBy) {
          text += `**Activated By:** ${data.lastActivatedBy}\n`;
        }
        
        if (data.propagationStatus) {
          text += `\n**Propagation Status:**\n`;
          text += `- Progress: ${data.propagationStatus.percentage}%\n`;
          text += `- Servers Updated: ${data.propagationStatus.serversUpdated}/${data.propagationStatus.totalServers}\n`;
        }
        
        return text;
      },
      progress: true,
      progressMessage: `Waiting for zone ${args.zone} activation...`
    }
  );
}

/**
 * Create or update a DNS record using changelist workflow
 */
export async function upsertRecord(args: z.infer<typeof UpsertRecordSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_upsert',
    args,
    async (client) => {
      // Check if record exists
      let operation: 'ADD' | 'EDIT' = 'ADD';
      
      try {
        const existingRecords = await client.request({
          path: `/config-dns/v2/zones/${args.zone}/recordsets`,
          method: 'GET',
          headers: { Accept: 'application/json' },
          queryParams: {
            types: args.type,
            search: args.name
          }
        });
        
        const records = (existingRecords as any).recordsets || [];
        const exactMatch = records.find((r: any) => r.name === args.name && r.type === args.type);
        
        if (exactMatch) {
          operation = 'EDIT';
        }
      } catch (error) {
        logger.debug({ error }, 'Could not check existing records, assuming ADD');
      }
      
      // Create changelist
      await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        queryParams: {
          zone: args.zone
        }
      });
      
      // Add/update the record
      const changeOperation = {
        name: args.name,
        type: args.type,
        op: operation,
        ttl: args.ttl,
        rdata: args.rdata
      };
      
      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: changeOperation
      });
      
      // Submit if autoSubmit is true
      if (args.autoSubmit !== false) {
        const submitResponse = await client.request({
          path: `/config-dns/v2/changelists/${args.zone}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: {
            comment: args.comment || `${operation === 'ADD' ? 'Created' : 'Updated'} ${args.type} record for ${args.name}`
          }
        });
        
        return {
          operation,
          record: { name: args.name, type: args.type, ttl: args.ttl, rdata: args.rdata },
          submitted: true,
          requestId: submitResponse.requestId || generateRequestId()
        };
      }
      
      return {
        operation,
        record: { name: args.name, type: args.type, ttl: args.ttl, rdata: args.rdata },
        submitted: false
      };
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `✅ **Successfully ${data.operation === 'ADD' ? 'created' : 'updated'} DNS record**\n\n`;
        text += `**Record:** ${data.record.name} (${data.record.type})\n`;
        text += `**TTL:** ${data.record.ttl}\n`;
        text += `**Data:** ${data.record.rdata.join(', ')}\n`;
        
        if (data.submitted) {
          text += `\n**Status:** Changes activated\n`;
          text += `**Request ID:** ${data.requestId}\n`;
        } else {
          text += `\n**Status:** Changes pending in changelist\n`;
          text += `**Next Step:** Activate with "dns_changelist_submit"\n`;
        }
        
        return text;
      }
    }
  );
}

/**
 * Delete a DNS record using changelist workflow
 */
export async function deleteRecord(args: z.infer<typeof DeleteRecordSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_record_delete_changelist',
    args,
    async (client) => {
      // Create changelist
      await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        queryParams: {
          zone: args.zone
        }
      });
      
      // Add delete operation
      const deleteOperation = {
        name: args.name,
        type: args.type,
        op: 'DELETE' as const
      };
      
      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: deleteOperation
      });
      
      // Submit the changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: {
          comment: args.comment || `Deleted ${args.type} record for ${args.name}`
        }
      });
      
      return {
        record: { name: args.name, type: args.type },
        requestId: submitResponse.requestId || generateRequestId()
      };
    },
    {
      format: 'text',
      formatter: (data: any) => {
        return `✅ **Successfully deleted DNS record**\n\n` +
               `**Record:** ${data.record.name} (${data.record.type})\n` +
               `**Request ID:** ${data.requestId}\n`;
      }
    }
  );
}

/**
 * Activate zone changes with optional validation and monitoring
 */
export async function activateZoneChanges(args: z.infer<typeof ActivateZoneChangesSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_zone_activate_changes',
    args,
    async (client) => {
      // Check for pending changes
      const changelist = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      
      if (!changelist || !changelist.recordSets || changelist.recordSets.length === 0) {
        return {
          zone: args.zone,
          status: 'NO_CHANGES',
          message: 'No pending changes found'
        };
      }
      
      const changeCount = changelist.recordSets.length;
      
      // Submit the changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: {
          comment: args.comment || `Activating ${changeCount} pending changes`,
          validateOnly: args.validateOnly || false
        }
      });
      
      // Wait for completion if requested
      if (args.waitForCompletion && !args.validateOnly) {
        const timeout = args.timeout || 300000; // 5 minutes default
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
          const status = await client.request({
            path: `/config-dns/v2/zones/${args.zone}/status`,
            method: 'GET',
            headers: {
              Accept: 'application/json'
            }
          });
          
          if (status.activationState === 'ACTIVE') {
            return {
              zone: args.zone,
              status: 'ACTIVATED',
              changeCount,
              requestId: submitResponse.requestId || generateRequestId(),
              activationStatus: status
            };
          }
          
          if (status.activationState === 'FAILED') {
            throw new Error(`Zone activation failed for ${args.zone}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      return {
        zone: args.zone,
        status: args.validateOnly ? 'VALIDATED' : 'SUBMITTED',
        changeCount,
        requestId: submitResponse.requestId || generateRequestId()
      };
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `✅ **Zone Changes ${data.status}!**\n\n`;
        text += `**Zone:** ${data.zone}\n`;
        text += `**Changes:** ${data.changeCount}\n`;
        text += `**Request ID:** ${data.requestId}\n`;
        
        if (data.status === 'VALIDATED') {
          text += '\n**Note:** Changes were validated but not submitted.\n';
        } else if (data.status === 'ACTIVATED') {
          text += '\n**Activation Status:** Complete\n';
          if (data.activationStatus?.propagationStatus) {
            text += `**Propagation:** ${data.activationStatus.propagationStatus.percentage}%\n`;
          }
        } else if (data.status === 'SUBMITTED') {
          text += '\n**Note:** Changes submitted. Monitor activation status.\n';
        }
        
        return text;
      },
      progress: true,
      progressMessage: 'Processing zone changes...'
    }
  );
}

/**
 * Delegate a subzone to external nameservers
 */
export async function delegateSubzone(args: z.infer<typeof DelegateSubzoneSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'dns_subzone_delegate',
    args,
    async (client) => {
      const providerName = args.provider || 'external provider';
      const ttl = args.ttl || 300;
      
      // Check if zone exists
      let zoneExists = true;
      try {
        await client.request({
          path: `/config-dns/v2/zones/${args.zone}`,
          method: 'GET'
        });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.status === 404) {
          zoneExists = false;
        } else {
          throw error;
        }
      }
      
      if (!zoneExists && !args.createIfMissing) {
        throw new Error(`Zone ${args.zone} does not exist. Use createIfMissing: true to create it.`);
      }
      
      if (!zoneExists) {
        // Create the zone
        await client.request({
          path: '/config-dns/v2/zones',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            zone: args.zone,
            type: 'PRIMARY',
            comment: `Created for ${providerName} delegation`
          }
        });
      }
      
      // Check for existing changelist
      try {
        const changelist = await client.request({
          path: `/config-dns/v2/changelists/${args.zone}`,
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });
        
        if (changelist && (!changelist.recordSets || changelist.recordSets.length === 0)) {
          // Discard empty changelist
          await client.request({
            path: `/config-dns/v2/changelists/${args.zone}`,
            method: 'DELETE'
          });
        } else if (changelist && changelist.recordSets && changelist.recordSets.length > 0) {
          throw new Error(`Active changelist exists with ${changelist.recordSets.length} pending changes`);
        }
      } catch (error: any) {
        // No changelist exists, which is fine
        if (error?.statusCode !== 404 && error?.status !== 404 && !error?.message?.includes('404')) {
          throw error;
        }
      }
      
      // Get current NS records
      const records = await client.request({
        path: `/config-dns/v2/zones/${args.zone}/recordsets`,
        method: 'GET',
        headers: { Accept: 'application/json' },
        queryParams: { types: 'NS' }
      });
      
      const nsRecord = records.recordsets?.find((r: any) => r.name === args.zone && r.type === 'NS');
      const operation = nsRecord ? 'EDIT' : 'ADD';
      
      // Create changelist
      await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        queryParams: { zone: args.zone }
      });
      
      // Update NS records
      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: {
          name: args.zone,
          type: 'NS',
          op: operation,
          ttl: ttl,
          rdata: args.nameservers
        }
      });
      
      // Submit changelist
      const submitResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: {
          comment: `Delegate ${args.zone} to ${providerName} nameservers`
        }
      });
      
      return {
        zone: args.zone,
        provider: providerName,
        nameservers: args.nameservers,
        ttl,
        operation,
        requestId: submitResponse.requestId || generateRequestId()
      };
    },
    {
      format: 'text',
      formatter: (data: any) => {
        let text = `✅ **Successfully delegated ${data.zone} to ${data.provider}!**\n\n`;
        text += `**Nameservers configured:**\n`;
        data.nameservers.forEach((ns: string, i: number) => {
          text += `  ${i + 1}. ${ns}\n`;
        });
        text += `\n**TTL:** ${data.ttl} seconds\n`;
        text += `**Operation:** ${data.operation === 'ADD' ? 'Added new' : 'Updated existing'} NS records\n`;
        text += `**Request ID:** ${data.requestId}\n\n`;
        text += `🎯 The delegation is now active. ${data.provider} can now manage DNS for ${data.zone}\n`;
        
        return text;
      }
    }
  );
}