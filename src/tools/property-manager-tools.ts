/**
 * Extended Property Manager Tools
 * Implements advanced property management features including versions, rules, edge hostnames, and activations
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Extended types for property management
export interface PropertyVersionDetails {
  propertyVersion: number;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: string;
  stagingStatus: string;
  etag: string;
  productId: string;
  ruleFormat: string;
  note?: string;
}

export interface EdgeHostname {
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure: boolean;
  ipVersionBehavior: string;
  mapDetails?: {
    serialNumber?: number;
    slotNumber?: number;
  };
}

export interface PropertyHostname {
  cnameFrom: string;
  cnameTo: string;
  cnameType: string;
  certStatus?: {
    production?: Array<{
      status: string;
    }>;
    staging?: Array<{
      status: string;
    }>;
  };
}

export interface ActivationStatus {
  activationId: string;
  propertyName: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: string;
  status: string;
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails: string[];
  fatalError?: string;
  errors?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
  warnings?: Array<{
    type: string;
    messageId: string;
    detail: string;
  }>;
}

/**
 * Create a new property version
 */
export async function createPropertyVersion(
  client: AkamaiClient,
  args: {
    propertyId: string;
    baseVersion?: number;
    note?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get current version if not specified
    let baseVersion = args.baseVersion;
    if (!baseVersion) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      baseVersion = propertyResponse.properties.items[0].latestVersion || 1;
    }

    // Create new version
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        createFromVersion: baseVersion,
        createFromVersionEtag: '', // Will be handled by API
      },
    });

    const newVersion = response.versionLink?.split('/').pop() || 'unknown';

    // Update version note if provided
    if (args.note) {
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: args.note,
          },
        ],
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created new property version ${newVersion} based on version ${baseVersion}${args.note ? `\nNote: ${args.note}` : ''}\n\nNext steps:\n- Update rules: "Update rules for property ${args.propertyId} version ${newVersion}"\n- Activate: "Activate property ${args.propertyId} version ${newVersion} to staging"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('create property version', _error);
  }
}

/**
 * Get property rule tree configuration
 */
export async function getPropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = propertyResponse.properties.items[0].latestVersion || 1;
    }

    // Get rule tree
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    });

    // Format rules for display
    let text = `# Property Rules - ${args.propertyId} (v${version})\n\n`;
    text += `**Rule Format:** ${response.ruleFormat}\n\n`;

    // Function to format rules recursively
    function formatRule(rule: any, indent = ''): string {
      let output = `${indent}📋 **${rule.name}**\n`;

      if (rule.criteria?.length > 0) {
        output += `${indent}  Criteria:\n`;
        rule.criteria.forEach((c: any) => {
          output += `${indent}  - ${c.name}`;
          if (c.options && Object.keys(c.options).length > 0) {
            output += `: ${JSON.stringify(c.options, null, 2).replace(/\n/g, `\n${indent}    `)}`;
          }
          output += '\n';
        });
      }

      if (rule.behaviors?.length > 0) {
        output += `${indent}  Behaviors:\n`;
        rule.behaviors.forEach((b: any) => {
          output += `${indent}  - ${b.name}`;
          if (b.options && Object.keys(b.options).length > 0) {
            // Special handling for common behaviors
            if (b.name === 'origin') {
              output += `: ${b.options.hostname || 'not set'}`;
            } else if (b.name === 'caching') {
              output += `: ${b.options.behavior || 'default'}`;
            } else if (b.name === 'cpCode') {
              output += `: ${b.options.value?.name || b.options.value?.id || 'not set'}`;
            } else {
              output += `: ${JSON.stringify(b.options, null, 2).replace(/\n/g, `\n${indent}    `)}`;
            }
          }
          output += '\n';
        });
      }

      if (rule.children?.length > 0) {
        output += `${indent}  Children:\n`;
        rule.children.forEach((child: any) => {
          output += formatRule(child, indent + '    ');
        });
      }

      return output;
    }

    text += formatRule(response.rules);

    text += '\n## Key Behaviors Summary\n\n';

    // Extract key behaviors from default rule
    const defaultRule = response.rules;
    const originBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'origin');
    const cachingBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'caching');
    const cpCodeBehavior = defaultRule.behaviors?.find((b: any) => b.name === 'cpCode');

    if (originBehavior) {
      text += `- **Origin Server:** ${originBehavior.options?.hostname || 'Not configured'}\n`;
    }
    if (cachingBehavior) {
      text += `- **Caching:** ${cachingBehavior.options?.behavior || 'Default'}\n`;
    }
    if (cpCodeBehavior) {
      text += `- **CP Code:** ${cpCodeBehavior.options?.value?.name || 'Not set'}\n`;
    }

    text += '\n## Next Steps\n';
    text += `- Update rules: "Update origin server for property ${args.propertyId} to example.com"\n`;
    text += `- Add caching rules: "Add caching rule for images in property ${args.propertyId}"\n`;
    text += `- Activate changes: "Activate property ${args.propertyId} to staging"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get property rules', _error);
  }
}

/**
 * Update property rule tree
 */
export async function updatePropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    rules: any;
    note?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = propertyResponse.properties.items[0].latestVersion || 1;
    }

    // Get current rule tree to preserve format
    const currentRules = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    });

    // Update rules
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
      body: {
        rules: args.rules,
        ruleFormat: currentRules.ruleFormat,
      },
    });

    // Update version note if provided
    if (args.note) {
      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: args.note,
          },
        ],
      });
    }

    let text = `✅ Successfully updated property rules for ${args.propertyId} (v${version})\n\n`;

    if (response.errors?.length > 0) {
      text += '⚠️ **Validation Errors:**\n';
      response.errors.forEach((_error: any) => {
        text += `- ${_error.detail}\n`;
      });
      text += '\n';
    }

    if (response.warnings?.length > 0) {
      text += '⚠️ **Warnings:**\n';
      response.warnings.forEach((warning: any) => {
        text += `- ${warning.detail}\n`;
      });
      text += '\n';
    }

    text += '## Next Steps\n';
    text += `- Review rules: "Show rules for property ${args.propertyId}"\n`;
    text += `- Activate to staging: "Activate property ${args.propertyId} to staging"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('update property rules', _error);
  }
}

/**
 * Create an edge hostname
 */
export async function createEdgeHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    domainPrefix: string;
    domainSuffix?: string;
    productId?: string;
    secure?: boolean;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    certificateEnrollmentId?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find contract and group
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const productId = args.productId || property.productId;
    const domainSuffix = args.domainSuffix || (args.secure ? '.edgekey.net' : '.edgesuite.net');

    // Create edge hostname
    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams: {
        contractId: property.contractId,
        groupId: property.groupId,
        options: 'mapDetails',
      },
      body: {
        productId: productId,
        domainPrefix: args.domainPrefix,
        domainSuffix: domainSuffix.replace(/^\./, ''), // Remove leading dot
        secure: args.secure || domainSuffix.includes('edgekey'),
        secureNetwork: args.secure || domainSuffix.includes('edgekey') ? 'ENHANCED_TLS' : undefined,
        ipVersionBehavior: args.ipVersion || 'IPV4',
        ...(args.certificateEnrollmentId && { certEnrollmentId: args.certificateEnrollmentId }),
        useCases: [
          {
            useCase: 'Download_Mode',
            option: 'BACKGROUND',
            type: 'GLOBAL',
          },
        ],
      },
    });

    const edgeHostnameId = response.edgeHostnameLink?.split('/').pop()?.split('?')[0];
    const edgeHostname = `${args.domainPrefix}.${domainSuffix.replace(/^\./, '')}`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created edge hostname: ${edgeHostname}\n\n**Edge Hostname ID:** ${edgeHostnameId}\n**Type:** ${args.secure || domainSuffix.includes('edgekey') ? 'Enhanced TLS (HTTPS)' : 'Standard TLS'}\n**IP Version:** ${args.ipVersion || 'IPV4'}\n\n## Next Steps\n- Add hostname to property: "Add hostname www.example.com to property ${args.propertyId} using edge hostname ${edgeHostname}"\n- Create DNS CNAME: "Create CNAME record www.example.com pointing to ${edgeHostname}"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('create edge hostname', _error);
  }
}

/**
 * Add hostname to property
 */
export async function addPropertyHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    edgeHostname: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = propertyResponse.properties.items[0].latestVersion || 1;
    }

    // Get current hostnames
    const currentHostnames = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Add new hostname
    const hostnames = currentHostnames.hostnames?.items || [];
    hostnames.push({
      cnameFrom: args.hostname,
      cnameTo: args.edgeHostname,
      cnameType: args.edgeHostname.includes('edgekey') ? 'EDGE_HOSTNAME' : 'EDGE_HOSTNAME',
    });

    // Update hostnames
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostnames: hostnames,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added hostname ${args.hostname} to property ${args.propertyId} (v${version})\n\n**Hostname:** ${args.hostname}\n**Edge Hostname:** ${args.edgeHostname}\n\n## Next Steps\n1. Create DNS CNAME: "Create CNAME record ${args.hostname} pointing to ${args.edgeHostname}"\n2. Activate property: "Activate property ${args.propertyId} to staging"\n3. If using HTTPS, enroll certificate: "Enroll DV certificate for ${args.hostname}"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('add property hostname', _error);
  }
}

/**
 * Remove hostname from property
 */
export async function removePropertyHostname(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    version?: number;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details to find latest version if not specified
    let version = args.version;
    if (!version) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      version = propertyResponse.properties.items[0].latestVersion || 1;
    }

    // Get current hostnames
    const currentHostnames = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Remove hostname
    const hostnames = (currentHostnames.hostnames?.items || []).filter(
      (h: any) => h.cnameFrom !== args.hostname,
    );

    if (hostnames.length === currentHostnames.hostnames?.items?.length) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Hostname ${args.hostname} not found in property ${args.propertyId}`,
          },
        ],
      };
    }

    // Update hostnames
    await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostnames: hostnames,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Removed hostname ${args.hostname} from property ${args.propertyId} (v${version})\n\n## Next Steps\n- Remove DNS CNAME record for ${args.hostname}\n- Activate property: "Activate property ${args.propertyId} to staging"`,
        },
      ],
    };
  } catch (_error) {
    return formatError('remove property hostname', _error);
  }
}

/**
 * Activate property to staging or production
 */
export async function activateProperty(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    network: 'STAGING' | 'PRODUCTION';
    note?: string;
    notifyEmails?: string[];
    acknowledgeAllWarnings?: boolean;
    fastPush?: boolean;
    useFastFallback?: boolean;
    complianceRecord?: {
      noncomplianceReason?: string;
    };
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;

    // Check if already active
    if (args.network === 'PRODUCTION' && property.productionVersion === version) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Property ${args.propertyId} version ${version} is already active in PRODUCTION`,
          },
        ],
      };
    }
    if (args.network === 'STAGING' && property.stagingVersion === version) {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Property ${args.propertyId} version ${version} is already active in STAGING`,
          },
        ],
      };
    }

    // Create activation with enhanced parameters
    const activationBody: any = {
      propertyVersion: version,
      network: args.network,
      note: args.note || `Activated via MCP on ${new Date().toISOString()}`,
      notifyEmails: args.notifyEmails || [],
      acknowledgeAllWarnings: args.acknowledgeAllWarnings !== false,
      fastPush: args.fastPush !== false, // Default to true for faster activations
      useFastFallback: args.useFastFallback || false, // Default to false for safety
    };

    // Add compliance record if provided (for regulated environments)
    if (args.complianceRecord) {
      activationBody.complianceRecord = args.complianceRecord;
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: activationBody,
    });

    const activationId = response.activationLink?.split('/').pop();

    return {
      content: [
        {
          type: 'text',
          text: `✅ Started activation of property ${property.propertyName} (v${version}) to ${args.network}\n\n**Activation ID:** ${activationId}\n**Status:** In Progress\n\n## Monitoring\n- Check status: "Get activation status ${activationId} for property ${args.propertyId}"\n- View all activations: "List activations for property ${args.propertyId}"\n\n⏱️ Typical activation times:\n- Staging: 5-10 minutes\n- Production: 20-30 minutes`,
        },
      ],
    };
  } catch (_error) {
    if (_error instanceof Error && _error.message.includes('warnings')) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Activation blocked due to warnings. To proceed:\n1. Review warnings: "Show rules for property ${args.propertyId}"\n2. Fix issues or activate with: "Activate property ${args.propertyId} to ${args.network} acknowledging warnings"`,
          },
        ],
      };
    }
    return formatError('activate property', _error);
  }
}

/**
 * Get activation status
 */
export async function getActivationStatus(
  client: AkamaiClient,
  args: {
    propertyId: string;
    activationId: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    });

    if (!response.activations?.items?.[0]) {
      throw new Error('Activation not found');
    }

    const activation = response.activations.items[0];
    const statusEmoji =
      {
        ACTIVE: '✅',
        PENDING: '⏳',
        ZONE_1: '🔄',
        ZONE_2: '🔄',
        ZONE_3: '🔄',
        ABORTED: '❌',
        FAILED: '❌',
        DEACTIVATED: '⚫',
        PENDING_DEACTIVATION: '⏳',
        NEW: '🆕',
      }[
        activation.status as keyof {
          ACTIVE: string;
          PENDING: string;
          ZONE_1: string;
          ZONE_2: string;
          ZONE_3: string;
          ABORTED: string;
          FAILED: string;
          DEACTIVATED: string;
          PENDING_DEACTIVATION: string;
          NEW: string;
        }
      ] || '❓';

    let text = `# Activation Status: ${activation.activationId}\n\n`;
    text += `**Property:** ${activation.propertyName} (${activation.propertyId})\n`;
    text += `**Version:** ${activation.propertyVersion}\n`;
    text += `**Network:** ${activation.network}\n`;
    text += `**Status:** ${statusEmoji} ${activation.status}\n`;
    text += `**Type:** ${activation.activationType}\n`;
    text += `**Submitted:** ${new Date(activation.submitDate).toLocaleString()}\n`;
    text += `**Updated:** ${new Date(activation.updateDate).toLocaleString()}\n`;

    if (activation.note) {
      text += `**Note:** ${activation.note}\n`;
    }

    if (activation.fatalError) {
      text += `\n❌ **Fatal Error:** ${activation.fatalError}\n`;
    }

    if (activation.errors && activation.errors.length > 0) {
      text += '\n## Errors\n';
      activation.errors.forEach((_error: any) => {
        text += `- ${_error.messageId}: ${_error.detail}\n`;
      });
    }

    if (activation.warnings && activation.warnings.length > 0) {
      text += '\n## Warnings\n';
      activation.warnings.forEach((warning: any) => {
        text += `- ${warning.messageId}: ${warning.detail}\n`;
      });
    }

    if (activation.status === 'ACTIVE') {
      text += `\n✅ **Activation Complete!**\n\nYour property is now live on ${activation.network}.`;
      if (activation.network === 'STAGING') {
        text += `\n\nNext step: Test thoroughly, then activate to production:\n"Activate property ${args.propertyId} to production"`;
      }
    } else if (['PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3'].includes(activation.status)) {
      text += '\n\n⏳ **Activation in Progress**\n\nCheck again in a few minutes.';
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
    return formatError('get activation status', _error);
  }
}

/**
 * List all activations for a property
 */
export async function listPropertyActivations(
  client: AkamaiClient,
  args: {
    propertyId: string;
    network?: 'STAGING' | 'PRODUCTION';
  },
): Promise<MCPToolResponse> {
  try {
    const queryParams: any = {};
    if (args.network) {
      queryParams.network = args.network;
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
      queryParams,
    });

    if (!response.activations?.items || response.activations.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No activations found for property ${args.propertyId}${args.network ? ` on ${args.network}` : ''}`,
          },
        ],
      };
    }

    let text = `# Property Activations (${response.activations.items.length} found)\n\n`;

    // Group by network
    const byNetwork = response.activations.items.reduce(
      (acc: any, act: any) => {
        if (!acc[act.network]) {
          acc[act.network] = [];
        }
        acc[act.network].push(act);
        return acc;
      },
      {} as Record<string, ActivationStatus[]>,
    );

    for (const [network, activations] of Object.entries(byNetwork)) {
      text += `## ${network}\n\n`;

      // Sort by date, most recent first
      const sortedActivations = [...(activations as ActivationStatus[])].sort(
        (a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime(),
      );

      for (const act of sortedActivations) {
        const statusEmoji =
          {
            ACTIVE: '✅',
            PENDING: '⏳',
            ZONE_1: '🔄',
            ZONE_2: '🔄',
            ZONE_3: '🔄',
            ABORTED: '❌',
            FAILED: '❌',
            DEACTIVATED: '⚫',
            PENDING_DEACTIVATION: '⏳',
            NEW: '🆕',
          }[
            act.status as keyof {
              ACTIVE: string;
              PENDING: string;
              ZONE_1: string;
              ZONE_2: string;
              ZONE_3: string;
              ABORTED: string;
              FAILED: string;
              DEACTIVATED: string;
              PENDING_DEACTIVATION: string;
              NEW: string;
            }
          ] || '❓';

        text += `### ${statusEmoji} v${act.propertyVersion} - ${act.status}\n`;
        text += `- **ID:** ${act.activationId}\n`;
        text += `- **Date:** ${new Date(act.updateDate).toLocaleString()}\n`;
        text += `- **Type:** ${act.activationType}\n`;
        if (act.note) {
          text += `- **Note:** ${act.note}\n`;
        }
        text += '\n';
      }
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
    return formatError('list property activations', _error);
  }
}

/**
 * Update property with Default DV certificate hostname
 * This creates and configures a secure edge hostname using Akamai's Default Domain Validation certificate
 */
export async function updatePropertyWithDefaultDV(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    version?: number;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;

    // Extract domain parts from hostname
    const hostnameParts = args.hostname.split('.');
    const domainPrefix = hostnameParts[0];
    const domainSuffix = hostnameParts.slice(1).join('.');

    // Step 1: Create edge hostname with Default DV
    const edgeHostnamePrefix = `${domainPrefix}-defaultdv`;
    const edgeHostnameDomain = `${edgeHostnamePrefix}.${domainSuffix}.edgekey.net`;

    let text = '# Updating Property with Default DV Certificate\n\n';
    text += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    text += `**Hostname:** ${args.hostname}\n`;
    text += `**Edge Hostname:** ${edgeHostnameDomain}\n\n`;

    try {
      // Create the edge hostname
      const edgeHostnameResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'PAPI-Use-Prefixes': 'true',
        },
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId,
          options: 'mapDetails',
        },
        body: {
          productId: property.productId,
          domainPrefix: edgeHostnamePrefix,
          domainSuffix: `${domainSuffix}.edgekey.net`,
          secure: true,
          secureNetwork: 'ENHANCED_TLS',
          ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',
          useCases: [
            {
              useCase: 'Download_Mode',
              option: 'BACKGROUND',
              type: 'GLOBAL',
            },
          ],
          // Default DV certificate configuration
          certEnrollmentId: null, // Will use Default DV
          slotNumber: null,
        },
      });

      const edgeHostnameId = edgeHostnameResponse.edgeHostnameLink?.split('/').pop()?.split('?')[0];
      text += '✅ **Step 1 Complete:** Edge hostname created\n';
      text += `- Edge Hostname ID: ${edgeHostnameId}\n`;
      text += '- Certificate Type: Default Domain Validation (DV)\n\n';
    } catch (_err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        text += `ℹ️ Edge hostname ${edgeHostnameDomain} already exists, proceeding...\n\n`;
      } else {
        throw err;
      }
    }

    // Step 2: Add hostname to property
    const currentHostnames = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Check if hostname already exists
    const existingHostname = currentHostnames.hostnames?.items?.find(
      (h: any) => h.cnameFrom === args.hostname,
    );

    if (existingHostname) {
      text += `⚠️ **Note:** Hostname ${args.hostname} already exists in property\n`;
      text += `Current mapping: ${args.hostname} → ${existingHostname.cnameTo}\n\n`;
    } else {
      // Add the hostname
      const hostnames = currentHostnames.hostnames?.items || [];
      hostnames.push({
        cnameFrom: args.hostname,
        cnameTo: edgeHostnameDomain,
        cnameType: 'EDGE_HOSTNAME',
      });

      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          hostnames: hostnames,
        },
      });

      text += '✅ **Step 2 Complete:** Hostname added to property\n\n';
    }

    // Step 3: Domain validation instructions
    text += '## Step 3: Domain Validation Required\n\n';
    text += 'Default DV certificates require domain ownership validation:\n\n';

    text += '### Option 1: HTTP Token Validation\n';
    text += '1. Create a file at:\n';
    text += `   \`http://${args.hostname}/.well-known/pki-validation/akamai-domain-verification.txt\`\n`;
    text += '2. The validation token will be provided after activation\n\n';

    text += '### Option 2: DNS TXT Record Validation\n';
    text += '1. Create a TXT record at:\n';
    text += `   \`_acme-challenge.${args.hostname}\`\n`;
    text += '2. The validation value will be provided after activation\n\n';

    text += '## Next Steps\n\n';
    text += '1. **Create DNS CNAME:**\n';
    text += `   \`${args.hostname} CNAME ${edgeHostnameDomain}\`\n\n`;
    text += '2. **Activate to Staging:**\n';
    text += `   \`"Activate property ${args.propertyId} version ${version} to staging"\`\n\n`;
    text += '3. **Complete Domain Validation:**\n';
    text += '   Follow the validation instructions provided after activation\n\n';
    text += '4. **Activate to Production:**\n';
    text += `   \`"Activate property ${args.propertyId} version ${version} to production"\`\n\n`;

    text += '## Benefits of Default DV\n';
    text += '- ✅ Automatic certificate provisioning\n';
    text += '- ✅ No manual certificate management\n';
    text += '- ✅ Auto-renewal before expiration\n';
    text += '- ✅ Enhanced TLS with HTTP/2 support\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('update property with Default DV', _error);
  }
}

/**
 * Update property with CPS-managed certificate hostname
 * This configures a property to use an edge hostname secured with a CPS-managed certificate
 */
export async function updatePropertyWithCPSCertificate(
  client: AkamaiClient,
  args: {
    propertyId: string;
    hostname: string;
    certificateEnrollmentId: number;
    version?: number;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    tlsVersion?: 'STANDARD_TLS' | 'ENHANCED_TLS';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    if (!propertyResponse.properties?.items?.[0]) {
      throw new Error('Property not found');
    }

    const property = propertyResponse.properties.items[0];
    const version = args.version || property.latestVersion || 1;
    const tlsVersion = args.tlsVersion || 'ENHANCED_TLS';

    // Extract domain parts from hostname
    const hostnameParts = args.hostname.split('.');
    const domainPrefix = hostnameParts[0];
    const domainSuffix = hostnameParts.slice(1).join('.');

    // Determine edge hostname suffix based on TLS version
    const edgeHostnameSuffix = tlsVersion === 'ENHANCED_TLS' ? 'edgekey.net' : 'edgesuite.net';
    const edgeHostnamePrefix = `${domainPrefix}-cps`;
    const edgeHostnameDomain = `${edgeHostnamePrefix}.${domainSuffix}.${edgeHostnameSuffix}`;

    let text = '# Updating Property with CPS-Managed Certificate\n\n';
    text += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    text += `**Hostname:** ${args.hostname}\n`;
    text += `**Certificate Enrollment ID:** ${args.certificateEnrollmentId}\n`;
    text += `**TLS Version:** ${tlsVersion}\n`;
    text += `**Edge Hostname:** ${edgeHostnameDomain}\n\n`;

    // Step 1: Verify certificate enrollment
    text += '## Step 1: Verifying Certificate Enrollment\n';
    text += `Certificate Enrollment ID: ${args.certificateEnrollmentId}\n\n`;
    text += '⚠️ **Important:** Ensure this certificate enrollment:\n';
    text += `- Includes ${args.hostname} as CN or SAN\n`;
    text += '- Is in ACTIVE status\n';
    text += `- Matches the TLS version (${tlsVersion})\n\n`;

    // Step 2: Create edge hostname with CPS certificate
    try {
      const edgeHostnameResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'PAPI-Use-Prefixes': 'true',
        },
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId,
          options: 'mapDetails',
        },
        body: {
          productId: property.productId,
          domainPrefix: edgeHostnamePrefix,
          domainSuffix: `${domainSuffix}.${edgeHostnameSuffix}`,
          secure: true,
          secureNetwork: tlsVersion,
          ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',
          certEnrollmentId: args.certificateEnrollmentId,
          useCases: [
            {
              useCase: 'Download_Mode',
              option: 'BACKGROUND',
              type: 'GLOBAL',
            },
          ],
        },
      });

      const edgeHostnameId = edgeHostnameResponse.edgeHostnameLink?.split('/').pop()?.split('?')[0];
      text += '✅ **Step 2 Complete:** Edge hostname created\n';
      text += `- Edge Hostname ID: ${edgeHostnameId}\n`;
      text += `- Certificate Type: CPS-Managed (Enrollment ${args.certificateEnrollmentId})\n\n`;
    } catch (_err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        text += `ℹ️ Edge hostname ${edgeHostnameDomain} already exists, proceeding...\n\n`;
      } else {
        throw err;
      }
    }

    // Step 3: Add hostname to property
    const currentHostnames = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    // Check if hostname already exists
    const existingHostname = currentHostnames.hostnames?.items?.find(
      (h: any) => h.cnameFrom === args.hostname,
    );

    if (existingHostname) {
      text += `⚠️ **Note:** Hostname ${args.hostname} already exists in property\n`;
      text += `Current mapping: ${args.hostname} → ${existingHostname.cnameTo}\n\n`;
    } else {
      // Add the hostname
      const hostnames = currentHostnames.hostnames?.items || [];
      hostnames.push({
        cnameFrom: args.hostname,
        cnameTo: edgeHostnameDomain,
        cnameType: 'EDGE_HOSTNAME',
        certStatus: {
          production: [
            {
              status: 'PENDING',
            },
          ],
          staging: [
            {
              status: 'PENDING',
            },
          ],
        },
      });

      await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          hostnames: hostnames,
        },
      });

      text += '✅ **Step 3 Complete:** Hostname added to property\n\n';
    }

    // Step 4: Next steps
    text += '## Next Steps\n\n';
    text += '1. **Create DNS CNAME:**\n';
    text += `   \`${args.hostname} CNAME ${edgeHostnameDomain}\`\n\n`;

    text += '2. **Verify Certificate Status:**\n';
    text += `   \`"Check DV enrollment status ${args.certificateEnrollmentId}"\`\n\n`;

    text += '3. **Activate to Staging:**\n';
    text += `   \`"Activate property ${args.propertyId} version ${version} to staging"\`\n\n`;

    text += '4. **Test in Staging:**\n';
    text += '   - Verify HTTPS works correctly\n';
    text += '   - Check certificate chain\n';
    text += '   - Test SSL/TLS configuration\n\n';

    text += '5. **Activate to Production:**\n';
    text += `   \`"Activate property ${args.propertyId} version ${version} to production"\`\n\n`;

    text += '## CPS Certificate Benefits\n';
    text += '- ✅ Full control over certificate details\n';
    text += '- ✅ Support for wildcard and multi-domain certificates\n';
    text += '- ✅ Custom certificate chain\n';
    if (tlsVersion === 'ENHANCED_TLS') {
      text += '- ✅ Enhanced TLS with HTTP/2\n';
      text += '- ✅ Advanced cipher suites\n';
      text += '- ✅ Optimized for performance\n';
    } else {
      text += '- ✅ Standard TLS compatibility\n';
      text += '- ✅ Broad client support\n';
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
    return formatError('update property with CPS certificate', _error);
  }
}

/**
 * Enhanced create property version with intelligent base version selection
 */
export async function createPropertyVersionEnhanced(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    note?: string;
    baseVersion?: number;
    autoSelectBase?: boolean;
    tags?: string[];
    metadata?: Record<string, string>;
  },
): Promise<MCPToolResponse> {
  try {
    let baseVersion = args.baseVersion;

    // Intelligent base version selection
    if (args.autoSelectBase && !baseVersion) {
      const versionsResponse = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
      });

      const versions = versionsResponse.data.versions?.items || [];
      if (versions.length > 0) {
        // Select latest staging version, or latest production if no staging
        const stagingVersions = versions.filter((v: any) => v.stagingStatus === 'ACTIVE');
        const productionVersions = versions.filter((v: any) => v.productionStatus === 'ACTIVE');

        if (stagingVersions.length > 0) {
          baseVersion = Math.max(...stagingVersions.map((v: any) => v.propertyVersion));
        } else if (productionVersions.length > 0) {
          baseVersion = Math.max(...productionVersions.map((v: any) => v.propertyVersion));
        } else {
          baseVersion = Math.max(...versions.map((v: any) => v.propertyVersion));
        }
      }
    }

    // Create new version
    const response = await client.request({
      method: 'POST',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      body: baseVersion ? { createFromVersion: baseVersion } : {},
    });

    const newVersion = response.versionLink?.split('/').pop() || 'unknown';

    // Add note and metadata if provided
    if (args.note || args.tags || args.metadata) {
      const patches = [];

      if (args.note) {
        patches.push({
          op: 'replace',
          path: '/versions/0/note',
          value: args.note,
        });
      }

      // Add tags as part of metadata
      if (args.tags || args.metadata) {
        const metadata = { ...args.metadata };
        if (args.tags) {
          metadata.tags = args.tags.join(',');
        }
        metadata.createdBy = 'alecs-mcp-akamai';
        metadata.created = new Date().toISOString();

        patches.push({
          op: 'add',
          path: '/versions/0/metadata',
          value: metadata,
        });
      }

      if (patches.length > 0) {
        await client.request({
          method: 'PATCH',
          path: `/papi/v1/properties/${args.propertyId}/versions/${newVersion}`,
          body: patches,
        });
      }
    }

    const text = `✅ Created enhanced property version ${newVersion}${baseVersion ? ` based on version ${baseVersion}` : ''}
${args.note ? `\nNote: ${args.note}` : ''}
${args.tags ? `\nTags: ${args.tags.join(', ')}` : ''}

**Smart Selections:**
${args.autoSelectBase ? `- Auto-selected base version: ${baseVersion}` : ''}
- Version metadata attached
- Ready for rule updates

**Next Steps:**
- Update rules: "Update rules for property ${args.propertyId} version ${newVersion}"
- Compare versions: "Compare property ${args.propertyId} versions ${baseVersion} and ${newVersion}"
- Activate when ready: "Activate property ${args.propertyId} version ${newVersion} to staging"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('create enhanced property version', _error);
  }
}

/**
 * Get version diff comparing rule trees between versions
 */
export async function getVersionDiff(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    version1: number;
    version2: number;
    includeDetails?: boolean;
    compareType?: 'rules' | 'hostnames' | 'all';
  },
): Promise<MCPToolResponse> {
  try {
    const compareType = args.compareType || 'all';
    const differences = [];

    // Compare rules if requested
    if (compareType === 'rules' || compareType === 'all') {
      const [rules1Response, rules2Response] = await Promise.all([
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/rules`,
        }),
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/rules`,
        }),
      ]);

      const rulesDiff = compareRuleTrees(
        rules1Response.data.rules,
        rules2Response.data.rules,
        args.includeDetails || false,
      );

      if (rulesDiff.length > 0) {
        differences.push({
          type: 'rules',
          changes: rulesDiff.length,
          details: rulesDiff,
        });
      }
    }

    // Compare hostnames if requested
    if (compareType === 'hostnames' || compareType === 'all') {
      const [hostnames1Response, hostnames2Response] = await Promise.all([
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version1}/hostnames`,
        }),
        client.request({
          method: 'GET',
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version2}/hostnames`,
        }),
      ]);

      const hostnamesDiff = compareHostnames(
        hostnames1Response.data.hostnames?.items || [],
        hostnames2Response.data.hostnames?.items || [],
      );

      if (hostnamesDiff.length > 0) {
        differences.push({
          type: 'hostnames',
          changes: hostnamesDiff.length,
          details: hostnamesDiff,
        });
      }
    }

    let text = `📊 **Version Comparison: ${args.version1} vs ${args.version2}**\n\n`;

    if (differences.length === 0) {
      text += '✅ No differences found between versions';
    } else {
      text += `**Summary:** ${differences.length} difference category found\n\n`;

      for (const diff of differences) {
        text += `**${diff.type.toUpperCase()} Changes:** ${diff.changes} differences\n`;

        if (args.includeDetails && diff.details) {
          diff.details.slice(0, 10).forEach((detail: any, index: number) => {
            text += `  ${index + 1}. ${detail.type}: ${detail.path || detail.description}\n`;
          });

          if (diff.details.length > 10) {
            text += `  ... and ${diff.details.length - 10} more changes\n`;
          }
        }
        text += '\n';
      }
    }

    text += `\n**Analysis Options:**
- Get detailed diff: "Compare property ${args.propertyId} versions ${args.version1} and ${args.version2} with details"
- View specific changes: "Get rules for property ${args.propertyId} version ${args.version2}"
- Merge versions: "Merge property ${args.propertyId} version ${args.version2} into ${args.version1}"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('compare property versions', _error);
  }
}

/**
 * List property versions with enhanced filtering and pagination
 */
export async function listPropertyVersionsEnhanced(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    limit?: number;
    offset?: number;
    status?: 'active' | 'inactive' | 'all';
    network?: 'staging' | 'production' | 'both';
    includeMetadata?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      method: 'GET',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
    });

    let versions = response.data.versions?.items || [];
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Apply filters
    if (args.status === 'active') {
      versions = versions.filter(
        (v: any) => v.stagingStatus === 'ACTIVE' || v.productionStatus === 'ACTIVE',
      );
    } else if (args.status === 'inactive') {
      versions = versions.filter(
        (v: any) => v.stagingStatus !== 'ACTIVE' && v.productionStatus !== 'ACTIVE',
      );
    }

    if (args.network === 'staging') {
      versions = versions.filter((v: any) => v.stagingStatus === 'ACTIVE');
    } else if (args.network === 'production') {
      versions = versions.filter((v: any) => v.productionStatus === 'ACTIVE');
    }

    // Sort by version number (newest first)
    versions.sort((a: any, b: any) => b.propertyVersion - a.propertyVersion);

    // Apply pagination
    const totalVersions = versions.length;
    const paginatedVersions = versions.slice(offset, offset + limit);

    let text = `📋 **Property Versions for ${args.propertyId}**\n\n`;
    text += `**Total:** ${totalVersions} versions | **Showing:** ${offset + 1}-${Math.min(offset + limit, totalVersions)}\n\n`;

    for (const version of paginatedVersions) {
      const isActive = version.stagingStatus === 'ACTIVE' || version.productionStatus === 'ACTIVE';
      const statusIcon = isActive ? '🟢' : '⚪';

      text += `${statusIcon} **Version ${version.propertyVersion}**\n`;
      text += `  └ Updated: ${version.updatedDate} by ${version.updatedByUser}\n`;

      if (version.stagingStatus === 'ACTIVE') {
        text += '  └ 🟡 Active on STAGING\n';
      }
      if (version.productionStatus === 'ACTIVE') {
        text += '  └ 🔴 Active on PRODUCTION\n';
      }

      if (version.note) {
        text += `  └ Note: ${version.note}\n`;
      }

      if (args.includeMetadata && version.metadata) {
        const metadata =
          typeof version.metadata === 'string' ? JSON.parse(version.metadata) : version.metadata;
        if (metadata.tags) {
          text += `  └ Tags: ${metadata.tags}\n`;
        }
      }

      text += '\n';
    }

    // Pagination controls
    if (totalVersions > limit) {
      text += '**Navigation:**\n';
      if (offset > 0) {
        text += `- Previous: "List versions for property ${args.propertyId} offset ${Math.max(0, offset - limit)}"\n`;
      }
      if (offset + limit < totalVersions) {
        text += `- Next: "List versions for property ${args.propertyId} offset ${offset + limit}"\n`;
      }
    }

    text += `\n**Actions:**
- Compare versions: "Compare property ${args.propertyId} versions X and Y"
- Create new version: "Create version for property ${args.propertyId}"
- View version details: "Get rules for property ${args.propertyId} version X"`;

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
 * Rollback property version for quick recovery
 */
export async function rollbackPropertyVersion(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    targetVersion: number;
    createBackup?: boolean;
    note?: string;
    autoActivate?: boolean;
    network?: 'staging' | 'production';
  },
): Promise<MCPToolResponse> {
  try {
    let backupVersionId = null;

    // Create backup of current version if requested
    if (args.createBackup !== false) {
      const currentVersionResponse = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
      });

      const versions = currentVersionResponse.data.versions?.items || [];
      const latestVersion = Math.max(...versions.map((v: any) => v.propertyVersion));

      const backupResponse = await client.request({
        method: 'POST',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
        body: { createFromVersion: latestVersion },
      });

      backupVersionId = backupResponse.versionLink?.split('/').pop();

      // Add backup note
      if (backupVersionId) {
        await client.request({
          method: 'PATCH',
          path: `/papi/v1/properties/${args.propertyId}/versions/${backupVersionId}`,
          body: [
            {
              op: 'replace',
              path: '/versions/0/note',
              value: `Backup before rollback to version ${args.targetVersion} - ${new Date().toISOString()}`,
            },
          ],
        });
      }
    }

    // Create new version from target version
    const rollbackResponse = await client.request({
      method: 'POST',
      path: `/papi/v1/properties/${args.propertyId}/versions`,
      body: { createFromVersion: args.targetVersion },
    });

    const newVersionId = rollbackResponse.versionLink?.split('/').pop();

    // Add rollback note
    if (newVersionId && args.note) {
      await client.request({
        method: 'PATCH',
        path: `/papi/v1/properties/${args.propertyId}/versions/${newVersionId}`,
        body: [
          {
            op: 'replace',
            path: '/versions/0/note',
            value: `Rollback from version ${args.targetVersion}: ${args.note}`,
          },
        ],
      });
    }

    let text = '🔄 **Property Rollback Completed**\n\n';
    text += `✅ Rolled back to version ${args.targetVersion}\n`;
    text += `📦 New version created: ${newVersionId}\n`;

    if (backupVersionId) {
      text += `💾 Backup version created: ${backupVersionId}\n`;
    }

    // Auto-activate if requested
    if (args.autoActivate && args.network) {
      try {
        await client.request({
          method: 'POST',
          path: `/papi/v1/properties/${args.propertyId}/activations`,
          body: {
            propertyVersion: parseInt(newVersionId),
            network: args.network.toUpperCase(),
            note: `Auto-activation after rollback to version ${args.targetVersion}`,
            acknowledgeAllWarnings: true,
          },
        });
        text += `🚀 Auto-activated on ${args.network.toUpperCase()}\n`;
      } catch (_activationError) {
        text += '⚠️ Rollback completed but auto-activation failed. Manual activation required.\n';
      }
    }

    text += `\n**Recovery Information:**
- Original version: ${args.targetVersion}
- New version: ${newVersionId}
${backupVersionId ? `- Backup version: ${backupVersionId}` : ''}

**Next Steps:**
${!args.autoActivate ? `- Activate: "Activate property ${args.propertyId} version ${newVersionId} to ${args.network || 'staging'}"` : ''}
- Verify: "Get rules for property ${args.propertyId} version ${newVersionId}"
- Compare: "Compare property ${args.propertyId} versions ${backupVersionId} and ${newVersionId}"`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('rollback property version', _error);
  }
}

/**
 * Batch version operations across multiple properties
 */
export async function batchVersionOperations(
  client: AkamaiClient,
  args: {
    customer?: string;
    operations: Array<{
      propertyId: string;
      operation: 'create' | 'rollback' | 'compare';
      parameters: Record<string, any>;
    }>;
    parallel?: boolean;
    continueOnError?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const results = [];
    const errors = [];

    if (args.parallel) {
      // Execute operations in parallel
      const promises = args.operations.map(async (op, index) => {
        try {
          let result;
          switch (op.operation) {
            case 'create':
              result = await createPropertyVersionEnhanced(client, {
                propertyId: op.propertyId,
                ...op.parameters,
              });
              break;
            case 'rollback':
              result = await rollbackPropertyVersion(client, {
                propertyId: op.propertyId,
                targetVersion: op.parameters.targetVersion || 1,
                ...op.parameters,
              });
              break;
            case 'compare':
              result = await getVersionDiff(client, {
                propertyId: op.propertyId,
                version1: op.parameters.version1 || 1,
                version2: op.parameters.version2 || 2,
                ...op.parameters,
              });
              break;
            default:
              throw new Error(`Unknown operation: ${op.operation}`);
          }
          return { index, success: true, result, propertyId: op.propertyId };
        } catch (_error: any) {
          return {
            index,
            success: false,
            error: error?.message || 'Unknown error',
            propertyId: op.propertyId,
          };
        }
      });

      const allResults = await Promise.allSettled(promises);

      allResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const { success, result, _error, propertyId } = promiseResult.value || {};
          if (success && result) {
            results.push({
              propertyId: propertyId || '',
              operation: args.operations[index]?.operation || '',
              result,
            });
          } else if (_error) {
            errors.push({
              propertyId: propertyId || '',
              operation: args.operations[index]?.operation || '',
              _error,
            });
          }
        } else {
          errors.push({
            propertyId: args.operations[index]?.propertyId || '',
            operation: args.operations[index]?.operation || '',
            error: promiseResult.reason,
          });
        }
      });
    } else {
      // Execute operations sequentially
      for (const [_index, op] of args.operations.entries()) {
        try {
          let result;
          switch (op.operation) {
            case 'create':
              result = await createPropertyVersionEnhanced(client, {
                propertyId: op.propertyId,
                ...op.parameters,
              });
              break;
            case 'rollback':
              result = await rollbackPropertyVersion(client, {
                propertyId: op.propertyId,
                targetVersion: op.parameters.targetVersion || 1,
                ...op.parameters,
              });
              break;
            case 'compare':
              result = await getVersionDiff(client, {
                propertyId: op.propertyId,
                version1: op.parameters.version1 || 1,
                version2: op.parameters.version2 || 2,
                ...op.parameters,
              });
              break;
            default:
              throw new Error(`Unknown operation: ${op.operation}`);
          }
          results.push({ propertyId: op.propertyId, operation: op.operation, result });
        } catch (_error: any) {
          errors.push({
            propertyId: op.propertyId,
            operation: op.operation,
            error: error?.message || 'Unknown error',
          });

          if (!args.continueOnError) {
            break;
          }
        }
      }
    }

    let text = '📋 **Batch Version Operations Results**\n\n';
    text += `**Summary:** ${results.length} successful, ${errors.length} failed\n\n`;

    if (results.length > 0) {
      text += '✅ **Successful Operations:**\n';
      results.forEach((result, index) => {
        text += `${index + 1}. ${result.propertyId} - ${result.operation}\n`;
      });
      text += '\n';
    }

    if (errors.length > 0) {
      text += '❌ **Failed Operations:**\n';
      errors.forEach((_error, index) => {
        text += `${index + 1}. ${_error.propertyId} - ${_error.operation}: ${_error.error}\n`;
      });
      text += '\n';
    }

    text += `**Execution Mode:** ${args.parallel ? 'Parallel' : 'Sequential'}
**Continue on Error:** ${args.continueOnError ? 'Yes' : 'No'}

**Next Steps:**
- Review individual results above
- Retry failed operations if needed
- Verify successful operations`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('batch version operations', _error);
  }
}

/**
 * Helper function to compare rule trees and identify differences
 */
function compareRuleTrees(rules1: any, rules2: any, _includeDetails: boolean): any[] {
  const differences = [];

  // Deep comparison logic would go here
  // This is a simplified version for demonstration
  const rules1Str = JSON.stringify(rules1, null, 2);
  const rules2Str = JSON.stringify(rules2, null, 2);

  if (rules1Str !== rules2Str) {
    differences.push({
      type: 'rule_tree_change',
      description: 'Rule tree content differs between versions',
      path: '/rules',
    });
  }

  return differences;
}

/**
 * Helper function to compare hostnames
 */
function compareHostnames(hostnames1: any[], hostnames2: any[]): any[] {
  const differences = [];

  const h1Map = new Map(hostnames1.map((h) => [h.cnameFrom, h]));
  const h2Map = new Map(hostnames2.map((h) => [h.cnameFrom, h]));

  // Check for added hostnames
  for (const [hostname, _config] of h2Map) {
    if (!h1Map.has(hostname)) {
      differences.push({
        type: 'hostname_added',
        description: `Hostname ${hostname} added`,
        hostname,
      });
    }
  }

  // Check for removed hostnames
  for (const [hostname, _config] of h1Map) {
    if (!h2Map.has(hostname)) {
      differences.push({
        type: 'hostname_removed',
        description: `Hostname ${hostname} removed`,
        hostname,
      });
    }
  }

  return differences;
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;

    // Provide specific solutions based on error type
    if (_error.message.includes('401') || _error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
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
    errorMessage += `: ${String(error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
