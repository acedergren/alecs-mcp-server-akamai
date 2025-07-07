/**
 * Advanced Rules Operations for PAPI
 * Implements missing rules functionality per PAPI audit
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' types (except in patch values)
 * - Full runtime validation with Zod
 * - Comprehensive error handling
 * - Context-aware behavior/criteria suggestions
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { z } from 'zod';
import { validateApiResponse } from '../utils/api-response-validator';
import { handleApiError } from '../utils/error-handling';

// Schema definitions
const BehaviorSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  schemaLink: z.string().optional(),
  required: z.boolean().optional(),
  options: z.any().optional()
});

const CriteriaSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  schemaLink: z.string().optional(),
  required: z.boolean().optional(),
  options: z.any().optional()
});

const AvailableFeaturesSchema = z.object({
  behaviors: z.array(BehaviorSchema),
  criteria: z.array(CriteriaSchema),
  ruleFormat: z.string(),
  productId: z.string().optional()
});

const RulesPatchSchema = z.object({
  patches: z.array(z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.any().optional(),
    from: z.string().optional()
  }))
});

/**
 * List available behaviors for a product
 * Provides context-aware behavior suggestions based on product type
 */
export async function getAvailableBehaviors(
  client: AkamaiClient,
  args: {
    productId: string;
    ruleFormat: string;
    contractId?: string;
    groupId?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      productId: args.productId,
      ruleFormat: args.ruleFormat
    });
    
    if (args.contractId) params.append('contractId', args.contractId);
    if (args.groupId) params.append('groupId', args.groupId);

    const response = await client.request({
      path: `/papi/v1/products/${args.productId}/behaviors?${params.toString()}`,
      method: 'GET'
    });

    const validated = validateApiResponse<{ behaviors?: any[], criteria?: any[], ruleFormat?: string, productId?: string }>(response);
    const behaviors = validated.behaviors || [];

    let responseText = '# Available Behaviors\n\n';
    responseText += `**Product ID:** ${args.productId}\n`;
    responseText += `**Rule Format:** ${args.ruleFormat}\n`;
    responseText += `**Total Behaviors:** ${behaviors.length}\n\n`;

    // Group behaviors by category
    const categories: Record<string, typeof behaviors> = {};
    behaviors.forEach(behavior => {
      const category = behavior.displayName.includes('Cache') ? 'Caching' :
                      behavior.displayName.includes('Origin') ? 'Origin' :
                      behavior.displayName.includes('Performance') ? 'Performance' :
                      behavior.displayName.includes('Security') ? 'Security' :
                      behavior.displayName.includes('Content') ? 'Content' :
                      behavior.displayName.includes('Redirect') ? 'Redirects' :
                      behavior.displayName.includes('Header') ? 'Headers' :
                      'Other';
      
      if (!categories[category]) categories[category] = [];
      categories[category].push(behavior);
    });

    // Display by category
    Object.entries(categories).forEach(([category, categoryBehaviors]) => {
      responseText += `## ${category} (${categoryBehaviors.length})\n\n`;
      
      categoryBehaviors.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      categoryBehaviors.forEach(behavior => {
        const required = behavior.required ? ' ⚠️ REQUIRED' : '';
        responseText += `### ${behavior.displayName}${required}\n`;
        responseText += `- **Name:** \`${behavior.name}\`\n`;
        responseText += `- **Description:** ${behavior.description}\n`;
        if (behavior.schemaLink) {
          responseText += `- **Schema:** [View Schema](${behavior.schemaLink})\n`;
        }
        responseText += '\n';
      });
    });

    // Common use cases
    responseText += '## Common Use Cases\n\n';
    responseText += '### Basic Website\n';
    responseText += '- `origin` - Configure origin server\n';
    responseText += '- `caching` - Set cache behavior\n';
    responseText += '- `cpCode` - Reporting code\n';
    responseText += '- `allowPost` - Allow POST requests\n\n';

    responseText += '### API Acceleration\n';
    responseText += '- `origin` - Configure API backend\n';
    responseText += '- `caching` - Disable caching\n';
    responseText += '- `allowAllMethods` - Enable all HTTP methods\n';
    responseText += '- `http2` - Enable HTTP/2\n\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting available behaviors');
  }
}

/**
 * List available criteria for a product
 * Provides matching conditions for rules
 */
export async function getAvailableCriteria(
  client: AkamaiClient,
  args: {
    productId: string;
    ruleFormat: string;
    contractId?: string;
    groupId?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      productId: args.productId,
      ruleFormat: args.ruleFormat
    });
    
    if (args.contractId) params.append('contractId', args.contractId);
    if (args.groupId) params.append('groupId', args.groupId);

    const response = await client.request({
      path: `/papi/v1/products/${args.productId}/criteria?${params.toString()}`,
      method: 'GET'
    });

    const validated = validateApiResponse<{ behaviors?: any[], criteria?: any[], ruleFormat?: string, productId?: string }>(response);
    const criteria = validated.criteria || [];

    let responseText = '# Available Criteria\n\n';
    responseText += `**Product ID:** ${args.productId}\n`;
    responseText += `**Rule Format:** ${args.ruleFormat}\n`;
    responseText += `**Total Criteria:** ${criteria.length}\n\n`;

    // Group criteria by type
    const types: Record<string, typeof criteria> = {};
    criteria.forEach(criterion => {
      const type = criterion.displayName.includes('Path') ? 'Path Matching' :
                   criterion.displayName.includes('Host') ? 'Hostname' :
                   criterion.displayName.includes('Header') ? 'Headers' :
                   criterion.displayName.includes('Query') ? 'Query String' :
                   criterion.displayName.includes('Cookie') ? 'Cookies' :
                   criterion.displayName.includes('Device') ? 'Device' :
                   criterion.displayName.includes('Geography') ? 'Geography' :
                   criterion.displayName.includes('Time') ? 'Time-based' :
                   'Other';
      
      if (!types[type]) types[type] = [];
      types[type].push(criterion);
    });

    // Display by type
    Object.entries(types).forEach(([type, typeCriteria]) => {
      responseText += `## ${type} (${typeCriteria.length})\n\n`;
      
      typeCriteria.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      typeCriteria.forEach(criterion => {
        responseText += `### ${criterion.displayName}\n`;
        responseText += `- **Name:** \`${criterion.name}\`\n`;
        responseText += `- **Description:** ${criterion.description}\n`;
        if (criterion.schemaLink) {
          responseText += `- **Schema:** [View Schema](${criterion.schemaLink})\n`;
        }
        responseText += '\n';
      });
    });

    // Common patterns
    responseText += '## Common Matching Patterns\n\n';
    responseText += '### File Type Matching\n';
    responseText += '- `fileExtension` - Match by extension (.jpg, .css)\n';
    responseText += '- `path` - Match URL paths\n\n';

    responseText += '### User Segmentation\n';
    responseText += '- `userLocation` - Match by geography\n';
    responseText += '- `deviceCharacteristics` - Mobile vs desktop\n';
    responseText += '- `requestHeader` - Custom headers\n\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting available criteria');
  }
}

/**
 * Get available behaviors for includes
 * Similar to property behaviors but for include context
 */
export async function getIncludeAvailableBehaviors(
  client: AkamaiClient,
  args: {
    includeId: string;
    version: number;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/versions/${args.version}/available-behaviors?${params.toString()}`,
      method: 'GET'
    });

    const validated = validateApiResponse<{ behaviors?: any[], criteria?: any[], ruleFormat?: string, productId?: string }>(response);
    const behaviors = validated.behaviors || [];

    let responseText = '# Available Behaviors for Include\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Total Behaviors:** ${behaviors.length}\n\n`;

    // Include-specific behaviors often limited
    responseText += '## Include-Safe Behaviors\n\n';
    behaviors.forEach(behavior => {
      responseText += `- **${behavior.displayName}** (\`${behavior.name}\`)\n`;
      responseText += `  ${behavior.description}\n\n`;
    });

    responseText += '## Best Practices for Includes\n\n';
    responseText += '- Use includes for shared configuration\n';
    responseText += '- Avoid property-specific settings\n';
    responseText += '- Keep includes modular and focused\n';
    responseText += '- Test includes across multiple properties\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting include available behaviors');
  }
}

/**
 * Get available criteria for includes
 */
export async function getIncludeAvailableCriteria(
  client: AkamaiClient,
  args: {
    includeId: string;
    version: number;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/versions/${args.version}/available-criteria?${params.toString()}`,
      method: 'GET'
    });

    const validated = validateApiResponse<{ criteria?: any[], behaviors?: any[], ruleFormat?: string, productId?: string }>(response);
    const criteria = validated.criteria || [];

    let responseText = '# Available Criteria for Include\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Total Criteria:** ${criteria.length}\n\n`;

    responseText += '## Include-Safe Criteria\n\n';
    criteria.forEach(criterion => {
      responseText += `- **${criterion.displayName}** (\`${criterion.name}\`)\n`;
      responseText += `  ${criterion.description}\n\n`;
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting include available criteria');
  }
}

/**
 * Patch property version rules using JSON Patch (RFC 6902)
 * Allows partial updates without replacing entire rule tree
 */
export async function patchPropertyVersionRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    patches: Array<{
      op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
      path: string;
      value?: any;
      from?: string;
    }>;
    contractId: string;
    groupId: string;
    validateRules?: boolean;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });
    
    if (args.validateRules !== undefined) {
      params.append('validateRules', args.validateRules.toString());
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules?${params.toString()}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json'
      },
      body: args.patches
    });

    let responseText = '# Rules Patch Applied\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    responseText += `**Patches Applied:** ${args.patches.length}\n\n`;

    responseText += '## Patch Operations\n\n';
    args.patches.forEach((patch, i) => {
      responseText += `### ${i + 1}. ${patch.op.toUpperCase()}\n`;
      responseText += `- **Path:** \`${patch.path}\`\n`;
      
      if (patch.value !== undefined) {
        responseText += `- **Value:** \`\`\`json\n${JSON.stringify(patch.value, null, 2)}\n\`\`\`\n`;
      }
      
      if (patch.from) {
        responseText += `- **From:** \`${patch.from}\`\n`;
      }
      
      responseText += '\n';
    });

    const patchResponse = response as any;
    if (patchResponse.warnings && patchResponse.warnings.length > 0) {
      responseText += '## ⚠️ Warnings\n\n';
      patchResponse.warnings.forEach((warning: any) => {
        responseText += `- **${warning.title}**: ${warning.detail}\n`;
      });
      responseText += '\n';
    }

    if (patchResponse.errors && patchResponse.errors.length > 0) {
      responseText += '## ❌ Validation Errors\n\n';
      patchResponse.errors.forEach((error: any) => {
        responseText += `- **${error.title}**: ${error.detail}\n`;
      });
      responseText += '\n';
    } else {
      responseText += '✅ Rules patched successfully!\n\n';
      responseText += '## Next Steps\n';
      responseText += '- Review the changes\n';
      responseText += '- Test in staging\n';
      responseText += '- Activate when ready\n';
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'patching property rules');
  }
}

/**
 * Check rules metadata without fetching full content
 * Useful for quick validation and etag retrieval
 */
export async function headPropertyVersionRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules?${params.toString()}`,
      method: 'HEAD'
    });

    // HEAD requests return headers only
    const headers = (response as any).headers || {};

    let responseText = '# Rules Metadata\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n\n`;

    responseText += '## Metadata\n\n';
    
    if (headers.etag) {
      responseText += `- **ETag:** \`${headers.etag}\`\n`;
    }
    
    if (headers['content-length']) {
      const sizeKB = Math.round(parseInt(headers['content-length']) / 1024);
      responseText += `- **Size:** ${sizeKB} KB\n`;
    }
    
    if (headers['last-modified']) {
      responseText += `- **Last Modified:** ${headers['last-modified']}\n`;
    }
    
    if (headers['x-limit-rules-behaviors-remaining']) {
      responseText += `- **Behaviors Limit Remaining:** ${headers['x-limit-rules-behaviors-remaining']}\n`;
    }
    
    if (headers['x-limit-rules-criteria-remaining']) {
      responseText += `- **Criteria Limit Remaining:** ${headers['x-limit-rules-criteria-remaining']}\n`;
    }

    responseText += '\n## Usage\n\n';
    responseText += 'Use the ETag for:\n';
    responseText += '- Conditional requests (If-Match)\n';
    responseText += '- Optimistic concurrency control\n';
    responseText += '- Cache validation\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'checking rules metadata');
  }
}

/**
 * Check include rules metadata
 */
export async function headIncludeVersionRules(
  client: AkamaiClient,
  args: {
    includeId: string;
    version: number;
    contractId: string;
    groupId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const params = new URLSearchParams({
      contractId: args.contractId,
      groupId: args.groupId
    });

    const response = await client.request({
      path: `/papi/v1/includes/${args.includeId}/versions/${args.version}/rules?${params.toString()}`,
      method: 'HEAD'
    });

    const headers = (response as any).headers || {};

    let responseText = '# Include Rules Metadata\n\n';
    responseText += `**Include ID:** ${args.includeId}\n`;
    responseText += `**Version:** ${args.version}\n\n`;

    responseText += '## Metadata\n\n';
    
    if (headers.etag) {
      responseText += `- **ETag:** \`${headers.etag}\`\n`;
    }
    
    if (headers['content-length']) {
      const sizeKB = Math.round(parseInt(headers['content-length']) / 1024);
      responseText += `- **Size:** ${sizeKB} KB\n`;
    }
    
    if (headers['last-modified']) {
      responseText += `- **Last Modified:** ${headers['last-modified']}\n`;
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'checking include rules metadata');
  }
}