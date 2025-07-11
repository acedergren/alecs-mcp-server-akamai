/**
 * Property Domain Tools
 * 
 * Complete implementation of Akamai Property Manager API tools
 * Using the standard BaseTool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import { type MCPToolResponse, BaseTool } from '../common';
import { 
  PropertyEndpoints, 
  PropertyToolSchemas,
  formatPropertyList,
  formatPropertyDetails,
  formatActivationStatus
} from './property-api-implementation';
import type { z } from 'zod';

/**
 * List all properties
 */
export async function listProperties(args: z.infer<typeof PropertyToolSchemas.list>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) queryParams.contractId = args.contractId;
      if (args.groupId) queryParams.groupId = args.groupId;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.listProperties(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: formatPropertyList,
      cacheKey: (p) => `property:list:${p.contractId || 'all'}:${p.groupId || 'all'}:${p.offset || 0}`,
      cacheTtl: 300, // 5 minutes
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.property
      }
    }
  );
}

/**
 * Get property details
 */
export async function getProperty(args: z.infer<typeof PropertyToolSchemas.get>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_get',
    args,
    async (client) => {
      const queryParams: any = {};
      
      // Extract contract from property ID pattern
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      queryParams.contractId = contractId;
      
      const path = args.version 
        ? PropertyEndpoints.getPropertyVersion(args.propertyId, args.version)
        : PropertyEndpoints.getProperty(args.propertyId);
      
      return client.request({
        method: 'GET',
        path,
        queryParams
      });
    },
    {
      format: 'text',
      formatter: formatPropertyDetails,
      cacheKey: (p) => `property:${p.propertyId}:${p.version || 'latest'}`,
      cacheTtl: 300,
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.property
      }
    }
  );
}

/**
 * Create a new property
 */
export async function createProperty(args: z.infer<typeof PropertyToolSchemas.create>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_create',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: PropertyEndpoints.createProperty(),
        body: {
          propertyName: args.propertyName,
          productId: args.productId,
          ruleFormat: args.ruleFormat || 'latest'
        },
        queryParams: {
          contractId: args.contractId,
          groupId: args.groupId
        }
      });
      
      // Extract property ID from response
      const propertyId = (response as any).propertyLink?.split('/').pop() || (response as any).propertyId;
      
      // Also create CP code if requested
      if (args.createCpCode !== false) {
        try {
          await client.request({
            method: 'POST',
            path: '/papi/v1/cpcodes',
            body: {
              cpCodeName: args.propertyName,
              productId: args.productId
            },
            queryParams: {
              contractId: args.contractId,
              groupId: args.groupId
            }
          });
        } catch (error) {
          // CP code creation is optional, continue if it fails
        }
      }
      
      return { propertyId, propertyName: args.propertyName };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `✅ **Property Created Successfully!**\n\n`;
        text += `**Property Name:** ${data.propertyName}\n`;
        text += `**Property ID:** ${data.propertyId}\n`;
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
 * Update property rules
 */
export async function updatePropertyRules(args: z.infer<typeof PropertyToolSchemas.updateRules>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_rules_update',
    args,
    async (client) => {
      // Extract contract from property ID
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      // Get property details for group ID
      const propResponse = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const property = (propResponse as any).properties?.items?.[0];
      if (!property) {
        throw new Error(`Property ${args.propertyId} not found`);
      }
      
      // Validate rules if requested
      if (args.validateRules) {
        await client.request({
          method: 'PUT',
          path: PropertyEndpoints.updatePropertyRules(args.propertyId, args.version),
          body: { rules: args.rules },
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId,
            validateRules: 'true',
            dryRun: 'true'
          }
        });
      }
      
      // Update rules
      return client.request({
        method: 'PUT',
        path: PropertyEndpoints.updatePropertyRules(args.propertyId, args.version),
        body: { rules: args.rules },
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId,
          validateRules: args.validateRules ? 'true' : 'false'
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        let text = `📝 **Property Rules Updated**\n\n`;
        
        if ((response as any).errors?.length > 0) {
          text += `❌ **Errors:** ${(response as any).errors.length}\n`;
          (response as any).errors.forEach((error: any) => {
            text += `• ${error.title}: ${error.detail}\n`;
          });
        }
        
        if ((response as any).warnings?.length > 0) {
          text += `\n⚠️ **Warnings:** ${(response as any).warnings.length}\n`;
          (response as any).warnings.slice(0, 5).forEach((warning: any) => {
            text += `• ${warning.title}: ${warning.detail}\n`;
          });
          
          if ((response as any).warnings.length > 5) {
            text += `_... and ${(response as any).warnings.length - 5} more warnings_\n`;
          }
        }
        
        if (!(response as any).errors?.length) {
          text += `✅ Rules updated successfully!\n`;
          text += `\n🎯 **Next Step:** Activate this version to staging or production.`;
        }
        
        return text;
      }
    }
  );
}

/**
 * Activate property
 */
export async function activateProperty(args: z.infer<typeof PropertyToolSchemas.activate>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_activate',
    args,
    async (client) => {
      // Get property details first
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      const propertyDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const property = (propertyDetails as any).properties?.items?.[0];
      if (!property) {
        throw new Error(`Property ${args.propertyId} not found`);
      }
      
      // Submit activation
      const activationResponse = await client.request({
        method: 'POST',
        path: PropertyEndpoints.activateProperty(args.propertyId),
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
        }
      });
      
      const activationId = (activationResponse as any).activationLink?.split('/').pop();
      
      // Poll for completion (with progress tracking)
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      let status = 'pending';
      
      while (attempts < maxAttempts && ['pending', 'processing'].includes(status)) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
        
        const statusResponse = await client.request({
          method: 'GET',
          path: PropertyEndpoints.getActivation(args.propertyId, activationId),
          queryParams: {
            contractId: property.contractId,
            groupId: property.groupId
          }
        });
        
        status = (statusResponse as any).status;
        attempts++;
      }
      
      return {
        activationId,
        status,
        property: property.propertyName,
        version: args.version,
        network: args.network
      };
    },
    {
      format: 'text',
      formatter: formatActivationStatus,
      progress: true,
      progressMessage: `Activating property to ${args.network}...`
    }
  );
}

/**
 * Get property rules
 */
export async function getPropertyRules(args: z.infer<typeof PropertyToolSchemas.getRules>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_rules_get',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.getPropertyRules(args.propertyId, args.version),
        queryParams: { contractId }
      });
    },
    {
      format: args.format || 'json',
      cacheKey: (p) => `property:rules:${p.propertyId}:${p.version}`,
      cacheTtl: 300
    }
  );
}

/**
 * Clone a property
 */
export async function cloneProperty(args: z.infer<typeof PropertyToolSchemas.clone>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    'property',
    'property_clone',
    args,
    async (client) => {
      // Get source property details
      const sourceContractId = args.sourcePropertyId.replace('prp_', 'ctr_');
      
      const sourceDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.sourcePropertyId),
        queryParams: { contractId: sourceContractId }
      });
      
      const sourceProperty = (sourceDetails as any).properties?.items?.[0];
      if (!sourceProperty) {
        throw new Error(`Source property ${args.sourcePropertyId} not found`);
      }
      
      // Use source property's contract/group if not specified
      const targetContractId = args.contractId || sourceProperty.contractId;
      const targetGroupId = args.groupId || sourceProperty.groupId;
      const targetProductId = args.productId || sourceProperty.productId;
      
      // Create new property
      const createResponse = await client.request({
        method: 'POST',
        path: PropertyEndpoints.createProperty(),
        body: {
          propertyName: args.propertyName,
          productId: targetProductId,
          cloneFrom: {
            propertyId: args.sourcePropertyId,
            version: args.version || sourceProperty.latestVersion
          }
        },
        queryParams: {
          contractId: targetContractId,
          groupId: targetGroupId
        }
      });
      
      const newPropertyId = (createResponse as any).propertyLink?.split('/').pop();
      
      return {
        propertyId: newPropertyId,
        propertyName: args.propertyName,
        clonedFrom: args.sourcePropertyId
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `✅ **Property Cloned Successfully!**\n\n`;
        text += `**New Property Name:** ${data.propertyName}\n`;
        text += `**New Property ID:** ${data.propertyId}\n`;
        text += `**Cloned From:** ${data.clonedFrom}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Review property rules: \`property_rules_get\`\n`;
        text += `2. Update hostnames as needed\n`;
        text += `3. Activate to staging: \`property_activate\`\n`;
        
        return text;
      }
    }
  );
}