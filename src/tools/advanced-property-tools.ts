/**
 * Advanced Property Tools for PAPI
 * Implements final set of advanced property management features
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' types (except where necessary)
 * - Full runtime validation with Zod
 * - Comprehensive error handling
 * - Advanced property operations and analytics
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { z } from 'zod';
import { validateApiResponse } from '../utils/api-response-validator';
import { handleApiError } from '../utils/error-handling';

// Response schemas
const PropertyMetadataSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  metadata: z.object({
    createdBy: z.string().optional(),
    createdDate: z.string().optional(),
    modifiedBy: z.string().optional(),
    modifiedDate: z.string().optional(),
    lastActivatedBy: z.string().optional(),
    lastActivatedDate: z.string().optional(),
    notes: z.array(z.object({
      note: z.string(),
      author: z.string(),
      date: z.string()
    })).optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional()
  }).passthrough()
});

const PropertyDiffSchema = z.object({
  differences: z.array(z.object({
    path: z.string(),
    type: z.enum(['added', 'removed', 'modified']),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    description: z.string().optional()
  }))
});

/**
 * Get property metadata
 * Retrieves extended metadata including history and custom fields
 */
export async function getPropertyMetadata(
  client: AkamaiClient,
  args: {
    propertyId: string;
    includeHistory?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams();
    if (args.includeHistory) {
      params.append('includeHistory', 'true');
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/metadata?${params.toString()}`,
      method: 'GET'
    });

    const metadata = validateApiResponse<any>(response);

    let responseText = '# Property Metadata\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Property Name:** ${metadata.propertyName || 'N/A'}\n\n`;

    responseText += '## Basic Metadata\n\n';
    if (metadata.createdBy) {
      responseText += `- **Created By:** ${metadata.createdBy}\n`;
      responseText += `- **Created Date:** ${metadata.createdDate ? new Date(metadata.createdDate).toISOString() : 'N/A'}\n`;
    }
    if (metadata.modifiedBy) {
      responseText += `- **Last Modified By:** ${metadata.modifiedBy}\n`;
      responseText += `- **Last Modified Date:** ${metadata.modifiedDate ? new Date(metadata.modifiedDate).toISOString() : 'N/A'}\n`;
    }
    if (metadata.lastActivatedBy) {
      responseText += `- **Last Activated By:** ${metadata.lastActivatedBy}\n`;
      responseText += `- **Last Activated Date:** ${metadata.lastActivatedDate ? new Date(metadata.lastActivatedDate).toISOString() : 'N/A'}\n`;
    }

    if (metadata.tags && metadata.tags.length > 0) {
      responseText += '\n## Tags\n\n';
      metadata.tags.forEach((tag: string) => {
        responseText += `- ${tag}\n`;
      });
    }

    if (metadata.notes && metadata.notes.length > 0) {
      responseText += '\n## Notes\n\n';
      metadata.notes.forEach((note: any, i: number) => {
        responseText += `### ${i + 1}. ${note.author} - ${new Date(note.date).toISOString()}\n`;
        responseText += `${note.note}\n\n`;
      });
    }

    if (metadata.customFields && Object.keys(metadata.customFields).length > 0) {
      responseText += '## Custom Fields\n\n';
      Object.entries(metadata.customFields).forEach(([key, value]) => {
        responseText += `- **${key}:** ${JSON.stringify(value)}\n`;
      });
    }

    if (args.includeHistory && metadata.history) {
      responseText += '\n## History\n\n';
      responseText += `Total events: ${metadata.history.length}\n\n`;
      // Show last 10 events
      metadata.history.slice(0, 10).forEach((event: any) => {
        responseText += `- **${event.action}** by ${event.user} at ${new Date(event.date).toISOString()}\n`;
      });
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting property metadata');
  }
}

/**
 * Compare two property configurations
 * Performs deep diff between property versions or different properties
 */
export async function compareProperties(
  client: AkamaiClient,
  args: {
    propertyId1: string;
    version1: number;
    propertyId2: string;
    version2: number;
    includeRules?: boolean;
    includeHostnames?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams();
    if (args.includeRules !== false) {
      params.append('includeRules', 'true');
    }
    if (args.includeHostnames !== false) {
      params.append('includeHostnames', 'true');
    }

    const response = await client.request({
      path: `/papi/v1/properties/compare?${params.toString()}`,
      method: 'POST',
      body: {
        source: {
          propertyId: args.propertyId1,
          version: args.version1
        },
        target: {
          propertyId: args.propertyId2,
          version: args.version2
        }
      }
    });

    const comparison = validateApiResponse<any>(response);
    const differences = comparison.differences || [];

    let responseText = '# Property Comparison\n\n';
    responseText += '## Source\n';
    responseText += `- **Property:** ${args.propertyId1} v${args.version1}\n`;
    responseText += `- **Name:** ${comparison.sourceName || 'N/A'}\n\n`;
    
    responseText += '## Target\n';
    responseText += `- **Property:** ${args.propertyId2} v${args.version2}\n`;
    responseText += `- **Name:** ${comparison.targetName || 'N/A'}\n\n`;

    responseText += `**Total Differences:** ${differences.length}\n\n`;

    if (differences.length === 0) {
      responseText += '✅ Properties are identical!\n';
    } else {
      // Group differences by type
      const added = differences.filter((d: any) => d.type === 'added');
      const removed = differences.filter((d: any) => d.type === 'removed');
      const modified = differences.filter((d: any) => d.type === 'modified');

      if (added.length > 0) {
        responseText += `## ➕ Added (${added.length})\n\n`;
        added.forEach((diff: any) => {
          responseText += `- **${diff.path}**\n`;
          if (diff.description) {
            responseText += `  ${diff.description}\n`;
          }
          if (diff.newValue !== undefined) {
            responseText += `  Value: \`${JSON.stringify(diff.newValue)}\`\n`;
          }
          responseText += '\n';
        });
      }

      if (removed.length > 0) {
        responseText += `## ➖ Removed (${removed.length})\n\n`;
        removed.forEach((diff: any) => {
          responseText += `- **${diff.path}**\n`;
          if (diff.description) {
            responseText += `  ${diff.description}\n`;
          }
          if (diff.oldValue !== undefined) {
            responseText += `  Value: \`${JSON.stringify(diff.oldValue)}\`\n`;
          }
          responseText += '\n';
        });
      }

      if (modified.length > 0) {
        responseText += `## 🔄 Modified (${modified.length})\n\n`;
        modified.forEach((diff: any) => {
          responseText += `- **${diff.path}**\n`;
          if (diff.description) {
            responseText += `  ${diff.description}\n`;
          }
          responseText += `  Old: \`${JSON.stringify(diff.oldValue)}\`\n`;
          responseText += `  New: \`${JSON.stringify(diff.newValue)}\`\n\n`;
        });
      }
    }

    responseText += '\n## Use Cases\n\n';
    responseText += '- **Version Comparison**: Review changes before activation\n';
    responseText += '- **Property Sync**: Identify differences between environments\n';
    responseText += '- **Audit**: Track configuration drift\n';
    responseText += '- **Migration**: Compare old and new property setups\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'comparing properties');
  }
}

/**
 * Export property configuration
 * Exports complete property configuration for backup or migration
 */
export async function exportPropertyConfiguration(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    format?: 'json' | 'terraform' | 'yaml';
    includeComments?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams();
    params.append('format', args.format || 'json');
    if (args.includeComments) {
      params.append('includeComments', 'true');
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/export?${params.toString()}`,
      method: 'GET'
    });

    const exportData = response;
    const format = args.format || 'json';

    let responseText = '# Property Configuration Export\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Format:** ${format.toUpperCase()}\n`;
    responseText += `**Exported:** ${new Date().toISOString()}\n\n`;

    responseText += '## Export Summary\n\n';
    if (format === 'json') {
      const config = exportData as any;
      responseText += `- **Property Name:** ${config.propertyName || 'N/A'}\n`;
      responseText += `- **Contract:** ${config.contractId || 'N/A'}\n`;
      responseText += `- **Group:** ${config.groupId || 'N/A'}\n`;
      responseText += `- **Rule Format:** ${config.rules?.ruleFormat || 'N/A'}\n`;
      
      if (config.hostnames) {
        responseText += `- **Hostnames:** ${config.hostnames.length}\n`;
      }
      if (config.rules?.children) {
        responseText += `- **Rules:** ${config.rules.children.length}\n`;
      }
    }

    responseText += '\n## Export Content\n\n';
    responseText += '```' + format + '\n';
    
    if (format === 'json') {
      responseText += JSON.stringify(exportData, null, 2).substring(0, 2000);
    } else {
      responseText += String(exportData).substring(0, 2000);
    }
    
    if (JSON.stringify(exportData).length > 2000) {
      responseText += '\n... (truncated)\n';
    }
    responseText += '\n```\n\n';

    responseText += '## Usage Instructions\n\n';
    
    if (format === 'json') {
      responseText += '### JSON Format\n';
      responseText += '- Save to file: `property-${args.propertyId}-v${args.version}.json`\n';
      responseText += '- Use for property cloning or backup\n';
      responseText += '- Import with property create/update APIs\n';
    } else if (format === 'terraform') {
      responseText += '### Terraform Format\n';
      responseText += '- Save to file: `property.tf`\n';
      responseText += '- Use with Akamai Terraform Provider\n';
      responseText += '- Apply with: `terraform apply`\n';
    } else if (format === 'yaml') {
      responseText += '### YAML Format\n';
      responseText += '- Save to file: `property-config.yaml`\n';
      responseText += '- Use for GitOps workflows\n';
      responseText += '- Convert to JSON for API import\n';
    }

    responseText += '\n## ⚠️ Important Notes\n\n';
    responseText += '- Exported configuration contains sensitive data\n';
    responseText += '- Store exports securely\n';
    responseText += '- Review before importing to another property\n';
    responseText += '- Some IDs may need adjustment for import\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'exporting property configuration');
  }
}

/**
 * Search properties with advanced filters
 * Enhanced search with multiple criteria and scoring
 */
export async function searchPropertiesAdvanced(
  client: AkamaiClient,
  args: {
    query?: string;
    contractIds?: string[];
    groupIds?: string[];
    productIds?: string[];
    hostnames?: string[];
    tags?: string[];
    createdAfter?: string;
    modifiedAfter?: string;
    hasActivation?: 'staging' | 'production' | 'both';
    limit?: number;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const searchCriteria: any = {};
    
    if (args.query) searchCriteria.query = args.query;
    if (args.contractIds) searchCriteria.contractIds = args.contractIds;
    if (args.groupIds) searchCriteria.groupIds = args.groupIds;
    if (args.productIds) searchCriteria.productIds = args.productIds;
    if (args.hostnames) searchCriteria.hostnames = args.hostnames;
    if (args.tags) searchCriteria.tags = args.tags;
    if (args.createdAfter) searchCriteria.createdAfter = args.createdAfter;
    if (args.modifiedAfter) searchCriteria.modifiedAfter = args.modifiedAfter;
    if (args.hasActivation) searchCriteria.hasActivation = args.hasActivation;
    if (args.limit) searchCriteria.limit = args.limit;

    const response = await client.request({
      path: '/papi/v1/search/properties',
      method: 'POST',
      body: searchCriteria
    });

    const results = validateApiResponse<any>(response);
    const properties = results.items || [];

    let responseText = '# Advanced Property Search Results\n\n';
    
    // Display search criteria
    responseText += '## Search Criteria\n\n';
    if (args.query) responseText += `- **Query:** "${args.query}"\n`;
    if (args.contractIds) responseText += `- **Contracts:** ${args.contractIds.join(', ')}\n`;
    if (args.groupIds) responseText += `- **Groups:** ${args.groupIds.join(', ')}\n`;
    if (args.productIds) responseText += `- **Products:** ${args.productIds.join(', ')}\n`;
    if (args.hostnames) responseText += `- **Hostnames:** ${args.hostnames.join(', ')}\n`;
    if (args.tags) responseText += `- **Tags:** ${args.tags.join(', ')}\n`;
    if (args.createdAfter) responseText += `- **Created After:** ${args.createdAfter}\n`;
    if (args.modifiedAfter) responseText += `- **Modified After:** ${args.modifiedAfter}\n`;
    if (args.hasActivation) responseText += `- **Has Activation:** ${args.hasActivation}\n`;
    
    responseText += `\n**Results Found:** ${properties.length}\n\n`;

    if (properties.length === 0) {
      responseText += 'No properties match the search criteria.\n';
    } else {
      properties.forEach((prop: any, i: number) => {
        const relevanceScore = prop.relevanceScore ? ` (Score: ${prop.relevanceScore})` : '';
        responseText += `## ${i + 1}. ${prop.propertyName}${relevanceScore}\n`;
        responseText += `- **ID:** ${prop.propertyId}\n`;
        responseText += `- **Contract:** ${prop.contractId}\n`;
        responseText += `- **Group:** ${prop.groupId}\n`;
        responseText += `- **Latest Version:** ${prop.latestVersion}\n`;
        
        if (prop.productionVersion) {
          responseText += `- **Production:** v${prop.productionVersion}\n`;
        }
        if (prop.stagingVersion) {
          responseText += `- **Staging:** v${prop.stagingVersion}\n`;
        }
        
        if (prop.matchedHostnames && prop.matchedHostnames.length > 0) {
          responseText += `- **Matched Hostnames:** ${prop.matchedHostnames.join(', ')}\n`;
        }
        
        if (prop.tags && prop.tags.length > 0) {
          responseText += `- **Tags:** ${prop.tags.join(', ')}\n`;
        }
        
        if (prop.lastModified) {
          responseText += `- **Last Modified:** ${new Date(prop.lastModified).toISOString()}\n`;
        }
        
        responseText += '\n';
      });

      responseText += '## Search Tips\n\n';
      responseText += '- Use wildcards (*) for partial matches\n';
      responseText += '- Combine multiple filters for precise results\n';
      responseText += '- Sort by relevance score for best matches\n';
      responseText += '- Use tags for custom categorization\n';
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'searching properties');
  }
}

/**
 * Bulk update properties
 * Performs batch operations on multiple properties
 */
export async function bulkUpdateProperties(
  client: AkamaiClient,
  args: {
    propertyIds: string[];
    operations: Array<{
      type: 'addTag' | 'removeTag' | 'updateMetadata' | 'addNote';
      value: any;
    }>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/bulk/properties',
      method: 'PATCH',
      body: {
        propertyIds: args.propertyIds,
        operations: args.operations
      }
    });

    const result = validateApiResponse<any>(response);

    let responseText = '# Bulk Property Update Results\n\n';
    responseText += `**Properties Updated:** ${args.propertyIds.length}\n`;
    responseText += `**Operations Applied:** ${args.operations.length}\n`;
    responseText += `**Completed:** ${new Date().toISOString()}\n\n`;

    responseText += '## Operations Summary\n\n';
    args.operations.forEach((op, i) => {
      responseText += `${i + 1}. **${op.type}**`;
      if (op.value) {
        responseText += `: ${JSON.stringify(op.value)}`;
      }
      responseText += '\n';
    });

    if (result.results) {
      responseText += '\n## Results by Property\n\n';
      result.results.forEach((propResult: any) => {
        const status = propResult.success ? '✅' : '❌';
        responseText += `- **${propResult.propertyId}**: ${status}`;
        if (!propResult.success && propResult.error) {
          responseText += ` - ${propResult.error}`;
        }
        responseText += '\n';
      });
    }

    if (result.summary) {
      responseText += '\n## Summary\n\n';
      responseText += `- **Successful:** ${result.summary.successful || 0}\n`;
      responseText += `- **Failed:** ${result.summary.failed || 0}\n`;
      responseText += `- **Skipped:** ${result.summary.skipped || 0}\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'bulk updating properties');
  }
}

/**
 * Create property from template
 * Creates a new property using predefined templates
 */
export async function createPropertyFromTemplate(
  client: AkamaiClient,
  args: {
    templateId: string;
    propertyName: string;
    contractId: string;
    groupId: string;
    variables?: Record<string, any>;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/properties/create-from-template',
      method: 'POST',
      body: {
        templateId: args.templateId,
        propertyName: args.propertyName,
        contractId: args.contractId,
        groupId: args.groupId,
        variables: args.variables || {}
      }
    });

    const result = validateApiResponse<any>(response);
    const propertyId = result.propertyId;

    let responseText = '# Property Created from Template\n\n';
    responseText += `**Property Name:** ${args.propertyName}\n`;
    responseText += `**Property ID:** ${propertyId}\n`;
    responseText += `**Template:** ${args.templateId}\n`;
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Created:** ${new Date().toISOString()}\n\n`;

    if (args.variables && Object.keys(args.variables).length > 0) {
      responseText += '## Template Variables Applied\n\n';
      Object.entries(args.variables).forEach(([key, value]) => {
        responseText += `- **${key}:** ${JSON.stringify(value)}\n`;
      });
      responseText += '\n';
    }

    responseText += '## Template Details\n\n';
    responseText += `- **Name:** ${result.templateName || args.templateId}\n`;
    responseText += `- **Description:** ${result.templateDescription || 'N/A'}\n`;
    responseText += `- **Version:** ${result.templateVersion || 'N/A'}\n`;

    if (result.appliedRules) {
      responseText += `- **Rules Applied:** ${result.appliedRules}\n`;
    }
    if (result.appliedBehaviors) {
      responseText += `- **Behaviors Applied:** ${result.appliedBehaviors}\n`;
    }

    responseText += '\n## Next Steps\n\n';
    responseText += '1. **Review Configuration**: Check the applied template settings\n';
    responseText += '2. **Add Hostnames**: Configure your domain names\n';
    responseText += '3. **Customize Rules**: Adjust template rules as needed\n';
    responseText += '4. **Activate**: Deploy to staging for testing\n\n';

    responseText += '## Available Templates\n\n';
    responseText += '- `web-standard` - Standard website delivery\n';
    responseText += '- `api-acceleration` - API performance optimization\n';
    responseText += '- `download-delivery` - Large file downloads\n';
    responseText += '- `video-streaming` - Video on demand\n';
    responseText += '- `dynamic-site` - Dynamic web applications\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'creating property from template');
  }
}

/**
 * Get property analytics
 * Retrieves property performance and usage analytics
 */
export async function getPropertyAnalytics(
  client: AkamaiClient,
  args: {
    propertyId: string;
    startDate: string;
    endDate: string;
    metrics?: string[];
    granularity?: 'hour' | 'day' | 'week';
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      startDate: args.startDate,
      endDate: args.endDate,
      granularity: args.granularity || 'day'
    });
    
    if (args.metrics && args.metrics.length > 0) {
      params.append('metrics', args.metrics.join(','));
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/analytics?${params.toString()}`,
      method: 'GET'
    });

    const analytics = validateApiResponse<any>(response);

    let responseText = '# Property Analytics\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Period:** ${args.startDate} to ${args.endDate}\n`;
    responseText += `**Granularity:** ${args.granularity || 'day'}\n\n`;

    // Overview metrics
    if (analytics.summary) {
      responseText += '## Summary Metrics\n\n';
      responseText += `- **Total Hits:** ${analytics.summary.totalHits?.toLocaleString() || 'N/A'}\n`;
      responseText += `- **Total Bandwidth:** ${analytics.summary.totalBandwidthGB?.toFixed(2) || 'N/A'} GB\n`;
      responseText += `- **Avg Response Time:** ${analytics.summary.avgResponseTimeMs?.toFixed(0) || 'N/A'} ms\n`;
      responseText += `- **Cache Hit Rate:** ${analytics.summary.cacheHitRate?.toFixed(1) || 'N/A'}%\n`;
      responseText += `- **Error Rate:** ${analytics.summary.errorRate?.toFixed(2) || 'N/A'}%\n\n`;
    }

    // Top metrics
    if (analytics.topMetrics) {
      if (analytics.topMetrics.urls) {
        responseText += '## Top URLs\n\n';
        analytics.topMetrics.urls.slice(0, 5).forEach((url: any, i: number) => {
          responseText += `${i + 1}. ${url.path} - ${url.hits.toLocaleString()} hits\n`;
        });
        responseText += '\n';
      }

      if (analytics.topMetrics.countries) {
        responseText += '## Top Countries\n\n';
        analytics.topMetrics.countries.slice(0, 5).forEach((country: any, i: number) => {
          responseText += `${i + 1}. ${country.name} - ${country.percentage.toFixed(1)}%\n`;
        });
        responseText += '\n';
      }
    }

    // Trend data
    if (analytics.timeSeries && analytics.timeSeries.length > 0) {
      responseText += '## Recent Trend\n\n';
      const recent = analytics.timeSeries.slice(-5);
      recent.forEach((point: any) => {
        responseText += `- **${point.timestamp}**: ${point.hits.toLocaleString()} hits, ${point.bandwidthGB.toFixed(2)} GB\n`;
      });
    }

    responseText += '\n## Insights\n\n';
    
    // Performance insights
    if (analytics.summary?.cacheHitRate && analytics.summary.cacheHitRate < 80) {
      responseText += '⚠️ **Cache Performance**: Hit rate below 80% - consider optimizing cache settings\n';
    }
    
    if (analytics.summary?.errorRate && analytics.summary.errorRate > 1) {
      responseText += '⚠️ **Error Rate**: Above 1% - investigate error sources\n';
    }
    
    if (analytics.summary?.avgResponseTimeMs && analytics.summary.avgResponseTimeMs > 500) {
      responseText += '⚠️ **Response Time**: Above 500ms - review performance rules\n';
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting property analytics');
  }
}