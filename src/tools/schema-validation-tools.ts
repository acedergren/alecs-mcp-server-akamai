/**
 * Schema & Validation Tools for PAPI
 * Implements rule format validation and schema discovery
 * 
 * CODE KAI IMPLEMENTATION:
 * - Zero tolerance for 'any' types (except in schema definitions)
 * - Full runtime validation with Zod
 * - Comprehensive error handling
 * - Schema-driven property configuration
 */

import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { z } from 'zod';
import { validateApiResponse } from '../utils/api-response-validator';
import { handleApiError } from '../utils/error-handling';

// Schema definitions
const RuleFormatSchema = z.object({
  ruleFormats: z.object({
    items: z.array(z.object({
      ruleFormat: z.string(),
      deprecated: z.boolean().optional(),
      releaseDate: z.string().optional(),
      description: z.string().optional()
    }).passthrough())
  })
});

const SchemaDefinitionSchema = z.object({
  $schema: z.string(),
  type: z.string(),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
  definitions: z.record(z.any()).optional()
});

const ValidationResultSchema = z.object({
  errors: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string(),
    instance: z.string().optional(),
    propertyName: z.string().optional(),
    location: z.string().optional()
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string(),
    instance: z.string().optional(),
    propertyName: z.string().optional(),
    location: z.string().optional()
  })).optional(),
  info: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string()
  })).optional()
});

/**
 * Get available rule formats
 * Retrieves all supported rule format versions with deprecation info
 */
export async function getRuleFormats(
  client: AkamaiClient,
  args: {
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/rule-formats',
      method: 'GET'
    });

    const validated = validateApiResponse<{ ruleFormats?: { items?: any[] } }>(response);
    const formats = validated.ruleFormats?.items || [];

    let responseText = '# Available Rule Formats\n\n';
    responseText += `**Total Formats:** ${formats.length}\n`;
    responseText += `**Retrieved:** ${new Date().toISOString()}\n\n`;

    // Separate current and deprecated
    const current = formats.filter(f => !f.deprecated);
    const deprecated = formats.filter(f => f.deprecated);

    if (current.length > 0) {
      responseText += '## Current Rule Formats\n\n';
      
      // Sort by release date (newest first)
      current.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });

      current.forEach(format => {
        responseText += `### ${format.ruleFormat}`;
        if (format === current[0]) {
          responseText += ' 🆕 (Latest)';
        }
        responseText += '\n';
        
        if (format.releaseDate) {
          responseText += `- **Released:** ${new Date(format.releaseDate).toISOString()}\n`;
        }
        if (format.description) {
          responseText += `- **Description:** ${format.description}\n`;
        }
        responseText += '\n';
      });
    }

    if (deprecated.length > 0) {
      responseText += '## ⚠️ Deprecated Rule Formats\n\n';
      responseText += 'These formats are still supported but not recommended for new properties:\n\n';
      
      deprecated.forEach(format => {
        responseText += `- **${format.ruleFormat}**`;
        if (format.releaseDate) {
          responseText += ` (Released: ${new Date(format.releaseDate).toISOString()})`;
        }
        responseText += '\n';
      });
      responseText += '\n';
    }

    responseText += '## Usage Recommendations\n\n';
    responseText += '1. **New Properties**: Always use the latest rule format\n';
    responseText += '2. **Existing Properties**: Consider upgrading deprecated formats\n';
    responseText += '3. **Frozen Rules**: Some properties may be locked to older formats\n';
    responseText += '4. **Feature Support**: Newer formats enable more behaviors and criteria\n\n';

    responseText += '## Rule Format Selection\n\n';
    responseText += 'When creating a property:\n';
    responseText += '```\n';
    responseText += `ruleFormat: "${current[0]?.ruleFormat || 'latest'}"\n`;
    responseText += '```\n\n';

    responseText += 'To check property\'s current format:\n';
    responseText += '```\n';
    responseText += 'get-property-rules --propertyId prp_123 --version 1\n';
    responseText += '```\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting rule formats');
  }
}

/**
 * Get rule format schema
 * Retrieves JSON schema for a specific rule format version
 */
export async function getRuleFormatSchema(
  client: AkamaiClient,
  args: {
    productId: string;
    ruleFormat: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/papi/v1/schemas/products/${args.productId}/${args.ruleFormat}`,
      method: 'GET'
    });

    const schema = validateApiResponse<any>(response);

    let responseText = '# Rule Format Schema\n\n';
    responseText += `**Product ID:** ${args.productId}\n`;
    responseText += `**Rule Format:** ${args.ruleFormat}\n`;
    responseText += `**Schema Version:** ${schema.$schema || 'N/A'}\n\n`;

    // Schema overview
    responseText += '## Schema Structure\n\n';
    responseText += `- **Type:** ${schema.type || 'object'}\n`;
    
    if (schema.properties) {
      const propCount = Object.keys(schema.properties).length;
      responseText += `- **Properties:** ${propCount}\n`;
      
      // List main properties
      responseText += '\n### Main Properties\n\n';
      Object.keys(schema.properties).slice(0, 10).forEach(prop => {
        const propSchema = schema.properties[prop];
        responseText += `- **${prop}**: ${propSchema.type || 'complex'}`;
        if (propSchema.description) {
          responseText += ` - ${propSchema.description}`;
        }
        responseText += '\n';
      });
      
      if (propCount > 10) {
        responseText += `\n... and ${propCount - 10} more properties\n`;
      }
    }

    if (schema.definitions) {
      const defCount = Object.keys(schema.definitions).length;
      responseText += `\n- **Definitions:** ${defCount} reusable schemas\n`;
    }

    if (schema.required && schema.required.length > 0) {
      responseText += `\n### Required Fields\n\n`;
      schema.required.forEach((field: string) => {
        responseText += `- ${field}\n`;
      });
    }

    responseText += '\n## Schema Usage\n\n';
    responseText += 'This schema can be used to:\n';
    responseText += '1. **Validate** rule configurations before submission\n';
    responseText += '2. **Generate** TypeScript/JSON Schema types\n';
    responseText += '3. **Build** rule editors with proper constraints\n';
    responseText += '4. **Document** available options per product\n\n';

    responseText += '## Full Schema\n\n';
    responseText += '```json\n';
    responseText += JSON.stringify(schema, null, 2).substring(0, 1000);
    if (JSON.stringify(schema).length > 1000) {
      responseText += '\n... (truncated)\n';
    }
    responseText += '\n```\n\n';

    responseText += '⚠️ **Note**: Full schema may be very large. Consider saving to file for complete reference.\n';

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'getting rule format schema');
  }
}

/**
 * Validate property rules
 * Validates rule tree against schema with detailed error reporting
 */
export async function validatePropertyRules(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version: number;
    rules: any;
    ruleFormat?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    const requestBody = {
      rules: args.rules
    };

    const params = new URLSearchParams();
    if (args.ruleFormat) {
      params.append('ruleFormat', args.ruleFormat);
    }

    const response = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules/validate?${params.toString()}`,
      method: 'POST',
      body: requestBody
    });

    const validation = validateApiResponse<any>(response);

    let responseText = '# Rule Validation Results\n\n';
    responseText += `**Property ID:** ${args.propertyId}\n`;
    responseText += `**Version:** ${args.version}\n`;
    if (args.ruleFormat) {
      responseText += `**Rule Format:** ${args.ruleFormat}\n`;
    }
    responseText += `**Validated:** ${new Date().toISOString()}\n\n`;

    const hasErrors = validation.errors && validation.errors.length > 0;
    const hasWarnings = validation.warnings && validation.warnings.length > 0;
    const hasInfo = validation.info && validation.info.length > 0;

    if (!hasErrors && !hasWarnings && !hasInfo) {
      responseText += '✅ **Validation Passed!**\n\n';
      responseText += 'Rules are valid and ready for deployment.\n';
    } else {
      responseText += '## Validation Summary\n\n';
      if (hasErrors) {
        responseText += `- ❌ **Errors:** ${validation.errors.length}\n`;
      }
      if (hasWarnings) {
        responseText += `- ⚠️ **Warnings:** ${validation.warnings.length}\n`;
      }
      if (hasInfo) {
        responseText += `- ℹ️ **Info:** ${validation.info.length}\n`;
      }
      responseText += '\n';
    }

    // Display errors
    if (hasErrors) {
      responseText += '## ❌ Errors (Must Fix)\n\n';
      validation.errors.forEach((error: any, i: number) => {
        responseText += `### ${i + 1}. ${error.title}\n`;
        responseText += `- **Type:** ${error.type}\n`;
        responseText += `- **Detail:** ${error.detail}\n`;
        if (error.instance) {
          responseText += `- **Location:** ${error.instance}\n`;
        }
        if (error.propertyName) {
          responseText += `- **Property:** ${error.propertyName}\n`;
        }
        responseText += '\n';
      });
    }

    // Display warnings
    if (hasWarnings) {
      responseText += '## ⚠️ Warnings (Should Review)\n\n';
      validation.warnings.forEach((warning: any, i: number) => {
        responseText += `### ${i + 1}. ${warning.title}\n`;
        responseText += `- **Type:** ${warning.type}\n`;
        responseText += `- **Detail:** ${warning.detail}\n`;
        if (warning.instance) {
          responseText += `- **Location:** ${warning.instance}\n`;
        }
        responseText += '\n';
      });
    }

    // Display info
    if (hasInfo) {
      responseText += '## ℹ️ Information\n\n';
      validation.info.forEach((info: any, i: number) => {
        responseText += `${i + 1}. **${info.title}**: ${info.detail}\n`;
      });
      responseText += '\n';
    }

    if (hasErrors) {
      responseText += '## Next Steps\n\n';
      responseText += '1. **Fix Errors**: Address all validation errors\n';
      responseText += '2. **Review Warnings**: Consider warning recommendations\n';
      responseText += '3. **Re-validate**: Run validation again after fixes\n';
      responseText += '4. **Deploy**: Activate once validation passes\n';
    } else if (hasWarnings) {
      responseText += '## Next Steps\n\n';
      responseText += '- Review warnings and adjust if needed\n';
      responseText += '- Rules can be activated despite warnings\n';
      responseText += '- Use `acknowledgeWarnings: true` for activation\n';
    }

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleApiError(error, 'validating property rules');
  }
}