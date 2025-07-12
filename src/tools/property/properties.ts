/**
 * Property Domain Tools
 * 
 * Complete implementation of Akamai Property Manager API tools
 * Using the standard Tool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { TIMEOUTS } from '../../constants';
import { 
  PropertyEndpoints, 
  PropertyToolSchemas,
  formatPropertyList,
  formatPropertyDetails,
  formatActivationStatus
} from './api';
import type { z } from 'zod';

/**
 * List all properties
 */
export async function listProperties(args: z.infer<typeof PropertyToolSchemas.list>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.contractId) {queryParams.contractId = args.contractId;}
      if (args.groupId) {queryParams.groupId = args.groupId;}
      if (args.limit) {queryParams.limit = args.limit;}
      if (args.offset) {queryParams.offset = args.offset;}
      
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
        mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
      }
    }
  );
}

/**
 * Get property details
 */
export async function getProperty(args: z.infer<typeof PropertyToolSchemas.get>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
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
        mappings: AkamaiOperation.COMMON_TRANSLATIONS['property']
      }
    }
  );
}

/**
 * Create a new property
 */
export async function createProperty(args: z.infer<typeof PropertyToolSchemas.create>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
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
  return AkamaiOperation.execute(
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
  return AkamaiOperation.execute(
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
        await new Promise(resolve => setTimeout(resolve, TIMEOUTS.DNS_OPERATION_DELAY)); // 5 second intervals
        
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
  return AkamaiOperation.execute(
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
  return AkamaiOperation.execute(
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

// Additional property operations needed for agent compatibility

/**
 * Create a new property version
 */
export async function createPropertyVersion(args: {
  customer?: string;
  propertyId: string;
  baseVersion?: number;
  note?: string;
}): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_version_create',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: `/papi/v1/properties/${args.propertyId}/versions`,
        body: {
          createFromVersion: args.baseVersion || 1,
          note: args.note || 'Created via MCP tool'
        }
      });
      return {
        propertyVersion: response.versionLink?.split('/').pop(),
        message: 'Property version created successfully'
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `✅ **Property Version Created**\n\n`;
        text += `**Property ID**: ${args.propertyId}\n`;
        text += `**New Version**: ${data.propertyVersion}\n`;
        text += `**Base Version**: ${args.baseVersion || 1}\n`;
        if (args.note) text += `**Note**: ${args.note}\n`;
        return text;
      }
    }
  );
}

/**
 * Get property activation status
 */
export async function getActivationStatus(args: {
  customer?: string;
  propertyId: string;
  activationId: string;
}): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_activation_status',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/activations/${args.activationId}`
      });
      return response;
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `📊 **Activation Status**\n\n`;
        text += `**Property ID**: ${args.propertyId}\n`;
        text += `**Activation ID**: ${args.activationId}\n`;
        text += `**Status**: ${data.status || 'Unknown'}\n`;
        if (data.network) text += `**Network**: ${data.network}\n`;
        return text;
      }
    }
  );
}

/**
 * List property activations
 */
export async function listPropertyActivations(args: {
  customer?: string;
  propertyId: string;
}): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_activations_list',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/activations`
      });
      return response.activations?.items || [];
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `📋 **Property Activations**\n\n`;
        text += `**Property ID**: ${args.propertyId}\n`;
        text += `**Total Activations**: ${data.length}\n\n`;
        
        data.forEach((activation: any, index: number) => {
          text += `${index + 1}. **${activation.network}** - ${activation.status}\n`;
          text += `   Version: ${activation.propertyVersion}\n`;
          if (activation.submitDate) text += `   Submitted: ${activation.submitDate}\n`;
          text += `\n`;
        });
        return text;
      }
    }
  );
}

/**
 * Remove hostname from property  
 */
export async function removePropertyHostname(args: {
  customer?: string;
  propertyId: string;
  version: number;
  hostname: string;
}): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_hostname_remove',
    args,
    async (client) => {
      // Get current hostnames
      const hostnamesResponse = await client.request({
        method: 'GET',
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`
      });
      
      const currentHostnames = hostnamesResponse.hostnames?.items || [];
      const filteredHostnames = currentHostnames.filter((h: any) => 
        h.cnameFrom !== args.hostname
      );
      
      // Update hostnames
      const response = await client.request({
        method: 'PUT',
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/hostnames`,
        body: filteredHostnames
      });
      
      return {
        removed: args.hostname,
        remaining: filteredHostnames.length
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `🗑️ **Hostname Removed**\n\n`;
        text += `**Property ID**: ${args.propertyId}\n`;
        text += `**Version**: ${args.version}\n`;
        text += `**Removed Hostname**: ${data.removed}\n`;
        text += `**Remaining Hostnames**: ${data.remaining}\n`;
        return text;
      }
    }
  );
}

/**
 * List all groups for property creation
 */
export async function listGroups(args: { customer?: string; contractId?: string }): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_groups_list',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: '/papi/v1/groups',
        queryParams: args.contractId ? { contractId: args.contractId } : undefined
      });
      return response.groups?.items || [];
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = `📋 **Property Groups**\n\n`;
        data.forEach((group: any) => {
          text += `- **${group.groupName}** (${group.groupId})\n`;
          text += `  Contract: ${group.contractIds?.[0]}\n\n`;
        });
        return text;
      }
    }
  );
}

/**
 * Add hostname to property (placeholder - needs implementation)
 */
export async function addPropertyHostname(args: {
  customer?: string;
  propertyId: string;
  hostname: string;
  edgeHostname: string;
  version?: number;
}): Promise<MCPToolResponse> {
  // TODO: Implement property hostname addition
  return {
    content: [{
      type: 'text',
      text: `TODO: Add hostname ${args.hostname} to property ${args.propertyId} (function needs implementation)`
    }]
  };
}

/**
 * Legacy consolidated property tools for backwards compatibility
 * Exported as operations object to match registry import pattern
 */
export const propertyOperations = {
  property_list: { handler: listProperties, description: "List all properties" },
  property_get: { handler: getProperty, description: "Get property details" },
  property_create: { handler: createProperty, description: "Create new property" },
  property_rules_update: { handler: updatePropertyRules, description: "Update property rules" },
  property_activate: { handler: activateProperty, description: "Activate property" },
  property_rules_get: { handler: getPropertyRules, description: "Get property rules" },
  property_clone: { handler: cloneProperty, description: "Clone property" },
  
  // Additional operations for agent compatibility
  property_groups_list: { handler: listGroups, description: "List property groups" },
  property_hostname_add: { handler: addPropertyHostname, description: "Add hostname to property" }
};