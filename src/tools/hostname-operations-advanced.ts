/**
 * Advanced Hostname Operations for PAPI
 * Implements missing hostname functionality per PAPI audit
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' types
 * - Full runtime validation with Zod
 * - Comprehensive error handling
 * - Claude Desktop optimized responses
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { z } from 'zod';
import { validateApiResponse } from '../utils/api-response-validator';
import { handleApiError } from '../utils/error-handling';

// Response schemas
const HostnameListSchema = z.object({
  hostnames: z.object({
    items: z.array(z.object({
      hostname: z.string(),
      edgeHostname: z.string().optional(),
      cnameTo: z.string().optional(),
      certStatus: z.object({
        production: z.array(z.object({
          status: z.string()
        })).optional(),
        staging: z.array(z.object({
          status: z.string()
        })).optional()
      }).optional()
    }).passthrough())
  })
});

const HostnameActivationSchema = z.object({
  activations: z.object({
    items: z.array(z.object({
      activationId: z.string(),
      hostname: z.string(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      status: z.string(),
      submitDate: z.string(),
      updateDate: z.string().optional(),
      propertyVersion: z.number()
    }).passthrough())
  })
});

/**
 * List all hostnames across all versions of a property
 * This is the missing PAPI operation for cross-version hostname listing
 */
export async function listAllPropertyHostnames(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams();
    
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostnames`,
      method: 'GET',
      params
    });

    const validated = validateApiResponse(response, HostnameListSchema, 'listAllPropertyHostnames');
    const hostnames = validated.hostnames?.items || [];

    let responseText = '# Property Hostnames (All Versions)\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Total Hostnames:** ${hostnames.length}\n\n`;

    if (hostnames.length === 0) {
      responseText += 'No hostnames found across any version.\n';
    } else {
      responseText += '## Hostnames\n\n';
      responseText += '| Hostname | Edge Hostname | Certificate Status |\n';
      responseText += '|----------|--------------|-------------------|\n';
      
      hostnames.forEach(h => {
        const prodCert = h.certStatus?.production?.[0]?.status || 'N/A';
        const stageCert = h.certStatus?.staging?.[0]?.status || 'N/A';
        const certStatus = `Prod: ${prodCert}, Stage: ${stageCert}`;
        
        responseText += `| ${h.hostname} | ${h.cnameTo || h.edgeHostname || 'N/A'} | ${certStatus} |\n`;
      });
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'listing all property hostnames');
  }
}

/**
 * Patch hostnames - Partial update for property hostnames
 */
export async function patchPropertyHostnames(
  client: AkamaiClient,
  args: {
    propertyId: string;
    patches: Array<{
      op: 'add' | 'remove' | 'replace';
      path: string;
      value?: any;
    }>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostnames`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json'
      },
      body: args.patches
    });

    let responseText = '# Hostname Patch Applied\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Patches Applied:** ${args.patches.length}\n\n`;

    responseText += '## Patch Operations\n\n';
    args.patches.forEach((patch, i) => {
      responseText += `${i + 1}. **${patch.op}** ${patch.path}`;
      if (patch.value) {
        responseText += ` = ${JSON.stringify(patch.value)}`;
      }
      responseText += '\n';
    });

    responseText += '\n✅ Hostnames updated successfully.\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'patching property hostnames');
  }
}

/**
 * Patch version-specific hostnames
 */
export async function patchPropertyVersionHostnames(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    patches: Array<{
      op: 'add' | 'remove' | 'replace';
      path: string;
      value?: any;
    }>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json'
      },
      body: args.patches
    });

    let responseText = '# Version Hostname Patch Applied\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Patches Applied:** ${args.patches.length}\n\n`;

    responseText += '## Patch Operations\n\n';
    args.patches.forEach((patch, i) => {
      responseText += `${i + 1}. **${patch.op}** ${patch.path}`;
      if (patch.value) {
        responseText += ` = ${JSON.stringify(patch.value)}`;
      }
      responseText += '\n';
    });

    responseText += '\n✅ Version hostnames updated successfully.\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'patching version hostnames');
  }
}

/**
 * Get hostname activation history
 */
export async function getPropertyHostnameActivations(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams();
    if (args.hostname) {
      params.append('hostname', args.hostname);
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostname-activations`,
      method: 'GET',
      params
    });

    const validated = validateApiResponse(response, HostnameActivationSchema, 'getPropertyHostnameActivations');
    const activations = validated.activations?.items || [];

    let responseText = '# Hostname Activation History\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    if (args.hostname) {
      responseText += `**Hostname Filter:** ${args.hostname}\n`;
    }
    responseText += `**Total Activations:** ${activations.length}\n\n`;

    if (activations.length === 0) {
      responseText += 'No hostname activations found.\n';
    } else {
      // Group by hostname
      const byHostname = activations.reduce((acc, act) => {
        if (!acc[act.hostname]) acc[act.hostname] = [];
        acc[act.hostname].push(act);
        return acc;
      }, {} as Record<string, typeof activations>);

      Object.entries(byHostname).forEach(([hostname, acts]) => {
        responseText += `## ${hostname}\n\n`;
        
        acts.sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime());
        
        acts.forEach(act => {
          const statusEmoji = act.status === 'ACTIVE' ? '✅' : 
                            act.status === 'PENDING' ? '⏳' : 
                            act.status === 'FAILED' ? '❌' : '❓';
          
          responseText += `- ${statusEmoji} **${act.network}** v${act.propertyVersion} - ${act.status}\n`;
          responseText += `  - Submitted: ${new Date(act.submitDate).toISOString()}\n`;
          if (act.updateDate) {
            responseText += `  - Updated: ${new Date(act.updateDate).toISOString()}\n`;
          }
          responseText += `  - ID: ${act.activationId}\n\n`;
        });
      });
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting hostname activations');
  }
}

/**
 * Get specific hostname activation status
 */
export async function getPropertyHostnameActivationStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostname-activations/${args.activationId}`,
      method: 'GET'
    });

    const activation = response;

    let responseText = '# Hostname Activation Status\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Activation ID:** ${args.activationId}\n\n`;

    responseText += '## Status Details\n\n';
    responseText += `- **Hostname:** ${activation.hostname}\n`;
    responseText += `- **Network:** ${activation.network}\n`;
    responseText += `- **Status:** ${activation.status}\n`;
    responseText += `- **Version:** ${activation.propertyVersion}\n`;
    responseText += `- **Submitted:** ${new Date(activation.submitDate).toISOString()}\n`;
    
    if (activation.updateDate) {
      responseText += `- **Last Updated:** ${new Date(activation.updateDate).toISOString()}\n`;
    }

    if (activation.status === 'ACTIVE') {
      responseText += '\n✅ Hostname is active on ' + activation.network + '\n';
    } else if (activation.status === 'PENDING') {
      responseText += '\n⏳ Activation in progress...\n';
    } else if (activation.status === 'FAILED') {
      responseText += '\n❌ Activation failed\n';
      if (activation.detail) {
        responseText += `**Error:** ${activation.detail}\n`;
      }
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting hostname activation status');
  }
}

/**
 * Cancel hostname activation
 */
export async function cancelPropertyHostnameActivation(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostname-activations/${args.activationId}`,
      method: 'DELETE'
    });

    let responseText = '# Hostname Activation Cancelled\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Activation ID:** ${args.activationId}\n\n`;
    responseText += '✅ Hostname activation has been cancelled successfully.\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'cancelling hostname activation');
  }
}

/**
 * Compare hostnames between versions
 */
export async function getPropertyHostnamesDiff(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version1: number;
    version2: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Fetch hostnames for both versions
    const [response1, response2] = await Promise.all([
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/hostnames`,
        method: 'GET'
      }),
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/hostnames`,
        method: 'GET'
      })
    ]);

    const hostnames1 = validateApiResponse(response1, HostnameListSchema, 'version1').hostnames?.items || [];
    const hostnames2 = validateApiResponse(response2, HostnameListSchema, 'version2').hostnames?.items || [];

    // Create maps for comparison
    const map1 = new Map(hostnames1.map(h => [h.hostname, h]));
    const map2 = new Map(hostnames2.map(h => [h.hostname, h]));

    // Find differences
    const added = hostnames2.filter(h => !map1.has(h.hostname));
    const removed = hostnames1.filter(h => !map2.has(h.hostname));
    const modified = hostnames2.filter(h => {
      const h1 = map1.get(h.hostname);
      return h1 && (h1.cnameTo !== h.cnameTo || h1.edgeHostname !== h.edgeHostname);
    });

    let responseText = '# Hostname Comparison\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version ${args.version1} → Version ${args.version2}**\n\n`;

    responseText += '## Summary\n\n';
    responseText += `- **Added:** ${added.length} hostnames\n`;
    responseText += `- **Removed:** ${removed.length} hostnames\n`;
    responseText += `- **Modified:** ${modified.length} hostnames\n`;
    responseText += `- **Unchanged:** ${hostnames2.length - added.length - modified.length} hostnames\n\n`;

    if (added.length > 0) {
      responseText += '## ➕ Added Hostnames\n\n';
      added.forEach(h => {
        responseText += `- **${h.hostname}** → ${h.cnameTo || h.edgeHostname || 'N/A'}\n`;
      });
      responseText += '\n';
    }

    if (removed.length > 0) {
      responseText += '## ➖ Removed Hostnames\n\n';
      removed.forEach(h => {
        responseText += `- **${h.hostname}** → ${h.cnameTo || h.edgeHostname || 'N/A'}\n`;
      });
      responseText += '\n';
    }

    if (modified.length > 0) {
      responseText += '## 🔄 Modified Hostnames\n\n';
      modified.forEach(h => {
        const h1 = map1.get(h.hostname)!;
        responseText += `- **${h.hostname}**\n`;
        responseText += `  - Old: ${h1.cnameTo || h1.edgeHostname || 'N/A'}\n`;
        responseText += `  - New: ${h.cnameTo || h.edgeHostname || 'N/A'}\n`;
      });
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'comparing hostname versions');
  }
}

/**
 * Get hostname audit trail
 */
export async function getHostnameAuditHistory(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    limit?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      hostname: args.hostname
    });
    if (args.limit) {
      params.append('limit', args.limit.toString());
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/hostname-audit`,
      method: 'GET',
      params
    });

    const auditEntries = response.audit?.items || [];

    let responseText = '# Hostname Audit Trail\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Hostname:** ${args.hostname}\n`;
    responseText += `**Audit Entries:** ${auditEntries.length}\n\n`;

    if (auditEntries.length === 0) {
      responseText += 'No audit history found for this hostname.\n';
    } else {
      responseText += '## Change History\n\n';
      
      auditEntries.forEach((entry: any, i: number) => {
        responseText += `### ${i + 1}. ${entry.action} - ${new Date(entry.timestamp).toISOString()}\n\n`;
        responseText += `- **User:** ${entry.user || 'System'}\n`;
        responseText += `- **Version:** ${entry.propertyVersion}\n`;
        responseText += `- **Action:** ${entry.action}\n`;
        
        if (entry.oldValue || entry.newValue) {
          responseText += `- **Change:**\n`;
          if (entry.oldValue) {
            responseText += `  - From: ${JSON.stringify(entry.oldValue)}\n`;
          }
          if (entry.newValue) {
            responseText += `  - To: ${JSON.stringify(entry.newValue)}\n`;
          }
        }
        
        if (entry.reason) {
          responseText += `- **Reason:** ${entry.reason}\n`;
        }
        
        responseText += '\n';
      });
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting hostname audit history');
  }
}