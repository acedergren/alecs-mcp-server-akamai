/**
 * Advanced Property Manager Tools
 * Implements extended property management features including edge hostnames, property versions,
 * search, bulk operations, and domain validation
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

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
    const queryParams: any = {};
    if (args.contractId) {
queryParams.contractId = args.contractId;
}
    if (args.groupId) {
queryParams.groupId = args.groupId;
}

    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'GET',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    if (!response.edgeHostnames?.items || response.edgeHostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No edge hostnames found${args.contractId ? ` for contract ${args.contractId}` : ''}.\n\n💡 **Tip:** Edge hostnames are created automatically when you:\n- Create properties\n- Use the "create_edge_hostname" tool`,
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
      const secure = eh.secure ? '🔒 Yes' : '❌ No';
      const status = eh.status || 'Active';
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
  } catch (error) {
    return formatError('list edge hostnames', error);
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
      const listResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'GET',
      });

      const found = listResponse.edgeHostnames?.items?.find(
        (eh: any) =>
          eh.edgeHostnameDomain === args.edgeHostnameId ||
          `${eh.domainPrefix}.${eh.domainSuffix}` === args.edgeHostnameId,
      );

      if (!found) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Edge hostname "${args.edgeHostnameId}" not found.\n\n💡 **Tip:** Use "list_edge_hostnames" to see available edge hostnames.`,
            },
          ],
        };
      }

      edgeHostnameId = found.edgeHostnameId;
    }

    const response = await client.request({
      path: `/papi/v1/edgehostnames/${edgeHostnameId}`,
      method: 'GET',
    });

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
    text += `- **Status:** ${eh.status || 'Active'}\n\n`;

    if (eh.mapDetails) {
      text += '## Mapping Details\n';
      text += `- **Serial Number:** ${eh.mapDetails.serialNumber || 'N/A'}\n`;
      text += `- **Slot Number:** ${eh.mapDetails.slotNumber || 'N/A'}\n\n`;
    }

    if (eh.useCases && eh.useCases.length > 0) {
      text += '## Use Cases\n';
      for (const uc of eh.useCases) {
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
  } catch (error) {
    return formatError('get edge hostname', error);
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
    const sourceResponse = await client.request({
      path: `/papi/v1/properties/${args.sourcePropertyId}`,
      method: 'GET',
    });

    const sourceProperty = sourceResponse.properties?.items?.[0];
    if (!sourceProperty) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Source property ${args.sourcePropertyId} not found.\n\n💡 **Tip:** Use "list_properties" to find valid property IDs.`,
          },
        ],
      };
    }

    // Use source property's contract/group if not specified
    const contractId = args.contractId || sourceProperty.contractId;
    const groupId = args.groupId || sourceProperty.groupId;

    // Clone the property
    const cloneResponse = await client.request({
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

    const newPropertyId = cloneResponse.propertyLink?.split('/').pop()?.split('?')[0];

    let text = '✅ **Property Cloned Successfully!**\n\n';
    text += '## Clone Details\n';
    text += `- **New Property Name:** ${args.propertyName}\n`;
    text += `- **New Property ID:** ${newPropertyId}\n`;
    text += `- **Cloned From:** ${sourceProperty.propertyName} (${args.sourcePropertyId})\n`;
    text += `- **Product:** ${sourceProperty.productId}\n`;
    text += `- **Contract:** ${contractId}\n`;
    text += `- **Group:** ${groupId}\n`;
    text += `- **Hostnames Cloned:** ${args.cloneHostnames ? 'Yes' : 'No'}\n\n`;

    text += '## What Was Cloned\n';
    text += '✅ Property configuration and rules\n';
    text += '✅ Origin server settings\n';
    text += '✅ Caching behaviors\n';
    text += '✅ Performance optimizations\n';
    if (args.cloneHostnames) {
      text += '✅ Property hostnames\n';
    } else {
      text += '❌ Property hostnames (need to be added manually)\n';
    }
    text += '❌ SSL certificates (need separate enrollment)\n';
    text += '❌ Activation status (starts as NEW)\n\n';

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
  } catch (error) {
    return formatError('clone property', error);
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
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Property ${args.propertyId} not found.`,
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
            text: `❌ Cannot delete property "${property.propertyName}" (${args.propertyId}).\n\n**Reason:** Property has active versions:\n- Production: ${property.productionVersion || 'None'}\n- Staging: ${property.stagingVersion || 'None'}\n\n**Solution:** Deactivate all versions first:\n1. \`"Deactivate property ${args.propertyId} from production"\`\n2. \`"Deactivate property ${args.propertyId} from staging"\`\n3. Then retry deletion`,
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
          text: `✅ **Property Deleted Successfully**\n\n**Deleted Property:**\n- Name: ${property.propertyName}\n- ID: ${args.propertyId}\n- Contract: ${property.contractId}\n- Group: ${property.groupId}\n\n⚠️ **Note:** This action cannot be undone.`,
        },
      ],
    };
  } catch (error) {
    return formatError('remove property', error);
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
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'GET',
      queryParams: {
        limit: limit.toString(),
      },
    });

    if (!response.versions?.items || response.versions.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No versions found for property ${args.propertyId}.\n\n💡 **Tip:** Verify the property ID is correct.`,
          },
        ],
      };
    }

    // Get property details for context
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    const property = propertyResponse.properties?.items?.[0];

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
      let status = '🔵 Draft';
      if (property?.productionVersion === versionNum) {
        status = '🟢 Production';
      } else if (property?.stagingVersion === versionNum) {
        status = '🟡 Staging';
      }

      const updatedBy = version.updatedByUser || 'Unknown';
      const updatedDate = version.updatedDate
        ? new Date(version.updatedDate).toLocaleDateString()
        : 'Unknown';
      const note = version.note || '-';

      text += `| v${versionNum} | ${status} | ${updatedBy} | ${updatedDate} | ${note} |\n`;
    }

    text += '\n## Version Status Legend\n';
    text += '- 🟢 **Production**: Currently active in production\n';
    text += '- 🟡 **Staging**: Currently active in staging\n';
    text += '- 🔵 **Draft**: Not activated\n\n';

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
  } catch (error) {
    return formatError('list property versions', error);
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
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}`,
      method: 'GET',
    });

    const version = response.versions?.items?.[0];
    if (!version) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Version ${args.version} not found for property ${args.propertyId}.`,
          },
        ],
      };
    }

    // Get property details for activation status
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });
    const property = propertyResponse.properties?.items?.[0];

    let text = `# Property Version Details: v${version.propertyVersion}\n\n`;
    text += `**Property:** ${property?.propertyName || args.propertyId}\n\n`;

    text += '## Version Information\n';
    text += `- **Version Number:** ${version.propertyVersion}\n`;
    text += `- **Created From:** v${version.createdFromVersion || 'N/A'}\n`;
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
      text += '- ✅ **Currently active in PRODUCTION**\n';
      text += `- Production Status: ${version.productionStatus || 'ACTIVE'}\n`;
    } else {
      text += '- ❌ Not active in production\n';
    }

    if (property?.stagingVersion === versionNum) {
      text += '- ✅ **Currently active in STAGING**\n';
      text += `- Staging Status: ${version.stagingStatus || 'ACTIVE'}\n`;
    } else {
      text += '- ❌ Not active in staging\n';
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
  } catch (error) {
    return formatError('get property version', error);
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
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Property ${args.propertyId} not found.`,
          },
        ],
      };
    }

    let targetVersion: number | undefined;
    let versionType: string;

    switch (args.activatedOn) {
      case 'PRODUCTION':
        targetVersion = property.productionVersion;
        versionType = 'Production';
        break;
      case 'STAGING':
        targetVersion = property.stagingVersion;
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
            text: `❌ No ${versionType.toLowerCase()} version found for property "${property.propertyName}".\n\n💡 **Tip:** This property may not have been activated to ${versionType.toLowerCase()} yet.`,
          },
        ],
      };
    }

    // Get version details
    const versionResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${targetVersion}`,
      method: 'GET',
    });

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
    text += `- **Latest Version:** v${property.latestVersion}${targetVersion === property.latestVersion ? ' ✅ (this version)' : ''}\n`;
    text += `- **Production Version:** ${property.productionVersion ? `v${property.productionVersion}` : 'None'}${targetVersion === property.productionVersion ? ' ✅ (this version)' : ''}\n`;
    text += `- **Staging Version:** ${property.stagingVersion ? `v${property.stagingVersion}` : 'None'}${targetVersion === property.stagingVersion ? ' ✅ (this version)' : ''}\n\n`;

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
  } catch (error) {
    return formatError('get latest property version', error);
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
    const activationResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    const activation = activationResponse.activations?.items?.[0];
    if (!activation) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Activation ${args.activationId} not found for property ${args.propertyId}.`,
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
            text: `❌ Cannot cancel activation ${args.activationId}.\n\n**Status:** ${activation.status}\n**Reason:** Activation can only be cancelled when status is PENDING or in progress.\n\n💡 **Tip:** If the activation is already ACTIVE, you can roll back by activating a previous version.`,
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
          text: `✅ **Activation Cancelled Successfully**\n\n**Cancelled Activation:**\n- Activation ID: ${args.activationId}\n- Property: ${activation.propertyName}\n- Version: v${activation.propertyVersion}\n- Network: ${activation.network}\n- Previous Status: ${activation.status}\n\n**What Happens Next:**\n- The activation process has been stopped\n- The currently active version (if any) remains active\n- You can create a new activation when ready\n\n**Next Steps:**\n- Fix any issues with version ${activation.propertyVersion}\n- Create new activation: \`"Activate property ${args.propertyId} version ${activation.propertyVersion} to ${activation.network.toLowerCase()}"\`\n- Or activate a different version: \`"List versions for property ${args.propertyId}"\``,
        },
      ],
    };
  } catch (error) {
    return formatError('cancel property activation', error);
  }
}

interface SearchCriteria {
  propertyName?: string;
  hostname?: string;
  edgeHostname?: string;
  contractId?: string;
  groupId?: string;
  productId?: string;
  activationStatus?: 'production' | 'staging' | 'any' | 'none';
}

interface PropertySearchResult {
  propertyId: string;
  propertyName: string;
  contractId: string;
  groupId: string;
  productId: string;
  latestVersion: number;
  productionVersion?: number;
  stagingVersion?: number;
  matchedOn: Array<{
    field: string;
    value: string;
  }>;
  hostnames?: Array<{
    hostname: string;
    edgeHostname: string;
  }>;
}

/**
 * Search properties by name, hostname, or edge hostname
 * Enhanced version with multiple criteria support
 */
export async function searchProperties(
  client: AkamaiClient,
  args: {
    searchTerm?: string;
    searchBy?: 'name' | 'hostname' | 'edgeHostname';
    propertyName?: string;
    hostname?: string;
    edgeHostname?: string;
    contractId?: string;
    groupId?: string;
    productId?: string;
    activationStatus?: 'production' | 'staging' | 'any' | 'none';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Handle legacy searchTerm parameter
    let searchCriteria: SearchCriteria = {};

    if (args.searchTerm) {
      // Legacy mode - use searchTerm with searchBy
      switch (args.searchBy) {
        case 'hostname':
          searchCriteria.hostname = args.searchTerm;
          break;
        case 'edgeHostname':
          searchCriteria.edgeHostname = args.searchTerm;
          break;
        case 'name':
        default:
          searchCriteria.propertyName = args.searchTerm;
          break;
      }
    } else {
      // New enhanced mode - use individual criteria
      searchCriteria = {
        propertyName: args.propertyName,
        hostname: args.hostname,
        edgeHostname: args.edgeHostname,
        contractId: args.contractId,
        groupId: args.groupId,
        productId: args.productId,
        activationStatus: args.activationStatus,
      };
    }

    // Validate at least one search criterion is provided
    if (
      !searchCriteria.propertyName &&
      !searchCriteria.hostname &&
      !searchCriteria.edgeHostname &&
      !searchCriteria.contractId &&
      !searchCriteria.groupId &&
      !searchCriteria.productId
    ) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ **No search criteria provided**\n\nPlease specify at least one of:\n- propertyName\n- hostname\n- edgeHostname\n- contractId\n- groupId\n- productId\n- activationStatus\n\nOr use legacy format with searchTerm parameter.',
          },
        ],
      };
    }

    const results: PropertySearchResult[] = [];
    const searchStartTime = Date.now();

    // Get all properties first
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (!groupsResponse.groups?.items?.length) {
      return {
        content: [
          {
            type: 'text',
            text: 'No groups found. Unable to search properties.',
          },
        ],
      };
    }

    // Filter groups if groupId is specified
    let searchGroups = groupsResponse.groups.items;
    if (searchCriteria.groupId) {
      searchGroups = searchGroups.filter((g: any) => g.groupId === searchCriteria.groupId);
    }

    // Search through properties in each group
    for (const group of searchGroups) {
      if (!group.contractIds?.length) {
continue;
}

      // Filter contracts if contractId is specified
      let searchContracts = group.contractIds;
      if (searchCriteria.contractId) {
        searchContracts = searchContracts.filter((c: string) => c === searchCriteria.contractId);
      }

      for (const contractId of searchContracts) {
        try {
          const propertiesResponse = await client.request({
            path: '/papi/v1/properties',
            method: 'GET',
            queryParams: {
              contractId: contractId,
              groupId: group.groupId,
            },
          });

          const properties = propertiesResponse.properties?.items || [];

          for (const property of properties) {
            const matches: PropertySearchResult['matchedOn'] = [];

            // Check property name
            if (
              searchCriteria.propertyName &&
              property.propertyName
                .toLowerCase()
                .includes(searchCriteria.propertyName.toLowerCase())
            ) {
              matches.push({ field: 'propertyName', value: property.propertyName });
            }

            // Check product ID
            if (searchCriteria.productId && property.productId === searchCriteria.productId) {
              matches.push({ field: 'productId', value: property.productId });
            }

            // Check activation status
            if (searchCriteria.activationStatus) {
              const hasProduction = !!property.productionVersion;
              const hasStaging = !!property.stagingVersion;

              let statusMatch = false;
              switch (searchCriteria.activationStatus) {
                case 'production':
                  statusMatch = hasProduction;
                  break;
                case 'staging':
                  statusMatch = hasStaging && !hasProduction;
                  break;
                case 'any':
                  statusMatch = hasProduction || hasStaging;
                  break;
                case 'none':
                  statusMatch = !hasProduction && !hasStaging;
                  break;
              }

              if (statusMatch) {
                matches.push({
                  field: 'activationStatus',
                  value: searchCriteria.activationStatus,
                });
              }
            }

            // For hostname/edgeHostname search, we need to fetch property hostnames
            if (searchCriteria.hostname || searchCriteria.edgeHostname) {
              try {
                const hostnamesResponse = await client.request({
                  path: `/papi/v1/properties/${property.propertyId}/hostnames`,
                  method: 'GET',
                });

                const hostnames = hostnamesResponse.hostnames?.items || [];
                const propertyHostnames: PropertySearchResult['hostnames'] = [];

                for (const hn of hostnames) {
                  propertyHostnames.push({
                    hostname: hn.cnameFrom,
                    edgeHostname: hn.cnameTo,
                  });

                  if (
                    searchCriteria.hostname &&
                    hn.cnameFrom.toLowerCase().includes(searchCriteria.hostname.toLowerCase())
                  ) {
                    matches.push({ field: 'hostname', value: hn.cnameFrom });
                  }

                  if (
                    searchCriteria.edgeHostname &&
                    hn.cnameTo.toLowerCase().includes(searchCriteria.edgeHostname.toLowerCase())
                  ) {
                    matches.push({ field: 'edgeHostname', value: hn.cnameTo });
                  }
                }

                // Store hostnames if we have matches
                if (matches.length > 0) {
                  property.hostnames = propertyHostnames;
                }
              } catch (err) {
                // Continue if unable to fetch hostnames
              }
            }

            // Add to results if we have any matches
            if (matches.length > 0) {
              results.push({
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                contractId: contractId,
                groupId: group.groupId,
                productId: property.productId,
                latestVersion: property.latestVersion,
                productionVersion: property.productionVersion,
                stagingVersion: property.stagingVersion,
                matchedOn: matches,
                hostnames: property.hostnames,
              });
            }
          }
        } catch (err) {
          // Continue with next contract
        }
      }
    }

    // Format results
    const searchTime = ((Date.now() - searchStartTime) / 1000).toFixed(2);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: formatNoResults(searchCriteria, searchTime),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: formatSearchResults(results, searchCriteria, searchTime),
        },
      ],
    };
  } catch (error) {
    return formatError('search properties', error);
  }
}

/**
 * Format search results
 */
function formatSearchResults(
  results: PropertySearchResult[],
  criteria: SearchCriteria,
  searchTime: string,
): string {
  let text = '# Property Search Results\n\n';
  text += `Found **${results.length}** propert${results.length !== 1 ? 'ies' : 'y'} `;
  text += `(search completed in ${searchTime}s)\n\n`;

  // Show search criteria
  text += '## Search Criteria\n';
  if (criteria.propertyName) {
text += `- Property Name: *${criteria.propertyName}*\n`;
}
  if (criteria.hostname) {
text += `- Hostname: *${criteria.hostname}*\n`;
}
  if (criteria.edgeHostname) {
text += `- Edge Hostname: *${criteria.edgeHostname}*\n`;
}
  if (criteria.contractId) {
text += `- Contract: ${criteria.contractId}\n`;
}
  if (criteria.groupId) {
text += `- Group: ${criteria.groupId}\n`;
}
  if (criteria.productId) {
text += `- Product: ${criteria.productId}\n`;
}
  if (criteria.activationStatus) {
text += `- Activation Status: ${criteria.activationStatus}\n`;
}
  text += '\n';

  // Show results
  text += '## Results\n\n';

  // Summary table
  text += '| Property Name | ID | Product | Status | Matched On |\n';
  text += '|---------------|-----|---------|--------|------------|\n';

  for (const result of results) {
    const status = result.productionVersion
      ? '🟢 Prod'
      : result.stagingVersion
        ? '🟡 Stage'
        : '🔵 Draft';

    const matchedFields = [...new Set(result.matchedOn.map((m) => m.field))].join(', ');

    text += `| ${result.propertyName} | ${result.propertyId} | ${result.productId} | ${status} | ${matchedFields} |\n`;
  }

  // Detailed view for properties with hostname matches
  const hostnameMatches = results.filter((r) => r.hostnames && r.hostnames.length > 0);
  if (hostnameMatches.length > 0) {
    text += '\n### Hostname Details\n\n';
    for (const result of hostnameMatches) {
      text += `**${result.propertyName}** (${result.propertyId})\n`;
      if (result.hostnames) {
        for (const hn of result.hostnames) {
          text += `- ${hn.hostname} → ${hn.edgeHostname}\n`;
        }
      }
      text += '\n';
    }
  }

  text += '## Next Steps\n';
  if (results.length === 1) {
    const propId = results[0].propertyId;
    text += `- View details: \`"Get property ${propId}"\`\n`;
    text += `- View rules: \`"Get property ${propId} rules"\`\n`;
    text += `- View hostnames: \`"List hostnames for property ${propId}"\`\n`;
  } else {
    text += '- View property details: `"Get property [propertyId]"`\n';
    text += '- Refine search by adding more criteria\n';
  }

  return text;
}

/**
 * Format no results message
 */
function formatNoResults(criteria: SearchCriteria, searchTime: string): string {
  let text = '# No Properties Found\n\n';
  text += `Search completed in ${searchTime}s\n\n`;

  text += '## Search Criteria Used\n';
  if (criteria.propertyName) {
text += `- Property Name: *${criteria.propertyName}*\n`;
}
  if (criteria.hostname) {
text += `- Hostname: *${criteria.hostname}*\n`;
}
  if (criteria.edgeHostname) {
text += `- Edge Hostname: *${criteria.edgeHostname}*\n`;
}
  if (criteria.contractId) {
text += `- Contract: ${criteria.contractId}\n`;
}
  if (criteria.groupId) {
text += `- Group: ${criteria.groupId}\n`;
}
  if (criteria.productId) {
text += `- Product: ${criteria.productId}\n`;
}
  if (criteria.activationStatus) {
text += `- Activation Status: ${criteria.activationStatus}\n`;
}
  text += '\n';

  text += '## Suggestions\n';
  text += '- Check spelling and try partial names\n';
  text += '- Remove some criteria to broaden the search\n';
  text += '- Verify you have access to the contract/group\n';
  text += '- Use "List all properties" to see available properties\n';

  return text;
}

/**
 * List all hostnames across all properties in an account
 */
export async function listAllHostnames(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    includeDetails?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get all properties
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    });

    if (!groupsResponse.groups?.items?.length) {
      return {
        content: [
          {
            type: 'text',
            text: 'No groups found. Unable to list hostnames.',
          },
        ],
      };
    }

    const allHostnames: Array<{
      hostname: string;
      edgeHostname: string;
      propertyId: string;
      propertyName: string;
      contractId: string;
      groupId: string;
      certStatus?: string;
    }> = [];

    // Collect hostnames from all properties
    for (const group of groupsResponse.groups.items) {
      if (args.groupId && group.groupId !== args.groupId) {
continue;
}
      if (!group.contractIds?.length) {
continue;
}

      for (const contractId of group.contractIds) {
        if (args.contractId && contractId !== args.contractId) {
continue;
}

        try {
          const propertiesResponse = await client.request({
            path: '/papi/v1/properties',
            method: 'GET',
            queryParams: {
              contractId: contractId,
              groupId: group.groupId,
            },
          });

          const properties = propertiesResponse.properties?.items || [];

          for (const property of properties) {
            try {
              const hostnamesResponse = await client.request({
                path: `/papi/v1/properties/${property.propertyId}/hostnames`,
                method: 'GET',
              });

              const hostnames = hostnamesResponse.hostnames?.items || [];

              for (const hostname of hostnames) {
                allHostnames.push({
                  hostname: hostname.cnameFrom,
                  edgeHostname: hostname.cnameTo,
                  propertyId: property.propertyId,
                  propertyName: property.propertyName,
                  contractId: contractId,
                  groupId: group.groupId,
                  certStatus: hostname.certStatus?.production?.[0]?.status || 'Unknown',
                });
              }
            } catch (err) {
              // Continue if unable to get hostnames for a property
            }
          }
        } catch (err) {
          // Continue with next contract
        }
      }
    }

    if (allHostnames.length === 0) {
      let message = 'No hostnames found';
      if (args.contractId) {
message += ` for contract ${args.contractId}`;
}
      if (args.groupId) {
message += ` in group ${args.groupId}`;
}
      message += '.';

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    }

    // Sort hostnames alphabetically
    allHostnames.sort((a, b) => a.hostname.localeCompare(b.hostname));

    let text = `# All Property Hostnames (${allHostnames.length} found)\n\n`;

    if (args.contractId) {
text += `**Contract:** ${args.contractId}\n`;
}
    if (args.groupId) {
text += `**Group:** ${args.groupId}\n`;
}
    text += '\n';

    if (args.includeDetails) {
      text += '| Hostname | Property | Edge Hostname | Cert Status |\n';
      text += '|----------|----------|---------------|-------------|\n';

      for (const h of allHostnames) {
        text += `| ${h.hostname} | ${h.propertyName} | ${h.edgeHostname} | ${h.certStatus} |\n`;
      }
    } else {
      // Group by property for better readability
      const byProperty = new Map<string, typeof allHostnames>();
      for (const h of allHostnames) {
        const key = h.propertyId;
        if (!byProperty.has(key)) {
          byProperty.set(key, []);
        }
        byProperty.get(key)!.push(h);
      }

      for (const [propId, hostnames] of byProperty) {
        const propName = hostnames[0]?.propertyName || propId;
        text += `## ${propName} (${propId})\n`;
        for (const h of hostnames) {
          text += `- ${h.hostname} → ${h.edgeHostname}\n`;
        }
        text += '\n';
      }
    }

    text += '## Summary\n';
    text += `- Total hostnames: ${allHostnames.length}\n`;
    text += `- Unique properties: ${new Set(allHostnames.map((h) => h.propertyId)).size}\n\n`;

    text += '## Next Steps\n';
    text += '- View with details: `"List all hostnames with details"`\n';
    text += '- Search for specific hostname: `"Search properties by hostname example.com"`\n';
    text += '- Add new hostname: `"Add hostname www.newsite.com to property prp_XXX"`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return formatError('list all hostnames', error);
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
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      const property = propertyResponse.properties?.items?.[0];
      if (!property) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Property ${args.propertyId} not found.`,
            },
          ],
        };
      }

      version = property.latestVersion || 1;
    }

    // Get hostnames for the version
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
      queryParams: args.validateCnames ? { validateCnames: 'true' } : undefined,
    });

    if (!response.hostnames?.items || response.hostnames.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No hostnames configured for property ${args.propertyId} version ${version}.\n\n💡 **Tip:** Add hostnames using:\n\`"Add hostname www.example.com to property ${args.propertyId}"\``,
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

    if (args.validateCnames && response.errors?.length > 0) {
      text += '\n## ⚠️ Validation Errors\n';
      for (const error of response.errors) {
        text += `- ${error.detail}\n`;
      }
    }

    if (args.validateCnames && response.warnings?.length > 0) {
      text += '\n## ⚠️ Warnings\n';
      for (const warning of response.warnings) {
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
  } catch (error) {
    return formatError('list property version hostnames', error);
  }
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';

  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;

    // Provide specific solutions based on error type
    if (error.message.includes('401') || error.message.includes('credentials')) {
      solution = '**Solution:** Check your ~/.edgerc file has valid credentials.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      solution = '**Solution:** Invalid request parameters. Check the input values.';
    } else if (error.message.includes('409') || error.message.includes('Conflict')) {
      solution = '**Solution:** Resource conflict. The operation may already be in progress.';
    }
  } else {
    errorMessage += `: ${String(error)}`;
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
