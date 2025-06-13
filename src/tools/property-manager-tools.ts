/**
 * Extended Property Manager Tools
 * Implements advanced property management features including versions, rules, edge hostnames, and activations
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse, RuleTree } from '../types.js';

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
  }
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
      content: [{
        type: 'text',
        text: `✅ Created new property version ${newVersion} based on version ${baseVersion}${args.note ? `\nNote: ${args.note}` : ''}\n\nNext steps:\n- Update rules: "Update rules for property ${args.propertyId} version ${newVersion}"\n- Activate: "Activate property ${args.propertyId} version ${newVersion} to staging"`,
      }],
    };
  } catch (error) {
    return formatError('create property version', error);
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
  }
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
        'Accept': 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    }) as RuleTree;

    // Format rules for display
    let text = `# Property Rules - ${args.propertyId} (v${version})\n\n`;
    text += `**Rule Format:** ${response.ruleFormat}\n\n`;

    // Function to format rules recursively
    function formatRule(rule: any, indent: string = ''): string {
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
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('get property rules', error);
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
  }
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
        'Accept': 'application/vnd.akamai.papirules.v2023-10-30+json',
      },
    }) as RuleTree;

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
      response.errors.forEach((error: any) => {
        text += `- ${error.detail}\n`;
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
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('update property rules', error);
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
  }
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
      path: `/papi/v1/edgehostnames?contractId=${property.contractId}&groupId=${property.groupId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        productId: productId,
        domainPrefix: args.domainPrefix,
        domainSuffix: domainSuffix,
        secure: args.secure || domainSuffix.includes('edgekey'),
        ipVersionBehavior: args.ipVersion || 'IPV4',
        certificateEnrollmentId: args.certificateEnrollmentId,
      },
    });

    const edgeHostnameId = response.edgeHostnameLink?.split('/').pop();
    const edgeHostname = `${args.domainPrefix}${domainSuffix}`;

    return {
      content: [{
        type: 'text',
        text: `✅ Created edge hostname: ${edgeHostname}\n\n**Edge Hostname ID:** ${edgeHostnameId}\n**Type:** ${args.secure || domainSuffix.includes('edgekey') ? 'Enhanced TLS (HTTPS)' : 'Standard TLS'}\n**IP Version:** ${args.ipVersion || 'IPV4'}\n\n## Next Steps\n- Add hostname to property: "Add hostname www.example.com to property ${args.propertyId} using edge hostname ${edgeHostname}"\n- Create DNS CNAME: "Create CNAME record www.example.com pointing to ${edgeHostname}"`,
      }],
    };
  } catch (error) {
    return formatError('create edge hostname', error);
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
  }
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
      content: [{
        type: 'text',
        text: `✅ Added hostname ${args.hostname} to property ${args.propertyId} (v${version})\n\n**Hostname:** ${args.hostname}\n**Edge Hostname:** ${args.edgeHostname}\n\n## Next Steps\n1. Create DNS CNAME: "Create CNAME record ${args.hostname} pointing to ${args.edgeHostname}"\n2. Activate property: "Activate property ${args.propertyId} to staging"\n3. If using HTTPS, enroll certificate: "Enroll DV certificate for ${args.hostname}"`,
      }],
    };
  } catch (error) {
    return formatError('add property hostname', error);
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
  }
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
      (h: any) => h.cnameFrom !== args.hostname
    );

    if (hostnames.length === currentHostnames.hostnames?.items?.length) {
      return {
        content: [{
          type: 'text',
          text: `❌ Hostname ${args.hostname} not found in property ${args.propertyId}`,
        }],
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
      content: [{
        type: 'text',
        text: `✅ Removed hostname ${args.hostname} from property ${args.propertyId} (v${version})\n\n## Next Steps\n- Remove DNS CNAME record for ${args.hostname}\n- Activate property: "Activate property ${args.propertyId} to staging"`,
      }],
    };
  } catch (error) {
    return formatError('remove property hostname', error);
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
  }
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
        content: [{
          type: 'text',
          text: `ℹ️ Property ${args.propertyId} version ${version} is already active in PRODUCTION`,
        }],
      };
    }
    if (args.network === 'STAGING' && property.stagingVersion === version) {
      return {
        content: [{
          type: 'text',
          text: `ℹ️ Property ${args.propertyId} version ${version} is already active in STAGING`,
        }],
      };
    }

    // Create activation
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        propertyVersion: version,
        network: args.network,
        note: args.note || `Activated via MCP on ${new Date().toISOString()}`,
        notifyEmails: args.notifyEmails || [],
        acknowledgeAllWarnings: args.acknowledgeAllWarnings || true,
        fastPush: true,
        useFastFallback: false,
      },
    });

    const activationId = response.activationLink?.split('/').pop();

    return {
      content: [{
        type: 'text',
        text: `✅ Started activation of property ${property.propertyName} (v${version}) to ${args.network}\n\n**Activation ID:** ${activationId}\n**Status:** In Progress\n\n## Monitoring\n- Check status: "Get activation status ${activationId} for property ${args.propertyId}"\n- View all activations: "List activations for property ${args.propertyId}"\n\n⏱️ Typical activation times:\n- Staging: 5-10 minutes\n- Production: 20-30 minutes`,
      }],
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('warnings')) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Activation blocked due to warnings. To proceed:\n1. Review warnings: "Show rules for property ${args.propertyId}"\n2. Fix issues or activate with: "Activate property ${args.propertyId} to ${args.network} acknowledging warnings"`,
        }],
      };
    }
    return formatError('activate property', error);
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
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`,
      method: 'GET',
    }) as { activations: { items: ActivationStatus[] } };

    if (!response.activations?.items?.[0]) {
      throw new Error('Activation not found');
    }

    const activation = response.activations.items[0];
    const statusEmoji = {
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
    }[activation.status] || '❓';

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
      activation.errors.forEach(error => {
        text += `- ${error.messageId}: ${error.detail}\n`;
      });
    }

    if (activation.warnings && activation.warnings.length > 0) {
      text += '\n## Warnings\n';
      activation.warnings.forEach(warning => {
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
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('get activation status', error);
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
  }
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
    }) as { activations: { items: ActivationStatus[] } };

    if (!response.activations?.items || response.activations.items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No activations found for property ${args.propertyId}${args.network ? ` on ${args.network}` : ''}`,
        }],
      };
    }

    let text = `# Property Activations (${response.activations.items.length} found)\n\n`;

    // Group by network
    const byNetwork = response.activations.items.reduce((acc, act) => {
      if (!acc[act.network]) acc[act.network] = [];
      acc[act.network]!.push(act);
      return acc;
    }, {} as Record<string, ActivationStatus[]>);

    for (const [network, activations] of Object.entries(byNetwork)) {
      text += `## ${network}\n\n`;
      
      // Sort by date, most recent first
      const sortedActivations = [...activations].sort((a, b) => 
        new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime()
      );

      for (const act of sortedActivations) {
        const statusEmoji = {
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
        }[act.status] || '❓';

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
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('list property activations', error);
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
      solution = '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
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

  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}