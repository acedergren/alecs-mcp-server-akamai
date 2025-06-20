/**
 * Property Manager Includes Management Tools
 * Comprehensive tools for managing PAPI includes - essential for modular property management
 */

import { handleApiError } from '@utils/error-handling';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

/**
 * List available includes
 */
export async function listIncludes(
  client: AkamaiClient,
  args: {
    contractId: string;
    groupId: string;
    includeType?: 'MICROSERVICES' | 'COMMON_SETTINGS' | 'ALL';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    if (args.includeType && args.includeType !== 'ALL') {
      params.append('includeType', args.includeType);
    }

    const response = await client.request({
      path: `/papi/v1/includes?${params.toString()}`,
      method: 'GET',
    });

    const includes = response.includes?.items || [];

    let responseText = '# Includes List\n\n';
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    if (args.includeType) {
      responseText += `**Type Filter:** ${args.includeType}\n`;
    }
    responseText += `**Total Includes:** ${includes.length}\n\n`;

    if (includes.length === 0) {
      responseText += 'No includes found.\n';
      return {
        content: [{ type: 'text', text: responseText }],
      };
    }

    // Group by type
    const groupedIncludes = includes.reduce((groups: any, include: any) => {
      const type = include.includeType || 'UNKNOWN';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(include);
      return groups;
    }, {});

    for (const [type, typeIncludes] of Object.entries(groupedIncludes)) {
      responseText += `## ${type} Includes\n\n`;

      (typeIncludes as any[]).forEach((include: any) => {
        responseText += `### ${include.includeName}\n`;
        responseText += `- **ID:** ${include.includeId}\n`;
        responseText += `- **Version:** ${include.latestVersion || 'N/A'}\n`;
        responseText += `- **Type:** ${include.includeType}\n`;
        responseText += `- **Created:** ${new Date(include.createdDate).toISOString()}\n`;
        responseText += `- **Modified:** ${new Date(include.updatedDate).toISOString()}\n`;
        if (include.productionVersion) {
          responseText += `- **Production Version:** ${include.productionVersion}\n`;
        }
        if (include.stagingVersion) {
          responseText += `- **Staging Version:** ${include.stagingVersion}\n`;
        }
        if (include.ruleFormat) {
          responseText += `- **Rule Format:** ${include.ruleFormat}\n`;
        }
        responseText += '\n';
      });
    }

    // Summary statistics
    responseText += '## Summary\n\n';
    for (const [type, typeIncludes] of Object.entries(groupedIncludes)) {
      responseText += `- **${type}:** ${(typeIncludes as any[]).length} includes\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'listing includes');
  }
}

/**
 * Get detailed information about a specific include
 */
export async function getInclude(
  client: AkamaiClient,
  args: {
    includeId: string;
    contractId: string;
    groupId: string;
    version?: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const versionPath = args.version ? `/versions/${args.version}` : '';
    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}${versionPath}?${params.toString()}`,
      method: 'GET',
    });

    const include = response.includes?.items?.[0] || response.include;

    if (!include) {
      return {
        content: [
          {
            type: 'text',
            text: `Include ${args.includeId} not found.`,
          },
        ],
      };
    }

    let responseText = '# Include Details\n\n';
    responseText += `**Name:** ${include.includeName}\n`;
    responseText += `**ID:** ${include.includeId}\n`;
    responseText += `**Type:** ${include.includeType}\n`;
    if (args.version) {
      responseText += `**Version:** ${args.version}\n`;
    } else {
      responseText += `**Latest Version:** ${include.latestVersion || 'N/A'}\n`;
    }
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Created:** ${new Date(include.createdDate).toISOString()}\n`;
    responseText += `**Modified:** ${new Date(include.updatedDate).toISOString()}\n`;

    if (include.ruleFormat) {
      responseText += `**Rule Format:** ${include.ruleFormat}\n`;
    }

    if (include.productionVersion) {
      responseText += `**Production Version:** ${include.productionVersion}\n`;
    }

    if (include.stagingVersion) {
      responseText += `**Staging Version:** ${include.stagingVersion}\n`;
    }

    responseText += '\n';

    // Include note if available
    if (include.note) {
      responseText += `## Notes\n\n${include.note}\n\n`;
    }

    // Version information
    if (include.versions) {
      responseText += '## Available Versions\n\n';
      include.versions.items?.forEach((version: any) => {
        responseText += `- **Version ${version.includeVersion}**`;
        if (version.note) {
          responseText += `: ${version.note}`;
        }
        responseText += ` (${new Date(version.updatedDate).toISOString()})\n`;
      });
      responseText += '\n';
    }

    // Rules information if available
    if (include.rules) {
      responseText += '## Rule Tree Structure\n\n';
      responseText += `- **Rules:** ${JSON.stringify(include.rules, null, 2).slice(0, 500)}...\n\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'getting include details');
  }
}

/**
 * Create a new include
 */
export async function createInclude(
  client: AkamaiClient,
  args: {
    includeName: string;
    includeType: 'MICROSERVICES' | 'COMMON_SETTINGS';
    contractId: string;
    groupId: string;
    ruleFormat?: string;
    cloneFrom?: {
      includeId: string;
      version: number;
    };
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const requestBody: any = {
      includeName: args.includeName,
      includeType: args.includeType,
      contractId: args.contractId,
      groupId: args.groupId,
    };

    if (args.ruleFormat) {
      requestBody.ruleFormat = args.ruleFormat;
    }

    if (args.cloneFrom) {
      requestBody.cloneFrom = args.cloneFrom;
    }

    const response = await client.request({
      path: '/papi/v1/includes',
      method: 'POST',
      body: requestBody,
    });

    const includeLink = response.includeLink;
    const includeId = includeLink?.split('/').pop()?.split('?')[0];

    let responseText = '# Include Created Successfully\n\n';
    responseText += `**Name:** ${args.includeName}\n`;
    responseText += `**Type:** ${args.includeType}\n`;
    responseText += `**Include ID:** ${includeId}\n`;
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;

    if (args.ruleFormat) {
      responseText += `**Rule Format:** ${args.ruleFormat}\n`;
    }

    if (args.cloneFrom) {
      responseText += `**Cloned From:** ${args.cloneFrom.includeId} v${args.cloneFrom.version}\n`;
    }

    responseText += `**Created:** ${new Date().toISOString()}\n\n`;

    responseText += '## Next Steps\n\n';
    responseText += '1. **Configure Rules:** Update the include\'s rule tree\n';
    responseText += '2. **Create Version:** Create a new version when ready\n';
    responseText += '3. **Activate:** Activate to staging/production networks\n';
    responseText += '4. **Reference:** Use this include in property configurations\n\n';

    responseText += '## API Response\n\n';
    responseText += `Include Link: ${includeLink}\n`;

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'creating include');
  }
}

/**
 * Update include rules
 */
export async function updateInclude(
  client: AkamaiClient,
  args: {
    includeId: string;
    contractId: string;
    groupId: string;
    rules: any;
    version?: number;
    note?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const versionPath = args.version ? `/versions/${args.version}` : '';
    const requestBody: any = {
      rules: args.rules,
    };

    if (args.note) {
      requestBody.note = args.note;
    }

    await client.request({
      path: `/papi/v1/includes/${args.includeId}${versionPath}/rules?${params.toString()}`,
      method: 'PUT',
      body: requestBody,
    });

    let responseText = '# Include Updated Successfully\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    if (args.version) {
      responseText += `**Version:** ${args.version}\n`;
    }
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Updated:** ${new Date().toISOString()}\n`;

    if (args.note) {
      responseText += `**Note:** ${args.note}\n`;
    }

    responseText += '\n';

    // Rules summary
    responseText += '## Rules Summary\n\n';
    if (args.rules?.rules?.length) {
      responseText += `- **Total Rules:** ${args.rules.rules.length}\n`;
      responseText += `- **Rule Format:** ${args.rules.ruleFormat || 'N/A'}\n`;
    }

    responseText += '\n## Next Steps\n\n';
    responseText += '1. **Validate:** Check rule validation status\n';
    responseText += '2. **Create Version:** Create new version if needed\n';
    responseText += '3. **Test:** Test in staging environment\n';
    responseText += '4. **Activate:** Deploy to production when ready\n';

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'updating include');
  }
}

/**
 * Create a new version of an include
 */
export async function createIncludeVersion(
  client: AkamaiClient,
  args: {
    includeId: string;
    contractId: string;
    groupId: string;
    baseVersion?: number;
    note?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const requestBody: any = {};

    if (args.baseVersion) {
      requestBody.createFromVersion = args.baseVersion;
    }

    if (args.note) {
      requestBody.note = args.note;
    }

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/versions?${params.toString()}`,
      method: 'POST',
      body: requestBody,
    });

    const versionLink = response.versionLink;
    const newVersion = versionLink?.split('/').pop()?.split('?')[0];

    let responseText = '# Include Version Created\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**New Version:** ${newVersion}\n`;
    if (args.baseVersion) {
      responseText += `**Based on Version:** ${args.baseVersion}\n`;
    }
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Created:** ${new Date().toISOString()}\n`;

    if (args.note) {
      responseText += `**Note:** ${args.note}\n`;
    }

    responseText += '\n';

    responseText += '## Version Information\n\n';
    responseText += `Version Link: ${versionLink}\n\n`;

    responseText += '## Next Steps\n\n';
    responseText += '1. **Configure:** Update rules if needed\n';
    responseText += '2. **Validate:** Ensure rules are valid\n';
    responseText += '3. **Activate:** Deploy to staging/production\n';

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'creating include version');
  }
}

/**
 * Activate an include version
 */
export async function activateInclude(
  client: AkamaiClient,
  args: {
    includeId: string;
    version: number;
    network: 'STAGING' | 'PRODUCTION';
    contractId: string;
    groupId: string;
    note?: string;
    notifyEmails?: string[];
    acknowledgeAllWarnings?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const requestBody: any = {
      network: args.network,
      note: args.note || `Activating include ${args.includeId} v${args.version} to ${args.network}`,
      acknowledgeAllWarnings: args.acknowledgeAllWarnings || false,
    };

    if (args.notifyEmails && args.notifyEmails.length > 0) {
      requestBody.notifyEmails = args.notifyEmails;
    }

    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/versions/${args.version}/activations?${params.toString()}`,
      method: 'POST',
      body: requestBody,
    });

    const activationLink = response.activationLink;
    const activationId = activationLink?.split('/').pop()?.split('?')[0];

    let responseText = '# Include Activation Initiated\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Network:** ${args.network}\n`;
    responseText += `**Activation ID:** ${activationId}\n`;
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Initiated:** ${new Date().toISOString()}\n`;

    if (args.note) {
      responseText += `**Note:** ${args.note}\n`;
    }

    if (args.notifyEmails) {
      responseText += `**Notifications:** ${args.notifyEmails.join(', ')}\n`;
    }

    responseText += '\n';

    responseText += '## Activation Details\n\n';
    responseText += `Activation Link: ${activationLink}\n\n`;

    responseText += '## Monitoring\n\n';
    responseText += 'Use `getIncludeActivationStatus` to monitor progress:\n';
    responseText += '```\n';
    responseText += `getIncludeActivationStatus --includeId ${args.includeId} --activationId ${activationId}\n`;
    responseText += '```\n\n';

    responseText += '## Expected Timeline\n\n';
    if (args.network === 'STAGING') {
      responseText += '- **Staging activations** typically complete in 1-5 minutes\n';
    } else {
      responseText += '- **Production activations** typically complete in 5-20 minutes\n';
    }
    responseText += '- You will receive email notifications when activation completes\n';

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'activating include');
  }
}

/**
 * Get include activation status
 */
export async function getIncludeActivationStatus(
  client: AkamaiClient,
  args: {
    includeId: string;
    activationId: string;
    contractId: string;
    groupId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/activations/${args.activationId}?${params.toString()}`,
      method: 'GET',
    });

    const activation = response.activations?.items?.[0];

    if (!activation) {
      return {
        content: [
          {
            type: 'text',
            text: `Activation ${args.activationId} not found for include ${args.includeId}.`,
          },
        ],
      };
    }

    let responseText = '# Include Activation Status\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Activation ID:** ${args.activationId}\n`;
    responseText += `**Version:** ${activation.includeVersion}\n`;
    responseText += `**Network:** ${activation.network}\n`;
    responseText += `**Status:** ${activation.status}\n`;
    responseText += `**Submitted:** ${new Date(activation.submitDate).toISOString()}\n`;

    if (activation.updateDate) {
      responseText += `**Last Updated:** ${new Date(activation.updateDate).toISOString()}\n`;
    }

    if (activation.note) {
      responseText += `**Note:** ${activation.note}\n`;
    }

    responseText += '\n';

    // Status-specific information
    responseText += '## Status Details\n\n';
    switch (activation.status) {
      case 'ACTIVE':
        responseText += `✅ **Activation Complete** - Include is now live on ${activation.network}\n`;
        if (activation.updateDate) {
          responseText += `Completed: ${new Date(activation.updateDate).toISOString()}\n`;
        }
        break;
      case 'PENDING':
        responseText += '⏳ **Activation in Progress** - Include is being deployed\n';
        responseText += 'This typically takes 1-20 minutes depending on network\n';
        break;
      case 'FAILED':
        responseText += '❌ **Activation Failed** - Deployment encountered errors\n';
        break;
      case 'DEACTIVATED':
        responseText += '🔄 **Deactivated** - Include has been deactivated\n';
        break;
      default:
        responseText += `Status: ${activation.status}\n`;
    }

    // Warnings and errors
    if (activation.fatalError) {
      responseText += '\n## Fatal Error\n\n';
      responseText += `❌ ${activation.fatalError}\n`;
    }

    if (activation.warnings && activation.warnings.length > 0) {
      responseText += '\n## Warnings\n\n';
      activation.warnings.forEach((warning: any) => {
        responseText += `⚠️ **${warning.title}**: ${warning.detail}\n`;
      });
    }

    if (activation.errors && activation.errors.length > 0) {
      responseText += '\n## Errors\n\n';
      activation.errors.forEach((_error: any) => {
        responseText += `❌ **${error.title}**: ${error.detail}\n`;
      });
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'getting include activation status');
  }
}

/**
 * List include activations
 */
export async function listIncludeActivations(
  client: AkamaiClient,
  args: {
    includeId: string;
    contractId: string;
    groupId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId,
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/activations?${params.toString()}`,
      method: 'GET',
    });

    const activations = response.activations?.items || [];

    let responseText = '# Include Activations\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Total Activations:** ${activations.length}\n\n`;

    if (activations.length === 0) {
      responseText += 'No activations found for this include.\n';
      return {
        content: [{ type: 'text', text: responseText }],
      };
    }

    // Group by network
    const stagingActivations = activations.filter((a: any) => a.network === 'STAGING');
    const productionActivations = activations.filter((a: any) => a.network === 'PRODUCTION');

    if (stagingActivations.length > 0) {
      responseText += '## Staging Activations\n\n';
      stagingActivations.forEach((activation: any) => {
        const statusIcon =
          activation.status === 'ACTIVE'
            ? '✅'
            : activation.status === 'PENDING'
              ? '⏳'
              : activation.status === 'FAILED'
                ? '❌'
                : '❓';

        responseText += `### ${statusIcon} Version ${activation.includeVersion}\n`;
        responseText += `- **Activation ID:** ${activation.activationId}\n`;
        responseText += `- **Status:** ${activation.status}\n`;
        responseText += `- **Submitted:** ${new Date(activation.submitDate).toISOString()}\n`;
        if (activation.updateDate) {
          responseText += `- **Completed:** ${new Date(activation.updateDate).toISOString()}\n`;
        }
        if (activation.note) {
          responseText += `- **Note:** ${activation.note}\n`;
        }
        responseText += '\n';
      });
    }

    if (productionActivations.length > 0) {
      responseText += '## Production Activations\n\n';
      productionActivations.forEach((activation: any) => {
        const statusIcon =
          activation.status === 'ACTIVE'
            ? '✅'
            : activation.status === 'PENDING'
              ? '⏳'
              : activation.status === 'FAILED'
                ? '❌'
                : '❓';

        responseText += `### ${statusIcon} Version ${activation.includeVersion}\n`;
        responseText += `- **Activation ID:** ${activation.activationId}\n`;
        responseText += `- **Status:** ${activation.status}\n`;
        responseText += `- **Submitted:** ${new Date(activation.submitDate).toISOString()}\n`;
        if (activation.updateDate) {
          responseText += `- **Completed:** ${new Date(activation.updateDate).toISOString()}\n`;
        }
        if (activation.note) {
          responseText += `- **Note:** ${activation.note}\n`;
        }
        responseText += '\n';
      });
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(error, 'listing include activations');
  }
}
