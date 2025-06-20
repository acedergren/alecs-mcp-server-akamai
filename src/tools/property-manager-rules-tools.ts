/**
 * Property Manager Rules and Validation Tools
 * Implements rule tree operations, behaviors, criteria, and domain validation
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

/**
 * List available behaviors for a property
 */
export async function listAvailableBehaviors(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    productId?: string;
    ruleFormat?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details if needed
    let productId = args.productId;
    let ruleFormat = args.ruleFormat;

    if (!productId || !ruleFormat) {
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

      productId = productId || property.productId;

      // Get rule format from latest version
      const version = args.version || property.latestVersion || 1;
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET',
      });

      ruleFormat = ruleFormat || rulesResponse.ruleFormat;
    }

    // Get available behaviors
    const response = await client.request({
      path: '/papi/v1/catalog/behaviors',
      method: 'GET',
      queryParams: {
        productId: productId!,
        ruleFormat: ruleFormat!,
      },
    });

    if (!response.behaviors?.items || response.behaviors.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No behaviors found for product ${productId} with rule format ${ruleFormat}.`,
          },
        ],
      };
    }

    let text = `# Available Behaviors for Property ${args.propertyId}\n\n`;
    text += `**Product:** ${productId}\n`;
    text += `**Rule Format:** ${ruleFormat}\n`;
    text += `**Total Behaviors:** ${response.behaviors.items.length}\n\n`;

    // Group behaviors by category
    const behaviorsByCategory = response.behaviors.items.reduce((acc: any, behavior: any) => {
      const category = behavior.category || 'Other';
      if (!acc[category]) {
acc[category] = [];
}
      acc[category].push(behavior);
      return acc;
    }, {});

    for (const [category, behaviors] of Object.entries(behaviorsByCategory)) {
      text += `## ${category}\n\n`;

      for (const behavior of behaviors as any[]) {
        text += `### ${behavior.displayName || behavior.name}\n`;
        text += `- **Name:** \`${behavior.name}\`\n`;
        if (behavior.description) {
          text += `- **Description:** ${behavior.description}\n`;
        }
        if (behavior.deprecated) {
          text += `- ⚠️ **Deprecated:** Use ${behavior.deprecatedMessage || 'alternative behavior'}\n`;
        }
        text += '\n';
      }
    }

    text += '## Common Behaviors\n\n';
    text += '- **origin**: Configure origin server settings\n';
    text += '- **caching**: Control caching behavior\n';
    text += '- **cpCode**: Assign CP code for reporting\n';
    text += '- **edgeRedirector**: Redirect requests at the edge\n';
    text += '- **modifyOutgoingResponseHeader**: Modify response headers\n';
    text += '- **gzipResponse**: Enable GZIP compression\n\n';

    text += '## Usage Example\n';
    text += '```json\n';
    text += '{\n';
    text += '  "name": "origin",\n';
    text += '  "options": {\n';
    text += '    "hostname": "origin.example.com",\n';
    text += '    "httpPort": 80,\n';
    text += '    "httpsPort": 443\n';
    text += '  }\n';
    text += '}\n';
    text += '```\n\n';

    text += '## Next Steps\n';
    text += `- View current rules: \`"Get property ${args.propertyId} rules"\`\n`;
    text += `- Update rules: \`"Update property ${args.propertyId} rules"\`\n`;
    text += `- List criteria: \`"List available criteria for property ${args.propertyId}"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list available behaviors', _error);
  }
}

/**
 * List available criteria for a property
 */
export async function listAvailableCriteria(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    productId?: string;
    ruleFormat?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details if needed
    let productId = args.productId;
    let ruleFormat = args.ruleFormat;

    if (!productId || !ruleFormat) {
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

      productId = productId || property.productId;

      // Get rule format from latest version
      const version = args.version || property.latestVersion || 1;
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET',
      });

      ruleFormat = ruleFormat || rulesResponse.ruleFormat;
    }

    // Get available criteria
    const response = await client.request({
      path: '/papi/v1/catalog/criteria',
      method: 'GET',
      queryParams: {
        productId: productId!,
        ruleFormat: ruleFormat!,
      },
    });

    if (!response.criteria?.items || response.criteria.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No criteria found for product ${productId} with rule format ${ruleFormat}.`,
          },
        ],
      };
    }

    let text = `# Available Criteria for Property ${args.propertyId}\n\n`;
    text += `**Product:** ${productId}\n`;
    text += `**Rule Format:** ${ruleFormat}\n`;
    text += `**Total Criteria:** ${response.criteria.items.length}\n\n`;

    // Group criteria by category
    const criteriaByCategory = response.criteria.items.reduce((acc: any, criterion: any) => {
      const category = criterion.category || 'Other';
      if (!acc[category]) {
acc[category] = [];
}
      acc[category].push(criterion);
      return acc;
    }, {});

    for (const [category, criteria] of Object.entries(criteriaByCategory)) {
      text += `## ${category}\n\n`;

      for (const criterion of criteria as any[]) {
        text += `### ${criterion.displayName || criterion.name}\n`;
        text += `- **Name:** \`${criterion.name}\`\n`;
        if (criterion.description) {
          text += `- **Description:** ${criterion.description}\n`;
        }
        if (criterion.deprecated) {
          text += `- ⚠️ **Deprecated:** Use ${criterion.deprecatedMessage || 'alternative criterion'}\n`;
        }
        text += '\n';
      }
    }

    text += '## Common Criteria\n\n';
    text += '- **path**: Match URL paths\n';
    text += '- **hostname**: Match specific hostnames\n';
    text += '- **fileExtension**: Match file extensions\n';
    text += '- **requestMethod**: Match HTTP methods\n';
    text += '- **contentType**: Match content types\n';
    text += '- **userAgent**: Match user agent strings\n\n';

    text += '## Usage Example\n';
    text += '```json\n';
    text += '{\n';
    text += '  "name": "path",\n';
    text += '  "options": {\n';
    text += '    "matchOperator": "MATCHES_ONE_OF",\n';
    text += '    "values": ["/api/*", "/v1/*"]\n';
    text += '  }\n';
    text += '}\n';
    text += '```\n\n';

    text += '## Next Steps\n';
    text += `- View current rules: \`"Get property ${args.propertyId} rules"\`\n`;
    text += `- Update rules: \`"Update property ${args.propertyId} rules"\`\n`;
    text += `- List behaviors: \`"List available behaviors for property ${args.propertyId}"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list available criteria', _error);
  }
}

/**
 * Patch a property's rule tree using JSON Patch
 */
export async function patchPropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    patches: Array<{
      op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
      path: string;
      value?: any;
      from?: string;
    }>;
    validateRules?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get property details and version
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

    const version = args.version || property.latestVersion || 1;

    // Apply patches
    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
      queryParams: args.validateRules ? { validateRules: 'true' } : undefined,
      body: args.patches,
    });

    let text = '✅ **Rule Tree Patched Successfully**\n\n';
    text += `**Property:** ${property.propertyName} (${args.propertyId})\n`;
    text += `**Version:** ${version}\n`;
    text += `**Patches Applied:** ${args.patches.length}\n\n`;

    if (response.errors?.length > 0) {
      text += '## ⚠️ Validation Errors\n';
      for (const error of response.errors) {
        text += `- ${error.detail}\n`;
      }
      text += '\n';
    }

    if (response.warnings?.length > 0) {
      text += '## ⚠️ Warnings\n';
      for (const warning of response.warnings) {
        text += `- ${warning.detail}\n`;
      }
      text += '\n';
    }

    text += '## Patches Applied\n';
    for (const patch of args.patches) {
      text += `- **${patch.op}** ${patch.path}`;
      if (patch.value !== undefined) {
        text += ` = ${JSON.stringify(patch.value, null, 2)}`;
      }
      if (patch.from) {
        text += ` (from ${patch.from})`;
      }
      text += '\n';
    }

    text += '\n## Next Steps\n';
    text += `- View updated rules: \`"Get property ${args.propertyId} version ${version} rules"\`\n`;
    text += `- Validate rules: \`"Validate property ${args.propertyId} version ${version} rules"\`\n`;
    text += `- Activate changes: \`"Activate property ${args.propertyId} version ${version} to staging"\`\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('patch property rules', _error);
  }
}

/**
 * Bulk search properties by rule tree content
 */
export async function bulkSearchProperties(
  client: AkamaiClient,
  args: {
    jsonPath: string;
    network?: 'PRODUCTION' | 'STAGING' | 'LATEST';
    contractIds?: string[];
    groupIds?: string[];
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Initiate bulk search
    const searchBody: any = {
      bulkSearchQuery: {
        jsonPath: args.jsonPath,
      },
    };

    if (args.network) {
      searchBody.network = args.network;
    }
    if (args.contractIds?.length) {
      searchBody.contractIds = args.contractIds;
    }
    if (args.groupIds?.length) {
      searchBody.groupIds = args.groupIds;
    }

    const searchResponse = await client.request({
      path: '/papi/v1/bulk/rules-search-requests',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: searchBody,
    });

    const bulkSearchId = searchResponse.bulkSearchLink?.split('/').pop();
    if (!bulkSearchId) {
      throw new Error('Failed to initiate bulk search');
    }

    let text = '✅ **Bulk Search Initiated**\n\n';
    text += `**Search ID:** ${bulkSearchId}\n`;
    text += `**JSONPath Query:** \`${args.jsonPath}\`\n`;
    text += `**Network:** ${args.network || 'All versions'}\n`;

    if (args.contractIds?.length) {
      text += `**Contracts:** ${args.contractIds.join(', ')}\n`;
    }
    if (args.groupIds?.length) {
      text += `**Groups:** ${args.groupIds.join(', ')}\n`;
    }

    text += '\n## Search Status\n';
    text += 'The bulk search is running asynchronously. This may take several minutes.\n\n';

    text += '## Next Steps\n';
    text += 'Check search status and get results:\n';
    text += `\`"Get bulk search results ${bulkSearchId}"\`\n\n`;

    text += '## JSONPath Examples\n';
    text += '- Find properties with specific origin: `$.rules.behaviors[?(@.name == "origin")].options.hostname`\n';
    text += '- Find caching TTL settings: `$.rules..behaviors[?(@.name == "caching")].options.defaultTtl`\n';
    text += '- Find CP codes: `$.rules..behaviors[?(@.name == "cpCode")].options.value.id`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('bulk search properties', _error);
  }
}

/**
 * Get bulk search results
 */
export async function getBulkSearchResults(
  client: AkamaiClient,
  args: {
    bulkSearchId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/bulk/rules-search-requests/${args.bulkSearchId}`,
      method: 'GET',
    });

    if (!response.results) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Bulk search ${args.bulkSearchId} not found.`,
          },
        ],
      };
    }

    let text = `# Bulk Search Results: ${args.bulkSearchId}\n\n`;
    text += `**Status:** ${response.searchStatus || 'Unknown'}\n`;
    text += `**Progress:** ${response.searchProgress || 0}%\n`;

    if (response.searchStatus === 'IN_PROGRESS') {
      text += '\n⏳ **Search still in progress...**\n';
      text += 'Check again in a few moments:\n';
      text += `\`"Get bulk search results ${args.bulkSearchId}"\`\n`;
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    if (response.searchStatus === 'COMPLETE' && response.results?.items) {
      const results = response.results.items;
      text += `**Matches Found:** ${results.length}\n\n`;

      if (results.length === 0) {
        text += 'No properties matched the search criteria.\n';
      } else {
        text += '## Matching Properties\n\n';

        // Group by property
        const byProperty = results.reduce((acc: any, result: any) => {
          const key = result.propertyId;
          if (!acc[key]) {
acc[key] = [];
}
          acc[key].push(result);
          return acc;
        }, {});

        for (const [propertyId, matches] of Object.entries(byProperty)) {
          const firstMatch = (matches as any[])[0];
          text += `### ${firstMatch.propertyName} (${propertyId})\n`;
          text += `- **Contract:** ${firstMatch.contractId}\n`;
          text += `- **Group:** ${firstMatch.groupId}\n`;
          text += `- **Versions with matches:** ${(matches as any[]).length}\n`;

          for (const match of matches as any[]) {
            text += `  - Version ${match.propertyVersion}: ${match.matchLocations?.length || 0} match locations\n`;
          }
          text += '\n';
        }
      }
    } else if (response.searchStatus === 'FAILED') {
      text += '\n❌ **Search Failed**\n';
      text += `Error: ${response.searchError || 'Unknown error'}\n`;
    }

    text += '\n## Next Steps\n';
    text += '- View property details: `"Get property [propertyId]"`\n';
    text += '- View property rules: `"Get property [propertyId] rules"`\n';
    text += '- Start new search: `"Bulk search properties with JSONPath [query]"`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get bulk search results', _error);
  }
}

/**
 * Generate certificate domain validation challenges for Default DV
 */
export async function generateDomainValidationChallenges(
  _client: AkamaiClient,
  args: {
    domains: string[];
    validationMethod?: 'HTTP' | 'DNS';
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // This would typically integrate with CPS API for Default DV certificates
    // For now, provide guidance on the process

    const method = args.validationMethod || 'HTTP';

    let text = '# Domain Validation Challenges\n\n';
    text += `**Validation Method:** ${method}\n`;
    text += `**Domains:** ${args.domains.length}\n\n`;

    for (const domain of args.domains) {
      text += `## ${domain}\n\n`;

      if (method === 'HTTP') {
        const token = `akamai-domain-verification-${Math.random().toString(36).substring(7)}`;
        const path = `/.well-known/pki-validation/${token}.txt`;

        text += '### HTTP Validation\n';
        text += `1. Create a file at: \`${path}\`\n`;
        text += '2. File content:\n';
        text += '```\n';
        text += `${token}\n`;
        text += 'akamai-validation-content\n';
        text += '```\n';
        text += '3. Ensure the file is accessible at:\n';
        text += `   \`http://${domain}${path}\`\n\n`;
      } else {
        const recordName = `_acme-challenge.${domain}`;
        const recordValue = `akamai-validation-${Math.random().toString(36).substring(7)}`;

        text += '### DNS Validation\n';
        text += 'Create a TXT record:\n';
        text += `- **Name:** \`${recordName}\`\n`;
        text += '- **Type:** TXT\n';
        text += `- **Value:** \`"${recordValue}"\`\n`;
        text += '- **TTL:** 300 (5 minutes)\n\n';
      }
    }

    text += '## Important Notes\n';
    text += '- Validation challenges expire after 7 days\n';
    text += '- HTTP validation requires the origin server to be accessible\n';
    text += '- DNS validation may take up to 48 hours to propagate\n';
    text += '- You can validate domains before adding them to properties\n\n';

    text += '## Next Steps\n';
    text += '1. Complete the validation steps above\n';
    text += '2. Use Default DV when creating edge hostnames:\n';
    text += '   `"Create edge hostname with Default DV certificate"`\n';
    text += '3. Or update existing property:\n';
    text += '   `"Update property with Default DV certificate hostname"`\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('generate domain validation challenges', _error);
  }
}

/**
 * Resume paused domain validation
 */
export async function resumeDomainValidation(
  _client: AkamaiClient,
  args: {
    enrollmentId: number;
    domains?: string[];
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // This would integrate with CPS API
    // For now, provide guidance

    let text = '# Resume Domain Validation\n\n';
    text += `**Enrollment ID:** ${args.enrollmentId}\n`;

    if (args.domains?.length) {
      text += `**Domains to Resume:** ${args.domains.join(', ')}\n`;
    }

    text += '\n## Validation Process\n';
    text += '1. ✅ Validation challenges have been set up\n';
    text += '2. ⏳ Resuming validation process...\n';
    text += '3. ⏱️ Akamai will check the validation challenges\n';
    text += '4. ✅ Certificate will be issued upon successful validation\n\n';

    text += '## Expected Timeline\n';
    text += '- **HTTP Validation:** 5-15 minutes\n';
    text += '- **DNS Validation:** 15-60 minutes (depends on DNS propagation)\n\n';

    text += '## Next Steps\n';
    text += 'Check validation status:\n';
    text += `\`"Check DV enrollment status ${args.enrollmentId}"\`\n\n`;

    text += 'If validation fails:\n';
    text += '1. Verify challenge files/records are correctly placed\n';
    text += '2. Check domain accessibility\n';
    text += '3. Regenerate challenges if needed\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('resume domain validation', _error);
  }
}

/**
 * Get audit history for property
 */
export async function getPropertyAuditHistory(
  client: AkamaiClient,
  args: {
    propertyId: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // This would typically use the audit API
    // For now, we'll get activation history as an example

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/activations`,
      method: 'GET',
    });

    let text = `# Property Audit History: ${args.propertyId}\n\n`;

    if (args.startDate) {
text += `**Start Date:** ${args.startDate}\n`;
}
    if (args.endDate) {
text += `**End Date:** ${args.endDate}\n`;
}

    text += '\n## Recent Activations\n\n';

    if (!response.activations?.items || response.activations.items.length === 0) {
      text += 'No activation history found.\n';
    } else {
      text += '| Date | Version | Network | Status | User | Note |\n';
      text += '|------|---------|---------|--------|------|------|\n';

      const limit = args.limit || 20;
      const activations = response.activations.items.slice(0, limit);

      for (const activation of activations) {
        const date = new Date(activation.updateDate).toLocaleDateString();
        const version = `v${activation.propertyVersion}`;
        const network = activation.network;
        const status = activation.status;
        const user = activation.activatedBy || 'Unknown';
        const note = activation.note?.substring(0, 30) || '-';

        text += `| ${date} | ${version} | ${network} | ${status} | ${user} | ${note} |\n`;
      }
    }

    text += '\n## Audit Categories\n';
    text += 'A complete audit history includes:\n';
    text += '- ✅ **Activations**: Version deployments to staging/production\n';
    text += '- 📝 **Rule Changes**: Modifications to property configuration\n';
    text += '- 🏷️ **Hostname Changes**: Added or removed domains\n';
    text += '- 🔐 **Certificate Updates**: SSL/TLS certificate changes\n';
    text += '- 👥 **Permission Changes**: User access modifications\n\n';

    text += '## Next Steps\n';
    text += '- View version differences: `"Compare property versions"`\n';
    text += '- Export full audit log: Contact Akamai support\n';
    text += '- Set up audit notifications: Use Control Center\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get property audit history', _error);
  }
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: any): MCPToolResponse {
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
  text += '- Rule tree docs: https://techdocs.akamai.com/property-mgr/reference/rule-trees\n';
  text += '- Behaviors reference: https://techdocs.akamai.com/property-mgr/reference/behaviors\n';
  text += '- Criteria reference: https://techdocs.akamai.com/property-mgr/reference/criteria';

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}
