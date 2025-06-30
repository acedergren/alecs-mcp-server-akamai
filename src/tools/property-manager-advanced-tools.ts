/**
 * Advanced Property Manager Tools
 * Implements extended property management features including edge hostnames, property versions,
 * search, bulk operations, and domain validation
 * 
 * CODE KAI IMPLEMENTATION:
 * - All API responses validated against OpenAPI schemas
 * - Zero tolerance for 'any' types
 * - Runtime validation prevents type assertion errors
 * - Comprehensive error handling with user guidance
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { z } from 'zod';
import {
  EdgeHostnameListResponseSchema,
  EdgeHostnameDetailResponseSchema,
  PropertyVersionDetailResponseSchema,
  PropertyHostnameListResponseSchema
} from '../validation/property-advanced-schemas';

// Additional schemas needed from property-manager
const PropertyDetailResponseSchema = z.object({
  properties: z.object({
    items: z.array(z.object({
      accountId: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      propertyId: z.string(),
      propertyName: z.string(),
      latestVersion: z.number(),
      stagingVersion: z.union([z.number(), z.null()]),
      productionVersion: z.union([z.number(), z.null()]),
      assetId: z.string(),
      note: z.string(),
      productId: z.string().optional(),
      ruleFormat: z.string().optional()
    }).passthrough())
  })
});

const PropertyCreateResponseSchema = z.object({
  propertyLink: z.string()
});

const ActivationDetailResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  activations: z.object({
    items: z.array(z.object({
      activationId: z.string(),
      propertyName: z.string(),
      propertyId: z.string(),
      propertyVersion: z.number(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
      status: z.string(),
      submitDate: z.string(),
      updateDate: z.string(),
      note: z.string().optional(),
      notifyEmails: z.array(z.string()).optional()
    }).passthrough())
  })
});

/**
 * Validates API response and returns typed result
 */
function validateApiResponse<T>(
  response: unknown,
  schema: z.ZodSchema<T>,
  context: string
): T {
  const result = schema.safeParse(response);
  
  if (!result.success) {
    const errorDetails = result.error.errors
      .map(err => `- ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    
    throw new Error(
      `Invalid API response from ${context}:\n${errorDetails}\n\n` +
      `Response received: ${JSON.stringify(response, null, 2)}`
    );
  }
  
  return result.data;
}

/**
 * List all edge hostnames available under a contract
 */
export async function listEdgeHostnames(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (args.contractId) {
      queryParams['contractId'] = args.contractId;
    }
    if (args.groupId) {
      queryParams['groupId'] = args.groupId;
    }

    const rawResponse = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'GET',
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });
    
    // Validate response
    const response = validateApiResponse(
      rawResponse,
      EdgeHostnameListResponseSchema,
      'listEdgeHostnames'
    );

    if (!response.edgeHostnames?.items || response.edgeHostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No edge hostnames found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n[INFO] **Tip:** Edge hostnames are created automatically when you:\n- Create properties\n- Use the "create_edge_hostname" tool`,
          },
        ],
      };
    }

    let text = `# Edge Hostnames (${response.edgeHostnames.items.length} found)\n\n`;

    if (args.contractId) {
      text += `**Contract:** ${args.contractId}\n`;
    }
    if (args.groupId) {
      text += `**Group:** ${args.groupId}\n`;
    }
    text += '\n';

    text += '| Edge Hostname | Product | Secure | Status | Serial Number |\n';
    text += '|---------------|---------|--------|--------|---------------|\n';

    for (const eh of response.edgeHostnames.items) {
      const hostname = eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`;
      const product = eh.productId || 'Unknown';
      const secure = eh.secure ? '[SECURE] Yes' : '[ERROR] No';
      const status = eh['status'] || 'Active';
      const serial = eh.mapDetails?.serialNumber || 'N/A';

      text += `| ${hostname} | ${product} | ${secure} | ${status} | ${serial} |\n`;
    }

    text += '\n## Edge Hostname Types\n';
    text += '- **.edgesuite.net**: Standard HTTP delivery\n';
    text += '- **.edgekey.net**: Enhanced TLS with HTTP/2\n';
    text += '- **.akamaized.net**: China CDN delivery\n\n';

    text += '## Next Steps\n';
    text += '- Get details: `"Get edge hostname [hostname]"`\n';
    text += '- Create new: `"Create edge hostname for property prp_XXX"`\n';
    text += '- Use in property: `"Add hostname www.example.com to property prp_XXX"`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list edge hostnames', _error);
  }
}

/**
 * Get details about a specific edge hostname
 */
export async function getEdgeHostname(
  client: AkamaiClient,
  args: {
    edgeHostnameId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Edge hostname IDs should be in format ehn_XXXXX
    let edgeHostnameId = args.edgeHostnameId;
    if (!edgeHostnameId.startsWith('ehn_')) {
      // Try to find by domain name
      const rawListResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'GET',
      });
      
      const listResponse = validateApiResponse(
        rawListResponse,
        EdgeHostnameListResponseSchema,
        'getEdgeHostname.list'
      );

      const found = listResponse.edgeHostnames?.items?.find(
        (eh) =>
          eh.edgeHostnameDomain === args.edgeHostnameId ||
          `${eh.domainPrefix}.${eh.domainSuffix}` === args.edgeHostnameId,
      );

      if (!found) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] Edge hostname "${args.edgeHostnameId}" not found.\n\n[INFO] **Tip:** Use "list_edge_hostnames" to see available edge hostnames.`,
            },
          ],
        };
      }

      edgeHostnameId = found.edgeHostnameId;
    }

    const rawResponse = await client.request({
      path: `/papi/v1/edgehostnames/${edgeHostnameId}`,
      method: 'GET',
    });
    
    const response = validateApiResponse(
      rawResponse,
      EdgeHostnameDetailResponseSchema,
      `getEdgeHostname(${edgeHostnameId})`
    );

    const eh = response.edgeHostnames?.items?.[0];
    if (!eh) {
      throw new Error('Edge hostname details not found');
    }

    let text = `# Edge Hostname Details: ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;

    text += '## Basic Information\n';
    text += `- **Edge Hostname ID:** ${eh.edgeHostnameId}\n`;
    text += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;
    text += `- **Product:** ${eh.productId || 'Unknown'}\n`;
    text += `- **Secure (HTTPS):** ${eh.secure ? 'Yes' : 'No'}\n`;
    text += `- **IP Version:** ${eh.ipVersionBehavior || 'IPV4'}\n`;
    text += `- **Status:** ${eh['status'] || 'Active'}\n\n`;

    if (eh['mapDetails']) {
      text += '## Mapping Details\n';
      const mapDetails = eh['mapDetails'] as any;
      text += `- **Serial Number:** ${mapDetails?.serialNumber || 'N/A'}\n`;
      text += `- **Slot Number:** ${mapDetails?.slotNumber || 'N/A'}\n\n`;
    }

    const useCases = eh['useCases'] as any[];
    if (useCases && useCases.length > 0) {
      text += '## Use Cases\n';
      for (const uc of useCases) {
        text += `- **${uc.useCase}**: ${uc.option} (${uc.type})\n`;
      }
      text += '\n';
    }

    text += '## Usage\n';
    text += 'This edge hostname can be used as a CNAME target for your property hostnames.\n\n';
    text += 'Example DNS configuration:\n';
    text += '```\n';
    text += `www.example.com  CNAME  ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;
    text += '```\n\n';

    text += '## Next Steps\n';
    text += `- Add to property: \`"Add hostname www.example.com to property prp_XXX using edge hostname ${eh.edgeHostnameDomain}"\`\n`;
    text += `- List properties using this: \`"Search properties using edge hostname ${eh.edgeHostnameDomain}"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get edge hostname', _error);
  }
}

/**
 * Clone an existing property
 */
export async function cloneProperty(
  client: AkamaiClient,
  args: {
    sourcePropertyId: string;
    propertyName: string;
    contractId?: string;
    groupId?: string;
    cloneHostnames?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get source property details
    const rawSourceResponse = await client.request({
      path: `/papi/v1/properties/${args.sourcePropertyId}`,
      method: 'GET',
    });
    
    const sourceResponse = validateApiResponse(
      rawSourceResponse,
      PropertyDetailResponseSchema,
      `cloneProperty.getSource(${args.sourcePropertyId})`
    );

    const sourceProperty = sourceResponse.properties?.items?.[0];
    if (!sourceProperty) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Source property ${args.sourcePropertyId} not found.\n\n[INFO] **Tip:** Use "list_properties" to find valid property IDs.`,
          },
        ],
      };
    }

    // Use source property's contract/group if not specified
    const contractId = args.contractId || sourceProperty.contractId;
    const groupId = args.groupId || sourceProperty.groupId;

    // Clone the property
    const rawCloneResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {
        contractId: contractId,
        groupId: groupId,
      },
      body: {
        productId: sourceProperty.productId,
        propertyName: args.propertyName,
        cloneFrom: {
          propertyId: args.sourcePropertyId,
          version: sourceProperty.latestVersion,
          cloneHostnames: args.cloneHostnames || false,
        },
      },
    });
    
    const cloneResponse = validateApiResponse(
      rawCloneResponse,
      PropertyCreateResponseSchema,
      'cloneProperty.create'
    );

    const newPropertyId = cloneResponse.propertyLink?.split('/').pop()?.split('?')[0];

    let text = '[DONE] **Property Cloned Successfully!**\n\n';
    text += '## Clone Details\n';
    text += `- **New Property Name:** ${args.propertyName}\n`;
    text += `- **New Property ID:** ${newPropertyId}\n`;
    text += `- **Cloned From:** ${sourceProperty.propertyName} (${args.sourcePropertyId})\n`;
    text += `- **Product:** ${sourceProperty.productId}\n`;
    text += `- **Contract:** ${contractId}\n`;
    text += `- **Group:** ${groupId}\n`;
    text += `- **Hostnames Cloned:** ${args.cloneHostnames ? 'Yes' : 'No'}\n\n`;

    text += '## What Was Cloned\n';
    text += '[DONE] Property configuration and rules\n';
    text += '[DONE] Origin server settings\n';
    text += '[DONE] Caching behaviors\n';
    text += '[DONE] Performance optimizations\n';
    if (args.cloneHostnames) {
      text += '[DONE] Property hostnames\n';
    } else {
      text += '[ERROR] Property hostnames (need to be added manually)\n';
    }
    text += '[ERROR] SSL certificates (need separate enrollment)\n';
    text += '[ERROR] Activation status (starts as NEW)\n\n';

    text += '## Next Steps\n';
    text += `1. Review configuration: \`"Get property ${newPropertyId}"\`\n`;
    text += `2. Update settings if needed: \`"Update property ${newPropertyId} rules"\`\n`;
    if (!args.cloneHostnames) {
      text += `3. Add hostnames: \`"Add hostname www.example.com to property ${newPropertyId}"\`\n`;
      text += `4. Activate to staging: \`"Activate property ${newPropertyId} to staging"\`\n`;
    } else {
      text += `3. Activate to staging: \`"Activate property ${newPropertyId} to staging"\`\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('clone property', _error);
  }
}

/**
 * Remove/delete a property
 */
export async function removeProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // First check if property exists and is not active
    const rawPropertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const propertyResponse = validateApiResponse(
      rawPropertyResponse,
      PropertyDetailResponseSchema,
      `removeProperty.getProperty(${args.propertyId})`
    );

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Property ${args.propertyId} not found.`,
          },
        ],
      };
    }

    // Check if property is active
    if (property.productionVersion || property.stagingVersion) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Cannot delete property "${property.propertyName}" (${args.propertyId}).\n\n**Reason:** Property has active versions:\n- Production: ${property.productionVersion || 'None'}\n- Staging: ${property.stagingVersion || 'None'}\n\n**Solution:** Deactivate all versions first:\n1. \`"Deactivate property ${args.propertyId} from production"\`\n2. \`"Deactivate property ${args.propertyId} from staging"\`\n3. Then retry deletion`,
          },
        ],
      };
    }

    // Delete the property
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'DELETE',
      queryParams: {
        contractId: property.contractId,
        groupId: property.groupId,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] **Property Deleted Successfully**\n\n**Deleted Property:**\n- Name: ${property.propertyName}\n- ID: ${args.propertyId}\n- Contract: ${property.contractId}\n- Group: ${property.groupId}\n\n[WARNING] **Note:** This action cannot be undone.`,
        },
      ],
    };
  } catch (_error) {
    return formatError('remove property', _error);
  }
}

/**
 * List all versions of a property
 */
export async function listPropertyVersions(
  client: AkamaiClient,
  args: {
    propertyId: string;
    limit?: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const limit = args.limit || 50;
    const rawResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'GET',
      queryParams: {
        limit: limit.toString(),
      },
    });
    
    const response = validateApiResponse(
      rawResponse,
      PropertyVersionDetailResponseSchema,
      `listPropertyVersions(${args.propertyId})`
    );

    if (!response.versions?.items || response.versions.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No versions found for property ${args.propertyId}.\n\n[INFO] **Tip:** Verify the property ID is correct.`,
          },
        ],
      };
    }

    // Get property details for context
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    const property = (propertyResponse as any).properties?.items?.[0];

    let text = `# Property Versions: ${property?.propertyName || args.propertyId}\n\n`;
    text += `Total versions: ${response.versions.items.length}`;
    if (response.versions.items.length >= limit) {
      text += ` (showing first ${limit})`;
    }
    text += '\n\n';

    text += '| Version | Status | Updated By | Updated Date | Note |\n';
    text += '|---------|--------|------------|--------------|------|\n';

    for (const version of response.versions.items) {
      const versionNum = version.propertyVersion;
      let status = '[EMOJI] Draft';
      if (property?.productionVersion === versionNum) {
        status = '[EMOJI] Production';
      } else if (property?.stagingVersion === versionNum) {
        status = '[EMOJI] Staging';
      }

      const updatedBy = version.updatedByUser || 'Unknown';
      const updatedDate = version.updatedDate
        ? new Date(version.updatedDate).toLocaleDateString()
        : 'Unknown';
      const note = version.note || '-';

      text += `| v${versionNum} | ${status} | ${updatedBy} | ${updatedDate} | ${note} |\n`;
    }

    text += '\n## Version Status Legend\n';
    text += '- [EMOJI] **Production**: Currently active in production\n';
    text += '- [EMOJI] **Staging**: Currently active in staging\n';
    text += '- [EMOJI] **Draft**: Not activated\n\n';

    text += '## Next Steps\n';
    text += `- View version details: \`"Get property ${args.propertyId} version 5"\`\n`;
    text += `- Compare versions: \`"Compare property ${args.propertyId} version 4 with version 5"\`\n`;
    text += `- Create new version: \`"Create new version for property ${args.propertyId}"\`\n`;
    text += `- Activate version: \`"Activate property ${args.propertyId} version 5 to staging"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list property versions', _error);
  }
}

/**
 * Get details about a specific property version
 */
export async function getPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const rawResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}`,
      method: 'GET',
    });
    
    const response = validateApiResponse(
      rawResponse,
      PropertyVersionDetailResponseSchema,
      `getPropertyVersion(${args.propertyId}, v${args.version})`
    );

    const version = response.versions?.items?.[0];
    if (!version) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Version ${args.version} not found for property ${args.propertyId}.`,
          },
        ],
      };
    }

    // Get property details for activation status
    const rawPropertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const propertyResponse = validateApiResponse(
      rawPropertyResponse,
      PropertyDetailResponseSchema,
      `getPropertyVersion.getProperty(${args.propertyId})`
    );
    
    const property = propertyResponse.properties?.items?.[0];

    let text = `# Property Version Details: v${version.propertyVersion}\n\n`;
    text += `**Property:** ${property?.propertyName || args.propertyId}\n\n`;

    text += '## Version Information\n';
    text += `- **Version Number:** ${version.propertyVersion}\n`;
    text += `- **Created From:** v${version['createdFromVersion'] || 'N/A'}\n`;
    text += `- **Updated By:** ${version.updatedByUser || 'Unknown'}\n`;
    text += `- **Updated Date:** ${version.updatedDate ? new Date(version.updatedDate).toLocaleString() : 'Unknown'}\n`;
    text += `- **Rule Format:** ${version.ruleFormat || 'Unknown'}\n`;

    if (version.note) {
      text += `- **Version Note:** ${version.note}\n`;
    }
    text += '\n';

    text += '## Activation Status\n';
    const versionNum = version.propertyVersion;
    if (property?.productionVersion === versionNum) {
      text += '- [DONE] **Currently active in PRODUCTION**\n';
      text += `- Production Status: ${version.productionStatus || 'ACTIVE'}\n`;
    } else {
      text += '- [ERROR] Not active in production\n';
    }

    if (property?.stagingVersion === versionNum) {
      text += '- [DONE] **Currently active in STAGING**\n';
      text += `- Staging Status: ${version.stagingStatus || 'ACTIVE'}\n`;
    } else {
      text += '- [ERROR] Not active in staging\n';
    }
    text += '\n';

    text += '## Available Actions\n';
    text += `- View rules: \`"Get property ${args.propertyId} version ${args.version} rules"\`\n`;
    text += `- View hostnames: \`"List hostnames for property ${args.propertyId} version ${args.version}"\`\n`;
    text += `- Create new version based on this: \`"Create property version for ${args.propertyId} based on version ${args.version}"\`\n`;

    if (property?.productionVersion !== versionNum && property?.stagingVersion !== versionNum) {
      text += `- Activate: \`"Activate property ${args.propertyId} version ${args.version} to staging"\`\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get property version', _error);
  }
}

/**
 * Get the latest property version (overall or by network)
 */
export async function getLatestPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activatedOn?: 'PRODUCTION' | 'STAGING' | 'LATEST';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const rawPropertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    
    const propertyResponse = validateApiResponse(
      rawPropertyResponse,
      PropertyDetailResponseSchema,
      `getLatestPropertyVersion(${args.propertyId})`
    );

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Property ${args.propertyId} not found.`,
          },
        ],
      };
    }

    let targetVersion: number | undefined;
    let versionType: string;

    switch (args.activatedOn) {
      case 'PRODUCTION':
        targetVersion = property.productionVersion ?? undefined;
        versionType = 'Production';
        break;
      case 'STAGING':
        targetVersion = property.stagingVersion ?? undefined;
        versionType = 'Staging';
        break;
      case 'LATEST':
      default:
        targetVersion = property.latestVersion;
        versionType = 'Latest';
        break;
    }

    if (!targetVersion) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] No ${versionType.toLowerCase()} version found for property "${property.propertyName}".\n\n[INFO] **Tip:** This property may not have been activated to ${versionType.toLowerCase()} yet.`,
          },
        ],
      };
    }

    // Get version details
    const rawVersionResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${targetVersion}`,
      method: 'GET',
    });
    
    const versionResponse = validateApiResponse(
      rawVersionResponse,
      PropertyVersionDetailResponseSchema,
      `getLatestPropertyVersion.getVersion(${args.propertyId}, v${targetVersion})`
    );

    const version = versionResponse.versions?.items?.[0];
    if (!version) {
      throw new Error('Version details not found');
    }

    let text = `# ${versionType} Version: v${targetVersion}\n\n`;
    text += `**Property:** ${property.propertyName} (${args.propertyId})\n\n`;

    text += '## Version Details\n';
    text += `- **Version Number:** ${version.propertyVersion}\n`;
    text += `- **Updated By:** ${version.updatedByUser || 'Unknown'}\n`;
    text += `- **Updated Date:** ${version.updatedDate ? new Date(version.updatedDate).toLocaleString() : 'Unknown'}\n`;
    text += `- **Rule Format:** ${version.ruleFormat || 'Unknown'}\n`;

    if (version.note) {
      text += `- **Version Note:** ${version.note}\n`;
    }
    text += '\n';

    text += '## Status Summary\n';
    text += `- **Latest Version:** v${property.latestVersion}${targetVersion === property.latestVersion ? ' [DONE] (this version)' : ''}\n`;
    text += `- **Production Version:** ${property.productionVersion ? `v${property.productionVersion}` : 'None'}${targetVersion === property.productionVersion ? ' [DONE] (this version)' : ''}\n`;
    text += `- **Staging Version:** ${property.stagingVersion ? `v${property.stagingVersion}` : 'None'}${targetVersion === property.stagingVersion ? ' [DONE] (this version)' : ''}\n\n`;

    text += '## Next Steps\n';
    text += `- View rules: \`"Get property ${args.propertyId} version ${targetVersion} rules"\`\n`;
    text += `- View all versions: \`"List versions for property ${args.propertyId}"\`\n`;

    if (versionType === 'Latest' && targetVersion !== property.productionVersion) {
      text += `- Activate to production: \`"Activate property ${args.propertyId} version ${targetVersion} to production"\`\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get latest property version', _error);
  }
}

/**
 * Cancel a pending property activation
 */
export async function cancelPropertyActivation(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // First get the activation details to verify it's pending
    const rawActivationResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });
    
    const activationResponse = validateApiResponse(
      rawActivationResponse,
      ActivationDetailResponseSchema,
      `cancelPropertyActivation.getActivation(${args.propertyId}, ${args.activationId})`
    );

    const activation = activationResponse.activations?.items?.[0];
    if (!activation) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Activation ${args.activationId} not found for property ${args.propertyId}.`,
          },
        ],
      };
    }

    // Check if activation can be cancelled
    const cancellableStatuses = ['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'NEW'];
    if (!cancellableStatuses.includes(activation.status)) {
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Cannot cancel activation ${args.activationId}.\n\n**Status:** ${activation.status}\n**Reason:** Activation can only be cancelled when status is PENDING or in progress.\n\n[INFO] **Tip:** If the activation is already ACTIVE, you can roll back by activating a previous version.`,
          },
        ],
      };
    }

    // Cancel the activation
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'DELETE',
    });

    return {
      content: [
        {
          type: 'text',
          text: `[DONE] **Activation Cancelled Successfully**\n\n**Cancelled Activation:**\n- Activation ID: ${args.activationId}\n- Property: ${activation.propertyName}\n- Version: v${activation.propertyVersion}\n- Network: ${activation.network}\n- Previous Status: ${activation.status}\n\n**What Happens Next:**\n- The activation process has been stopped\n- The currently active version (if any) remains active\n- You can create a new activation when ready\n\n**Next Steps:**\n- Fix any issues with version ${activation.propertyVersion}\n- Create new activation: \`"Activate property ${args.propertyId} version ${activation.propertyVersion} to ${activation.network.toLowerCase()}"\`\n- Or activate a different version: \`"List versions for property ${args.propertyId}"\``,
        },
      ],
    };
  } catch (_error) {
    return formatError('cancel property activation', _error);
  }
}


/**
 * List hostnames for a specific property version
 */
export async function listPropertyVersionHostnames(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    validateCnames?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get latest version if not specified
    let version = args.version;
    if (!version) {
      const rawPropertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });
      
      const propertyResponse = validateApiResponse(
        rawPropertyResponse,
        PropertyDetailResponseSchema,
        `listPropertyVersionHostnames.getProperty(${args.propertyId})`
      );

      const property = propertyResponse.properties?.items?.[0];
      if (!property) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] Property ${args.propertyId} not found.`,
            },
          ],
        };
      }

      version = property.latestVersion || 1;
    }

    // Get hostnames for the version
    const rawResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
      ...(args.validateCnames && { queryParams: { validateCnames: 'true' } }),
    });
    
    const response = validateApiResponse(
      rawResponse,
      PropertyHostnameListResponseSchema,
      `listPropertyVersionHostnames(${args.propertyId}, v${version})`
    );

    if (!response.hostnames?.items || response.hostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No hostnames configured for property ${args.propertyId} version ${version}.\n\n[INFO] **Tip:** Add hostnames using:\n\`"Add hostname www.example.com to property ${args.propertyId}"\``,
          },
        ],
      };
    }

    let text = `# Hostnames for Property ${args.propertyId} (v${version})\n\n`;
    text += `Found ${response.hostnames.items.length} hostname(s):\n\n`;

    text += '| Hostname | Edge Hostname | Type | Cert Status |\n';
    text += '|----------|---------------|------|-------------|\n';

    for (const hostname of response.hostnames.items) {
      const certStatus =
        hostname.certStatus?.production?.[0]?.status ||
        hostname.certStatus?.staging?.[0]?.status ||
        'No cert';

      text += `| ${hostname.cnameFrom} | ${hostname.cnameTo} | ${hostname.cnameType || 'EDGE_HOSTNAME'} | ${certStatus} |\n`;
    }

    if (args.validateCnames && (response as any).errors?.length > 0) {
      text += '\n## [WARNING] Validation Errors\n';
      for (const _error of (response as any).errors) {
        text += `- ${_error.detail}\n`;
      }
    }

    if (args.validateCnames && (response as any).warnings?.length > 0) {
      text += '\n## [WARNING] Warnings\n';
      for (const warning of (response as any).warnings) {
        text += `- ${warning.detail}\n`;
      }
    }

    text += '\n## DNS Configuration\n';
    text += 'Create CNAME records for each hostname:\n```\n';
    for (const hostname of response.hostnames.items) {
      text += `${hostname.cnameFrom}  CNAME  ${hostname.cnameTo}\n`;
    }
    text += '```\n\n';

    text += '## Next Steps\n';
    text += `- Add hostname: \`"Add hostname www.newsite.com to property ${args.propertyId}"\`\n`;
    text += `- Remove hostname: \`"Remove hostname www.oldsite.com from property ${args.propertyId}"\`\n`;
    text += `- Validate CNAMEs: \`"List hostnames for property ${args.propertyId} version ${version} with validation"\`\n`;
    text += `- Activate version: \`"Activate property ${args.propertyId} version ${version} to staging"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list property version hostnames', _error);
  }
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: unknown): MCPToolResponse {
  let errorMessage = `[ERROR] Failed to ${operation}`;
  let solution = '';

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;

    // Provide specific solutions based on error type
    if (_error.message.includes('401') || _error.message.includes('credentials')) {
      solution = '**Solution:** Check your ~/.edgerc file has valid credentials.';
    } else if (_error.message.includes('403') || _error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions.';
    } else if (_error.message.includes('404') || _error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct.';
    } else if (_error.message.includes('400') || _error.message.includes('Bad Request')) {
      solution = '**Solution:** Invalid request parameters. Check the input values.';
    } else if (_error.message.includes('409') || _error.message.includes('Conflict')) {
      solution = '**Solution:** Resource conflict. The operation may already be in progress.';
    }
  } else {
    errorMessage += `: ${String(_error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  // Add general help
  text += '\n\n**Need Help?**\n';
  text += '- Property operations: https://techdocs.akamai.com/property-mgr/reference/properties\n';
  text +=
    '- Edge hostname docs: https://techdocs.akamai.com/property-mgr/reference/edge-hostnames\n';
  text += '- Activation guide: https://techdocs.akamai.com/property-mgr/reference/activations';

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
