/**
 * Property Domain Tools Export
 * 
 * This module exports all property-related tools using the standard BaseTool.execute pattern.
 * Features include dynamic customer support, caching, hints, and progress tracking.
 * 
 * Updated on 2025-01-11
 */

import {
  listProperties,
  getProperty,
  createProperty,
  updatePropertyRules,
  activateProperty,
  getPropertyRules,
  cloneProperty
} from './property-tools';
import { consolidatedPropertyTools } from './consolidated-property-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Property tool definitions for ALECSCore registration
 */
export const propertyTools = {
  // List operations
  'property_list': {
    description: 'List all properties with optional filtering',
    inputSchema: z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional(),
      format: z.enum(['json', 'text']).optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      listProperties(args)
  },

  // Contract and Group operations
  'contract_list': {
    description: 'List all available contracts',
    inputSchema: z.object({
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.listContracts(args)
  },

  'group_list': {
    description: 'List all groups',
    inputSchema: z.object({
      contractId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.listGroups(args)
  },

  'product_list': {
    description: 'List available products',
    inputSchema: z.object({
      contractId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.listProducts(args)
  },

  // Get operations
  'property_get': {
    description: 'Get property details',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getProperty(args)
  },

  'property_rules_get': {
    description: 'Get property rules configuration',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      customer: z.string().optional(),
      validateRules: z.boolean().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getPropertyRules(args)
  },

  // Create operations
  'property_create': {
    description: 'Create a new property',
    inputSchema: z.object({
      propertyName: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string(),
      ruleFormat: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      createProperty(args)
  },

  'property_clone': {
    description: 'Clone an existing property',
    inputSchema: z.object({
      sourcePropertyId: z.string(),
      propertyName: z.string(),
      version: z.number().optional(),
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      productId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      cloneProperty(args)
  },

  'property_version_create': {
    description: 'Create a new property version',
    inputSchema: z.object({
      propertyId: z.string(),
      createFromVersion: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.createPropertyVersion(args)
  },

  // Update operations
  'property_rules_update': {
    description: 'Update property rules',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      rules: z.any(), // RuleTreeSchema
      validateRules: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      updatePropertyRules(args)
  },

  // Activation operations
  'property_activate': {
    description: 'Activate property to staging or production',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      network: z.enum(['staging', 'production']),
      notes: z.string().optional(),
      notifyEmails: z.array(z.string()).optional(),
      acknowledgeWarnings: z.boolean().optional(),
      complianceRecord: z.object({
        noncomplianceReason: z.string().optional()
      }).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      activateProperty(args)
  },

  'property_activation_status': {
    description: 'Get property activation status',
    inputSchema: z.object({
      propertyId: z.string(),
      activationId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getActivationStatus(args)
  },

  // Property deletion
  'property_delete': {
    description: 'Delete a property (requires no active versions)',
    inputSchema: z.object({
      propertyId: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.removeProperty(args)
  },

  // Property search
  'property_search': {
    description: 'Search properties by name, hostname, or status',
    inputSchema: z.object({
      searchTerm: z.string().optional(),
      filters: z.object({
        contractId: z.string().optional(),
        groupId: z.string().optional(),
        productId: z.string().optional(),
        hostname: z.string().optional(),
        hasActiveVersion: z.boolean().optional()
      }).optional(),
      limit: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.searchPropertiesOptimized(args)
  },

  // Hostname management
  'property_hostname_add': {
    description: 'Add hostname to property version',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      hostname: z.string(),
      cnameType: z.enum(['EDGE_HOSTNAME']).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.addPropertyHostname(args)
  },

  'property_hostname_remove': {
    description: 'Remove hostname from property version',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      hostname: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.removePropertyHostname(args)
  },

  // Advanced version management
  'property_version_rollback': {
    description: 'Rollback property to a previous version',
    inputSchema: z.object({
      propertyId: z.string(),
      targetVersion: z.number(),
      notes: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.rollbackPropertyVersion(args)
  },

  'property_version_diff': {
    description: 'Get differences between two property versions',
    inputSchema: z.object({
      propertyId: z.string(),
      fromVersion: z.number(),
      toVersion: z.number(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getVersionDiff(args)
  },

  // Property comparison and analysis
  'property_compare': {
    description: 'Compare configuration between two properties',
    inputSchema: z.object({
      sourcePropertyId: z.string(),
      targetPropertyId: z.string(),
      version: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.compareProperties(args)
  },

  'property_drift_detect': {
    description: 'Detect configuration drift across property versions',
    inputSchema: z.object({
      propertyId: z.string(),
      baselineVersion: z.number().optional(),
      includeInactiveVersions: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.detectConfigurationDrift(args)
  },

  'property_health_check': {
    description: 'Check property health and identify issues',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number().optional(),
      checks: z.array(z.enum([
        'certificate_expiry',
        'rule_warnings',
        'activation_status',
        'hostname_coverage',
        'origin_connectivity'
      ])).optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.checkPropertyHealth(args)
  },

  // Batch operations
  'property_batch_version_operations': {
    description: 'Perform batch operations on property versions',
    inputSchema: z.object({
      operations: z.array(z.object({
        propertyId: z.string(),
        action: z.enum(['create', 'activate', 'deactivate']),
        version: z.number().optional(),
        network: z.enum(['staging', 'production']).optional(),
        notes: z.string().optional()
      })),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.batchVersionOperations(args)
  },

  'property_bulk_activate': {
    description: 'Bulk activate multiple properties',
    inputSchema: z.object({
      properties: z.array(z.object({
        propertyId: z.string(),
        version: z.number(),
        network: z.enum(['staging', 'production'])
      })),
      notes: z.string().optional(),
      notifyEmails: z.array(z.string()).optional(),
      acknowledgeWarnings: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.bulkActivateProperties(args)
  },

  'property_bulk_clone': {
    description: 'Bulk clone multiple properties',
    inputSchema: z.object({
      sourceProperties: z.array(z.object({
        propertyId: z.string(),
        newName: z.string(),
        contractId: z.string().optional(),
        groupId: z.string().optional()
      })),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.bulkCloneProperties(args)
  },

  'property_bulk_hostnames': {
    description: 'Bulk manage hostnames across properties',
    inputSchema: z.object({
      operations: z.array(z.object({
        propertyId: z.string(),
        version: z.number(),
        action: z.enum(['add', 'remove']),
        hostnames: z.array(z.string())
      })),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.bulkManageHostnames(args)
  },

  'property_bulk_rules_update': {
    description: 'Bulk update property rules',
    inputSchema: z.object({
      updates: z.array(z.object({
        propertyId: z.string(),
        version: z.number(),
        rules: z.any()
      })),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.bulkUpdatePropertyRules(args)
  },

  'property_bulk_operation_status': {
    description: 'Get bulk operation status',
    inputSchema: z.object({
      operationId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getBulkOperationStatus(args)
  }
};

/**
 * Export enhanced tool functions
 */
export {
  listProperties,
  getProperty,
  createProperty,
  cloneProperty,
  getPropertyRules,
  updatePropertyRules,
  activateProperty
};

/**
 * Export additional tool handlers from consolidated tools for backward compatibility
 * These will be migrated to enhanced pattern in the next phase
 */
export const {
  createPropertyVersion,
  getActivationStatus,
  rollbackPropertyVersion,
  getVersionDiff,
  compareProperties,
  detectConfigurationDrift,
  checkPropertyHealth,
  batchVersionOperations,
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus
} = consolidatedPropertyTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedPropertyTools };

/**
 * Property domain metadata for ALECSCore
 */
export const propertyDomainMetadata = {
  name: 'property',
  description: 'Akamai Property Manager - CDN configuration management',
  toolCount: Object.keys(propertyTools).length,
  features: [
    'Dynamic customer support',
    'Built-in caching for better performance',
    'Automatic hint integration',
    'Progress tracking for long operations',
    'Enhanced error messages with context',
    'Basic property CRUD operations',
    'Version management and rollback',
    'Configuration comparison and drift detection',
    'Health monitoring and diagnostics',
    'Bulk operations for enterprise scale'
  ]
};