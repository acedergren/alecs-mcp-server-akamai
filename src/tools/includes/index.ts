/**
 * Include Domain Tools Export
 * 
 * This module exports all include-related tools for use with ALECSCore.
 * Includes are reusable configuration snippets in Akamai Property Manager.
 */

import { consolidatedIncludeTools } from './consolidated-include-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Include tool definitions for ALECSCore registration
 */
export const includeTools = {
  // Core operations
  'include_list': {
    description: 'List property includes',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.listIncludes(args)
  },

  'include_search': {
    description: 'Search includes by name or type',
    inputSchema: z.object({
      searchTerm: z.string().optional(),
      filters: z.object({
        includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).optional(),
        contractId: z.string().optional(),
        groupId: z.string().optional(),
        hasActivation: z.boolean().optional()
      }).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.searchIncludes(args)
  },

  'include_create': {
    description: 'Create a new include',
    inputSchema: z.object({
      includeName: z.string(),
      includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).optional(),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string().optional(),
      ruleFormat: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.createInclude(args)
  },

  'include_get': {
    description: 'Get include details',
    inputSchema: z.object({
      includeId: z.string(),
      version: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.getInclude(args)
  },

  'include_update': {
    description: 'Update include configuration',
    inputSchema: z.object({
      includeId: z.string(),
      version: z.number(),
      rules: z.any(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.updateInclude(args)
  },

  // Version management
  'include_version_create': {
    description: 'Create new include version',
    inputSchema: z.object({
      includeId: z.string(),
      createFromVersion: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.createIncludeVersion(args)
  },

  // Activation
  'include_activate': {
    description: 'Activate include version',
    inputSchema: z.object({
      includeId: z.string(),
      version: z.number(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      notes: z.string().optional(),
      notifyEmails: z.array(z.string()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.activateInclude(args)
  },

  'include_activation_list': {
    description: 'List include activation history',
    inputSchema: z.object({
      includeId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.listIncludeActivations(args)
  },

  'include_activation_status': {
    description: 'Get include activation status',
    inputSchema: z.object({
      includeId: z.string(),
      activationId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.getIncludeActivationStatus(args)
  },

  'include_delete': {
    description: 'Delete an include',
    inputSchema: z.object({
      includeId: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedIncludeTools.deleteInclude(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  listIncludes,
  searchIncludes,
  createInclude,
  getInclude,
  updateInclude,
  deleteInclude,
  createIncludeVersion,
  activateInclude,
  listIncludeActivations,
  getIncludeActivationStatus
} = consolidatedIncludeTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedIncludeTools };

/**
 * Include domain metadata
 */
export const includeDomainMetadata = {
  name: 'include',
  description: 'Akamai Include Management - Reusable configuration snippets',
  toolCount: Object.keys(includeTools).length,
  features: [
    'Create and manage includes',
    'Version control for includes',
    'Activation to staging/production',
    'Activation history and status',
    'Support for microservices and common settings'
  ]
};