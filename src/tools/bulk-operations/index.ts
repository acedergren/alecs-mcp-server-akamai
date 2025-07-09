/**
 * Bulk Operations Domain Tools Export
 * 
 * This module exports all bulk operations tools for use with ALECSCore.
 * Provides large-scale operations across multiple properties.
 */

import { consolidatedBulkOperationsTools } from './consolidated-bulk-operations-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Bulk operations tool definitions for ALECSCore registration
 */
export const bulkOperationsTools = {
  // Bulk activations
  'bulk_activate_properties': {
    description: 'Bulk activate multiple properties',
    inputSchema: z.object({
      activations: z.array(z.object({
        propertyId: z.string(),
        propertyVersion: z.number().int().positive(),
        network: z.enum(['STAGING', 'PRODUCTION']),
        note: z.string().optional(),
        acknowledgeAllWarnings: z.boolean().optional(),
        fastPush: z.boolean().optional(),
        ignoreHttpErrors: z.boolean().optional()
      })).min(1).max(500),
      notificationEmails: z.array(z.string().email()).optional(),
      acknowledgeWarnings: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedBulkOperationsTools.bulkActivateProperties(args)
  },

  // Bulk cloning
  'bulk_clone_properties': {
    description: 'Bulk clone properties from a source',
    inputSchema: z.object({
      sourcePropertyId: z.string(),
      cloneConfigs: z.array(z.object({
        propertyName: z.string().min(1).max(85),
        contractId: z.string(),
        groupId: z.string(),
        productId: z.string().optional()
      })).min(1).max(100),
      cloneFromVersion: z.number().int().positive().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedBulkOperationsTools.bulkCloneProperties(args)
  },

  // Bulk hostname management
  'bulk_manage_hostnames': {
    description: 'Bulk add or remove hostnames',
    inputSchema: z.object({
      operations: z.array(z.object({
        propertyId: z.string(),
        propertyVersion: z.number().int().positive(),
        action: z.enum(['add', 'remove']),
        hostnames: z.array(z.string()).min(1)
      })).min(1).max(100),
      validateOnly: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedBulkOperationsTools.bulkManageHostnames(args)
  },

  // Bulk rules updates
  'bulk_update_property_rules': {
    description: 'Bulk update property rules using JSON patches',
    inputSchema: z.object({
      updates: z.array(z.object({
        propertyId: z.string(),
        propertyVersion: z.number().int().positive(),
        patches: z.array(z.object({
          op: z.enum(['add', 'remove', 'replace', 'copy', 'move', 'test']),
          path: z.string(),
          value: z.any().optional(),
          from: z.string().optional()
        })).min(1)
      })).min(1).max(50),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedBulkOperationsTools.bulkUpdatePropertyRules(args)
  },

  // Operation status
  'bulk_operation_status': {
    description: 'Get status of bulk operation',
    inputSchema: z.object({
      operationId: z.string(),
      operationType: z.enum(['activation', 'clone', 'hostname', 'rules']),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedBulkOperationsTools.getBulkOperationStatus(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus
} = consolidatedBulkOperationsTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedBulkOperationsTools };

/**
 * Bulk operations domain metadata
 */
export const bulkOperationsDomainMetadata = {
  name: 'bulk-operations',
  description: 'Akamai Bulk Operations - Large-scale property management',
  toolCount: Object.keys(bulkOperationsTools).length,
  features: [
    'Bulk property activations (up to 500)',
    'Bulk property cloning',
    'Bulk hostname management',
    'Bulk rules updates with JSON patches',
    'Operation status tracking'
  ]
};