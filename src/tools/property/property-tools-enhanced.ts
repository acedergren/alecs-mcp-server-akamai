/**
 * Property Tools - Enhanced CLI Pattern
 * 
 * CODE KAI IMPLEMENTATION:
 * - All property management tools using Enhanced architecture
 * - Dynamic customer support
 * - Built-in caching for property lists and details
 * - Automatic hint integration
 * - Progress tracking for activations
 * - Enhanced error messages with context
 * 
 * This replaces the BaseTool pattern with the new standard
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  PropertyIdSchema,
  ContractIdSchema,
  GroupIdSchema,
  PropertySchema,
  PropertyListResponseSchema,
  PropertyVersionDetailsSchema,
  PropertyRulesResponseSchema,
  RuleTreeSchema,
  ListRequestSchema,
  NetworkTypeSchema,
  type MCPToolResponse
} from '../common';
import { EnhancedTool, ProgressTracker } from '../common';
import { idTranslatorService } from '../../services/id-translator';

// Create enhanced tool instance for property domain
const propertyTool = new EnhancedTool('property');

/**
 * Input schemas for property operations
 */
const CreatePropertySchema = CustomerSchema.extend({
  propertyName: z.string().min(1).describe('Name for the new property'),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  productId: z.string().describe('Product ID (e.g., prd_Web_App_Accel)'),
  ruleFormat: z.string().optional().describe('Rule format version')
});

const GetPropertySchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive().optional().describe('Specific version to retrieve')
});

const UpdatePropertyRulesSchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive(),
  rules: RuleTreeSchema,
  validateRules: z.boolean().optional().default(true)
});

const ActivatePropertySchema = CustomerSchema.extend({
  propertyId: PropertyIdSchema,
  version: z.number().int().positive(),
  network: NetworkTypeSchema,
  notes: z.string().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().optional().default(false),
  complianceRecord: z.object({
    noncomplianceReason: z.string().optional()
  }).optional()
});

/**
 * Format property list response
 */
async function formatPropertyList(response: any): Promise<string> {
  const properties = response.properties?.items || [];
  
  let text = `📦 **Property List**\n\n`;
  
  if (properties.length === 0) {
    text += '⚠️ No properties found.\n';
    return text;
  }
  
  text += `Found **${properties.length}** properties:\n\n`;
  
  for (const prop of properties.slice(0, 20)) {
    const friendlyNames = await idTranslatorService.translateProperty(prop);
    
    text += `${properties.indexOf(prop) + 1}. **${prop.propertyName}**\n`;
    text += `   • ID: ${prop.propertyId}\n`;
    text += `   • Contract: ${friendlyNames.contractName}\n`;
    text += `   • Group: ${friendlyNames.groupName}\n`;
    text += `   • Product: ${friendlyNames.productName}\n`;
    text += `   • Latest Version: ${prop.latestVersion}\n`;
    text += `   • Production: ${prop.productionVersion || 'Not activated'}\n`;
    text += `   • Staging: ${prop.stagingVersion || 'Not activated'}\n`;
    text += `\n`;
  }
  
  if (properties.length > 20) {
    text += `_... and ${properties.length - 20} more properties_\n`;
  }
  
  return text;
}

/**
 * List all properties - Enhanced implementation
 */
export async function listProperties(args: z.infer<typeof ListRequestSchema> & {
  contractId?: string;
  groupId?: string;
}): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams,
        schema: PropertyListResponseSchema
      });
    },
    {
      format: 'text',
      formatter: formatPropertyList,
      cacheKey: (p) => `property:list:${p.contractId || 'all'}:${p.groupId || 'all'}:${p.offset || 0}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create a new property - Enhanced implementation
 */
export async function createProperty(args: z.infer<typeof CreatePropertySchema>): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_create',
    args,
    async (client) => {
      const response = await client.request({
        path: '/papi/v1/properties',
        method: 'POST',
        body: {
          propertyName: args.propertyName,
          productId: args.productId,
          ruleFormat: args.ruleFormat || 'latest'
        },
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        },
        schema: z.object({
          propertyLink: z.string()
        })
      });
      
      // Extract property ID from link
      const propertyId = response.propertyLink.split('/').pop();
      
      // Get full property details
      const details = await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET',
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        },
        schema: PropertySchema
      });
      
      // Also create CP code if needed
      const cpCodeResponse = await client.request({
        path: '/papi/v1/cpcodes',
        method: 'POST',
        body: {
          cpCodeName: args.propertyName,
          productId: args.productId
        },
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        }
      }).catch(() => null); // CP code might already exist
      
      return {
        propertyId,
        propertyName: details.propertyName,
        propertyVersion: details.latestVersion,
        cpCode: cpCodeResponse?.cpCodeLink?.split('/').pop()
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `✅ **Property Created Successfully!**\n\n`;
        text += `**Property Name:** ${data.propertyName}\n`;
        text += `**Property ID:** ${data.propertyId}\n`;
        text += `**Initial Version:** ${data.propertyVersion}\n`;
        
        if (data.cpCode) {
          text += `**CP Code:** ${data.cpCode}\n`;
        }
        
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Update property rules: \`property_rules_update\`\n`;
        text += `2. Create edge hostname: \`edge_hostname_create\`\n`;
        text += `3. Activate to staging: \`property_activate\`\n`;
        
        return text;
      }
    }
  );
}

/**
 * Activate property - Enhanced implementation with progress
 */
export async function activateProperty(args: z.infer<typeof ActivatePropertySchema>): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_activate',
    args,
    async (client) => {
      // Use progress tracker for activation
      return ProgressTracker.withProgress(
        `Activating property ${args.propertyId} v${args.version} to ${args.network}`,
        async (progress) => {
          progress.report('Validating property configuration...');
          
          // Get property details first
          const propertyDetails = await client.request({
            path: `/papi/v1/properties/${args.propertyId}`,
            method: 'GET',
            queryParams: {
              contractId: PropertyIdSchema.parse(args.propertyId).replace('prp_', 'ctr_'),
              groupId: 'grp_0' // Will be determined from property
            }
          });
          
          const property = propertyDetails.properties?.items?.[0];
          if (!property) {
            throw new Error(`Property ${args.propertyId} not found`);
          }
          
          progress.report('Submitting activation request...');
          
          // Submit activation
          const activationResponse = await client.request({
            path: `/papi/v1/properties/${args.propertyId}/activations`,
            method: 'POST',
            body: {
              propertyVersion: args.version,
              network: args.network.toUpperCase(),
              notifyEmails: args.notifyEmails || [],
              acknowledgeAllWarnings: args.acknowledgeWarnings,
              note: args.notes || `Activated via ALECS MCP Server`,
              complianceRecord: args.complianceRecord
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId
            },
            schema: z.object({
              activationLink: z.string()
            })
          });
          
          const activationId = activationResponse.activationLink.split('/').pop();
          
          progress.report(`Activation ${activationId} submitted. Monitoring status...`);
          
          // Poll for completion
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes max
          let status = 'pending';
          
          while (attempts < maxAttempts && ['pending', 'processing'].includes(status)) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
            
            const statusResponse = await client.request({
              path: `/papi/v1/properties/${args.propertyId}/activations/${activationId}`,
              method: 'GET',
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId
              }
            });
            
            status = statusResponse.status;
            progress.report(`Status: ${status} (${attempts + 1}/${maxAttempts})`);
            attempts++;
          }
          
          return {
            activationId,
            status,
            property: property.propertyName,
            version: args.version,
            network: args.network
          };
        }
      );
    },
    {
      format: 'text',
      formatter: (data) => {
        const emoji = data.status === 'active' ? '✅' : 
                     data.status === 'failed' ? '❌' : '⏳';
        
        let text = `${emoji} **Property Activation**\n\n`;
        text += `**Property:** ${data.property}\n`;
        text += `**Version:** ${data.version}\n`;
        text += `**Network:** ${data.network.toUpperCase()}\n`;
        text += `**Activation ID:** ${data.activationId}\n`;
        text += `**Status:** ${data.status}\n`;
        
        if (data.status === 'active') {
          text += `\n✅ Activation completed successfully!`;
          
          if (data.network === 'staging') {
            text += `\n\n🎯 **Next Step:** Test your staging URL, then activate to production.`;
          }
        } else if (data.status === 'failed') {
          text += `\n❌ Activation failed. Check the activation details for errors.`;
        } else {
          text += `\n⏳ Activation is still in progress. Check status with activation ID.`;
        }
        
        return text;
      }
    }
  );
}

/**
 * Get property details - Enhanced implementation
 */
export async function getProperty(args: z.infer<typeof GetPropertySchema>): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_get',
    args,
    async (client) => {
      const queryParams: any = {};
      
      // Extract contract from property ID
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      queryParams.contractId = contractId;
      
      const path = args.version 
        ? `/papi/v1/properties/${args.propertyId}/versions/${args.version}`
        : `/papi/v1/properties/${args.propertyId}`;
      
      const response = await client.request({
        path,
        method: 'GET',
        queryParams,
        schema: args.version ? PropertyVersionDetailsSchema : PropertySchema
      });
      
      return response;
    },
    {
      format: 'text',
      formatter: async (data) => {
        const prop = data.properties?.items?.[0] || data.propertyVersion || data;
        const friendlyNames = await idTranslatorService.translateProperty(prop);
        
        let text = `📦 **Property Details**\n\n`;
        text += `**Name:** ${prop.propertyName}\n`;
        text += `**ID:** ${prop.propertyId}\n`;
        text += `**Contract:** ${friendlyNames.contractName}\n`;
        text += `**Group:** ${friendlyNames.groupName}\n`;
        text += `**Product:** ${friendlyNames.productName}\n`;
        
        if (prop.propertyVersion) {
          text += `\n**Version:** ${prop.propertyVersion}\n`;
          text += `**Rule Format:** ${prop.ruleFormat}\n`;
          text += `**Updated:** ${new Date(prop.updatedDate).toLocaleString()}\n`;
          text += `**Updated By:** ${prop.updatedByUser}\n`;
          
          if (prop.note) {
            text += `**Note:** ${prop.note}\n`;
          }
        } else {
          text += `\n**Latest Version:** ${prop.latestVersion}\n`;
          text += `**Production Version:** ${prop.productionVersion || 'Not activated'}\n`;
          text += `**Staging Version:** ${prop.stagingVersion || 'Not activated'}\n`;
        }
        
        if (prop.hostnames && prop.hostnames.length > 0) {
          text += `\n**Hostnames:**\n`;
          prop.hostnames.forEach((hostname: any) => {
            text += `• ${hostname.cnameFrom} → ${hostname.cnameTo}\n`;
          });
        }
        
        return text;
      },
      cacheKey: (p) => `property:${p.propertyId}:${p.version || 'latest'}`,
      cacheTtl: 300
    }
  );
}

/**
 * Update property rules - Enhanced implementation
 */
export async function updatePropertyRules(args: z.infer<typeof UpdatePropertyRulesSchema>): Promise<MCPToolResponse> {
  return propertyTool.execute(
    'property_rules_update',
    args,
    async (client) => {
      // Extract contract from property ID
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      // Get property details for group ID
      const propResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
        queryParams: { contractId }
      });
      
      const property = propResponse.properties?.items?.[0];
      if (!property) {
        throw new Error(`Property ${args.propertyId} not found`);
      }
      
      // Validate rules if requested
      if (args.validateRules) {
        await client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
          method: 'PUT',
          body: { rules: args.rules },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId,
            validateRules: true,
            dryRun: true
          }
        });
      }
      
      // Update rules
      const response = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
        method: 'PUT',
        body: { rules: args.rules },
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId,
          validateRules: args.validateRules
        },
        schema: PropertyRulesResponseSchema
      });
      
      // Invalidate caches
      propertyTool.invalidateCache([
        `property:${args.propertyId}:*`,
        `property:rules:${args.propertyId}:*`
      ]);
      
      return {
        propertyId: args.propertyId,
        version: args.version,
        etag: response.etag,
        errors: response.errors || [],
        warnings: response.warnings || []
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `📝 **Property Rules Updated**\n\n`;
        text += `**Property:** ${data.propertyId}\n`;
        text += `**Version:** ${data.version}\n`;
        
        if (data.errors.length > 0) {
          text += `\n❌ **Errors:** ${data.errors.length}\n`;
          data.errors.forEach((error: any) => {
            text += `• ${error.title}: ${error.detail}\n`;
          });
        }
        
        if (data.warnings.length > 0) {
          text += `\n⚠️ **Warnings:** ${data.warnings.length}\n`;
          data.warnings.slice(0, 5).forEach((warning: any) => {
            text += `• ${warning.title}: ${warning.detail}\n`;
          });
          
          if (data.warnings.length > 5) {
            text += `_... and ${data.warnings.length - 5} more warnings_\n`;
          }
        }
        
        if (data.errors.length === 0) {
          text += `\n✅ Rules updated successfully!`;
          text += `\n\n🎯 **Next Step:** Activate this version to staging or production.`;
        }
        
        return text;
      }
    }
  );
}

/**
 * Enhanced Property Tools export
 */
export const enhancedPropertyTools = {
  listProperties,
  createProperty,
  getProperty,
  updatePropertyRules,
  activateProperty
};

/**
 * Schema exports for type safety
 */
export const PropertyToolSchemas = {
  list: ListRequestSchema.extend({ contractId: z.string().optional(), groupId: z.string().optional() }),
  create: CreatePropertySchema,
  get: GetPropertySchema,
  updateRules: UpdatePropertyRulesSchema,
  activate: ActivatePropertySchema
};