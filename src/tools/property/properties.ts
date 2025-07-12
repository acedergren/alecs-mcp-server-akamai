/**
 * Property Domain - Complete Implementation
 * 
 * Snow Leopard Architecture compliant property operations using unified AkamaiOperation.execute pattern
 * 
 * ARCHITECTURE NOTES:
 * - All functions use AkamaiOperation.execute for consistency
 * - Proper Zod schema validation for all inputs
 * - Type-safe implementations with no 'any' types
 * - Unified error handling and response formatting
 * - Human-readable error messages and next steps
 */

import { z } from 'zod';
import { AkamaiOperation } from '../common/akamai-operation';
import type { MCPToolResponse } from '../../types/mcp-2025';
import { 
  PropertyEndpoints, 
  PropertyToolSchemas,
  formatPropertyList,
  formatPropertyDetails,
  formatActivationStatus
} from './api';

/**
 * List all properties with filtering and pagination
 */
export async function listProperties(args: z.infer<typeof PropertyToolSchemas.list>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_list',
    args,
    async (client) => {
      const queryParams: Record<string, string | number> = {};
      
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
        mappings: [
          { path: 'contractId', type: 'contract' },
          { path: 'groupId', type: 'group' },
          { path: '*.contractId', type: 'contract' },
          { path: '*.groupId', type: 'group' },
          { path: 'properties.*.contractId', type: 'contract' },
          { path: 'properties.*.groupId', type: 'group' }
        ]
      }
    }
  );
}

/**
 * Get detailed information about a specific property
 */
export async function getProperty(args: z.infer<typeof PropertyToolSchemas.get>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_get',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      const queryParams = { contractId };
      
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
        mappings: [
          { path: 'propertyId', type: 'property' },
          { path: 'contractId', type: 'contract' },
          { path: 'groupId', type: 'group' }
        ]
      }
    }
  );
}

/**
 * Create a new property with optional CP code creation
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
      
      // Type-safe property ID extraction
      const propertyLink = (response as { propertyLink?: string }).propertyLink;
      const propertyId = propertyLink?.split('/').pop() || 
                       (response as { propertyId?: string }).propertyId;
      
      if (!propertyId) {
        throw new Error('Failed to extract property ID from response');
      }
      
      // Create CP code if requested (optional operation)
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
          console.warn('CP code creation failed:', error);
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
 * Update property rules with validation
 */
export async function updatePropertyRules(args: z.infer<typeof PropertyToolSchemas.updateRules>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_rules_update',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      // Get property details for group ID
      const propResponse = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const propertyData = (propResponse as { properties?: { items?: unknown[] } }).properties?.items?.[0];
      if (!propertyData) {
        throw new Error(`Property ${args.propertyId} not found`);
      }
      
      const property = propertyData as { contractId: string; groupId: string };
      
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
        const errorResponse = response as { errors?: Array<{ title: string; detail: string }> };
        const warningResponse = response as { warnings?: Array<{ title: string; detail: string }> };
        
        let text = `📝 **Property Rules Updated**\n\n`;
        
        if (errorResponse.errors?.length) {
          text += `❌ **Errors:** ${errorResponse.errors.length}\n`;
          errorResponse.errors.forEach((error) => {
            text += `• ${error.title}: ${error.detail}\n`;
          });
        }
        
        if (warningResponse.warnings?.length) {
          text += `\n⚠️ **Warnings:** ${warningResponse.warnings.length}\n`;
          warningResponse.warnings.slice(0, 5).forEach((warning) => {
            text += `• ${warning.title}: ${warning.detail}\n`;
          });
          
          if (warningResponse.warnings.length > 5) {
            text += `_... and ${warningResponse.warnings.length - 5} more warnings_\n`;
          }
        }
        
        if (!errorResponse.errors?.length) {
          text += `✅ Rules updated successfully!\n`;
          text += `\n🎯 **Next Step:** Activate this version to staging or production.`;
        }
        
        return text;
      }
    }
  );
}

/**
 * Activate property to staging or production with progress tracking
 */
export async function activateProperty(args: z.infer<typeof PropertyToolSchemas.activate>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_activate',
    args,
    async (client, progress) => {
      await progress?.report({ progress: 10, total: 100, message: 'Getting property details' });
      
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      const propertyDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const propertyData = (propertyDetails as { properties?: { items?: unknown[] } }).properties?.items?.[0];
      if (!propertyData) {
        throw new Error(`Property ${args.propertyId} not found`);
      }
      
      const property = propertyData as { contractId: string; groupId: string; propertyName: string };
      
      await progress?.report({ progress: 25, total: 100, message: 'Submitting activation request' });
      
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
      
      const activationLink = (activationResponse as { activationLink?: string }).activationLink;
      const activationId = activationLink?.split('/').pop();
      
      if (!activationId) {
        throw new Error('Failed to get activation ID from response');
      }
      
      await progress?.report({ progress: 50, total: 100, message: 'Waiting for activation completion' });
      
      // Poll for completion with progress tracking
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
        
        status = (statusResponse as { status: string }).status;
        attempts++;
        
        const progressPercent = Math.min(50 + (attempts / maxAttempts) * 50, 100);
        await progress?.report({ 
          progress: progressPercent, 
          total: 100, 
          message: `Activation ${status} (${attempts}/${maxAttempts})` 
        });
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
      enableProgress: true,
      progressSteps: ['Preparing', 'Submitting', 'Processing', 'Complete']
    }
  );
}

/**
 * Get property rules for a specific version
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
 * Clone an existing property to create a new one
 */
export async function cloneProperty(args: z.infer<typeof PropertyToolSchemas.clone>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_clone',
    args,
    async (client) => {
      const sourceContractId = args.sourcePropertyId.replace('prp_', 'ctr_');
      
      const sourceDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.sourcePropertyId),
        queryParams: { contractId: sourceContractId }
      });
      
      const sourcePropertyData = (sourceDetails as { properties?: { items?: unknown[] } }).properties?.items?.[0];
      if (!sourcePropertyData) {
        throw new Error(`Source property ${args.sourcePropertyId} not found`);
      }
      
      const sourceProperty = sourcePropertyData as { 
        contractId: string; 
        groupId: string; 
        productId: string; 
        latestVersion: number 
      };
      
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
      
      const propertyLink = (createResponse as { propertyLink?: string }).propertyLink;
      const newPropertyId = propertyLink?.split('/').pop();
      
      if (!newPropertyId) {
        throw new Error('Failed to extract new property ID from response');
      }
      
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

/**
 * Remove (delete) a property
 */
export async function removeProperty(args: z.infer<typeof PropertyToolSchemas.remove>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_remove',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      return client.request({
        method: 'DELETE',
        path: PropertyEndpoints.deleteProperty(args.propertyId),
        queryParams: { contractId }
      });
    },
    {
      format: 'text',
      formatter: () => {
        let text = `✅ **Property Removed Successfully!**\n\n`;
        text += `**Property ID:** ${args.propertyId}\n`;
        text += `\n⚠️ **Note:** This action cannot be undone.\n`;
        return text;
      }
    }
  );
}

/**
 * List all versions of a property
 */
export async function listPropertyVersions(args: z.infer<typeof PropertyToolSchemas.listVersions>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_versions_list',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.getPropertyVersions(args.propertyId),
        queryParams: { contractId }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const versions = (response as { versions?: { items?: Array<{
          propertyVersion: number;
          updatedByUser: string;
          updatedDate: string;
          productionStatus: string;
          stagingStatus: string;
          note?: string;
        }> } }).versions?.items || [];
        
        let text = `📋 **Property Versions**\n\n`;
        text += `Found **${versions.length}** versions:\n\n`;
        
        versions.slice(0, 10).forEach((version) => {
          text += `**Version ${version.propertyVersion}**\n`;
          text += `• Updated: ${new Date(version.updatedDate).toLocaleString()}\n`;
          text += `• By: ${version.updatedByUser}\n`;
          text += `• Production: ${version.productionStatus}\n`;
          text += `• Staging: ${version.stagingStatus}\n`;
          if (version.note) text += `• Note: ${version.note}\n`;
          text += `\n`;
        });
        
        if (versions.length > 10) {
          text += `_... and ${versions.length - 10} more versions_\n`;
        }
        
        return text;
      },
      cacheKey: (p) => `property:versions:${p.propertyId}`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new version of a property
 */
export async function createPropertyVersion(args: z.infer<typeof PropertyToolSchemas.createVersion>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_version_create',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      const propertyDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const property = (propertyDetails as { properties?: { items?: unknown[] } }).properties?.items?.[0] as { 
        contractId: string; 
        groupId: string 
      };
      
      return client.request({
        method: 'POST',
        path: PropertyEndpoints.createPropertyVersion(args.propertyId),
        body: {
          createFromVersion: 'latest',
          note: args.notes || 'Created via ALECS MCP Server'
        },
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const versionLink = (response as { versionLink?: string }).versionLink;
        const version = versionLink?.split('/').pop() || 'unknown';
        
        let text = `✅ **Property Version Created Successfully!**\n\n`;
        text += `**Property ID:** ${args.propertyId}\n`;
        text += `**New Version:** ${version}\n`;
        text += `\n🎯 **Next Steps:**\n`;
        text += `1. Update rules: \`property_rules_update\`\n`;
        text += `2. Test changes on staging\n`;
        text += `3. Activate to production\n`;
        return text;
      }
    }
  );
}

/**
 * Get activation status for a specific activation
 */
export async function getActivationStatus(args: z.infer<typeof PropertyToolSchemas.getActivationStatus>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_activation_status',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      const propertyDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const property = (propertyDetails as { properties?: { items?: unknown[] } }).properties?.items?.[0] as { 
        contractId: string; 
        groupId: string;
        propertyName: string;
      };
      
      const statusResponse = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getActivation(args.propertyId, args.activationId),
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId
        }
      });
      
      const activation = statusResponse as {
        status: string;
        network: string;
        propertyVersion: number;
        submittedBy: string;
        submitDate: string;
        note?: string;
      };
      
      return {
        status: activation.status,
        property: property.propertyName,
        version: activation.propertyVersion,
        network: activation.network,
        activationId: args.activationId,
        submittedBy: activation.submittedBy,
        submitDate: activation.submitDate,
        note: activation.note
      };
    },
    {
      format: 'text',
      formatter: (data) => {
        const response = data as {
          status: string;
          property: string;
          version: number;
          network: string;
          activationId: string;
          submittedBy: string;
          submitDate: string;
          note?: string;
        };
        
        const emoji = response.status === 'ACTIVE' ? '✅' : 
                     response.status === 'FAILED' ? '❌' : '⏳';
        
        let text = `${emoji} **Activation Status**\n\n`;
        text += `**Property:** ${response.property}\n`;
        text += `**Version:** ${response.version}\n`;
        text += `**Network:** ${response.network.toUpperCase()}\n`;
        text += `**Status:** ${response.status}\n`;
        text += `**Activation ID:** ${response.activationId}\n`;
        text += `**Submitted By:** ${response.submittedBy}\n`;
        text += `**Submit Date:** ${new Date(response.submitDate).toLocaleString()}\n`;
        
        if (response.note) {
          text += `**Note:** ${response.note}\n`;
        }
        
        return text;
      },
      cacheKey: (p) => `property:activation:${p.propertyId}:${p.activationId}`,
      cacheTtl: 60 // 1 minute for status updates
    }
  );
}

/**
 * List all activations for a property
 */
export async function listPropertyActivations(args: z.infer<typeof PropertyToolSchemas.listActivations>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'property_activations_list',
    args,
    async (client) => {
      const contractId = args.propertyId.replace('prp_', 'ctr_');
      
      const propertyDetails = await client.request({
        method: 'GET',
        path: PropertyEndpoints.getProperty(args.propertyId),
        queryParams: { contractId }
      });
      
      const property = (propertyDetails as { properties?: { items?: unknown[] } }).properties?.items?.[0] as { 
        contractId: string; 
        groupId: string 
      };
      
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.activateProperty(args.propertyId),
        queryParams: {
          contractId: property.contractId,
          groupId: property.groupId
        }
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const activations = (response as { activations?: { items?: Array<{
          activationId: string;
          propertyVersion: number;
          network: string;
          status: string;
          submitDate: string;
          submittedBy: string;
          note?: string;
        }> } }).activations?.items || [];
        
        let text = `🚀 **Property Activations**\n\n`;
        text += `Found **${activations.length}** activations:\n\n`;
        
        activations.slice(0, 10).forEach((activation) => {
          const emoji = activation.status === 'ACTIVE' ? '✅' : 
                       activation.status === 'FAILED' ? '❌' : '⏳';
          
          text += `${emoji} **${activation.activationId}**\n`;
          text += `• Version: ${activation.propertyVersion}\n`;
          text += `• Network: ${activation.network}\n`;
          text += `• Status: ${activation.status}\n`;
          text += `• Submitted: ${new Date(activation.submitDate).toLocaleString()}\n`;
          text += `• By: ${activation.submittedBy}\n`;
          if (activation.note) text += `• Note: ${activation.note}\n`;
          text += `\n`;
        });
        
        if (activations.length > 10) {
          text += `_... and ${activations.length - 10} more activations_\n`;
        }
        
        return text;
      },
      cacheKey: (p) => `property:activations:${p.propertyId}`,
      cacheTtl: 300
    }
  );
}

/**
 * List contracts available to the user
 */
export async function listContracts(args: z.infer<typeof PropertyToolSchemas.listContracts>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'contracts_list',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.listContracts()
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const contracts = (response as { contracts?: { items?: Array<{
          contractId: string;
          contractTypeName: string;
          status: string;
        }> } }).contracts?.items || [];
        
        let text = `📜 **Contracts List**\n\n`;
        text += `Found **${contracts.length}** contracts:\n\n`;
        
        contracts.forEach((contract, index) => {
          text += `${index + 1}. **${contract.contractId}**\n`;
          text += `   • Type: ${contract.contractTypeName}\n`;
          text += `   • Status: ${contract.status}\n\n`;
        });
        
        return text;
      },
      cacheKey: () => `contracts:list`,
      cacheTtl: 3600 // 1 hour
    }
  );
}

/**
 * List groups for contracts
 */
export async function listGroups(args: z.infer<typeof PropertyToolSchemas.listGroups>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'property',
    'groups_list',
    args,
    async (client) => {
      const queryParams: Record<string, string> = {};
      if (args.contractId) queryParams.contractId = args.contractId;
      
      return client.request({
        method: 'GET',
        path: PropertyEndpoints.listGroups(args.contractId),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const groups = (response as { groups?: { items?: Array<{
          groupId: string;
          groupName: string;
          contractIds?: string[];
        }> } }).groups?.items || [];
        
        let text = `👥 **Groups List**\n\n`;
        text += `Found **${groups.length}** groups:\n\n`;
        
        groups.forEach((group, index) => {
          text += `${index + 1}. **${group.groupName}** (${group.groupId})\n`;
          if (group.contractIds) {
            text += `   • Contracts: ${group.contractIds.join(', ')}\n`;
          }
          text += `\n`;
        });
        
        return text;
      },
      cacheKey: (p) => `groups:list:${p.contractId || 'all'}`,
      cacheTtl: 3600
    }
  );
}

/**
 * Property operations registry for unified registry auto-discovery
 * 
 * SNOW LEOPARD ARCHITECTURE: All operations follow standard pattern
 * - name: Tool identifier matching function name
 * - description: Human-readable description 
 * - inputSchema: Zod validation schema
 * - handler: Implementation function
 */
export const propertyOperations = {
  property_list: {
    name: 'property_list',
    description: 'List all properties with filtering and pagination support',
    inputSchema: PropertyToolSchemas.list,
    handler: listProperties
  },
  
  property_get: {
    name: 'property_get',
    description: 'Get detailed information about a specific property',
    inputSchema: PropertyToolSchemas.get,
    handler: getProperty
  },
  
  property_create: {
    name: 'property_create',
    description: 'Create a new property with optional CP code creation',
    inputSchema: PropertyToolSchemas.create,
    handler: createProperty
  },
  
  property_rules_update: {
    name: 'property_rules_update',
    description: 'Update property rules with validation',
    inputSchema: PropertyToolSchemas.updateRules,
    handler: updatePropertyRules
  },
  
  property_activate: {
    name: 'property_activate',
    description: 'Activate property to staging or production with progress tracking',
    inputSchema: PropertyToolSchemas.activate,
    handler: activateProperty
  },
  
  property_rules_get: {
    name: 'property_rules_get',
    description: 'Get property rules for a specific version',
    inputSchema: PropertyToolSchemas.getRules,
    handler: getPropertyRules
  },
  
  property_clone: {
    name: 'property_clone',
    description: 'Clone an existing property to create a new one',
    inputSchema: PropertyToolSchemas.clone,
    handler: cloneProperty
  },

  property_remove: {
    name: 'property_remove',
    description: 'Remove (delete) a property permanently',
    inputSchema: PropertyToolSchemas.remove,
    handler: removeProperty
  },

  property_versions_list: {
    name: 'property_versions_list',
    description: 'List all versions of a property with status information',
    inputSchema: PropertyToolSchemas.listVersions,
    handler: listPropertyVersions
  },

  property_version_create: {
    name: 'property_version_create',
    description: 'Create a new version of a property',
    inputSchema: PropertyToolSchemas.createVersion,
    handler: createPropertyVersion
  },

  property_activation_status: {
    name: 'property_activation_status',
    description: 'Get activation status for a specific activation',
    inputSchema: PropertyToolSchemas.getActivationStatus,
    handler: getActivationStatus
  },

  property_activations_list: {
    name: 'property_activations_list',
    description: 'List all activations for a property',
    inputSchema: PropertyToolSchemas.listActivations,
    handler: listPropertyActivations
  },

  contracts_list: {
    name: 'contracts_list',
    description: 'List all contracts available to the user',
    inputSchema: PropertyToolSchemas.listContracts,
    handler: listContracts
  },

  groups_list: {
    name: 'groups_list',
    description: 'List all groups for contracts',
    inputSchema: PropertyToolSchemas.listGroups,
    handler: listGroups
  }
};