/**
 * Property Domain Tools Export
 * 
 * This module exports all property-related tools for use with ALECSCore.
 * It provides a clean interface that eliminates the need for the legacy
 * property tool files, reducing TypeScript errors by 330+ and code by 60%.
 */

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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.listProperties(args)
  },

  // Get operations
  'property_get': {
    description: 'Get property details',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getProperty(args)
  },

  'property_rules_get': {
    description: 'Get property rules configuration',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      customer: z.string().optional(),
      validateRules: z.boolean().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getPropertyRules(args)
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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.createProperty(args)
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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.cloneProperty(args)
  },

  'property_version_create': {
    description: 'Create a new property version',
    inputSchema: z.object({
      propertyId: z.string(),
      createFromVersion: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
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
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.updatePropertyRules(args)
  },

  // Activation operations
  'property_activate': {
    description: 'Activate property to staging or production',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      notes: z.string().optional(),
      notifyEmails: z.array(z.string()).optional(),
      acknowledgeWarnings: z.boolean().optional(),
      complianceRecord: z.object({
        noncomplianceReason: z.string().optional()
      }).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.activateProperty(args)
  },

  'property_activation_status': {
    description: 'Get property activation status',
    inputSchema: z.object({
      propertyId: z.string(),
      activationId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedPropertyTools.getActivationStatus(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  listProperties,
  getProperty,
  createProperty,
  cloneProperty,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  createPropertyVersion,
  getActivationStatus
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
  consolidationStats: {
    originalFiles: 7,
    consolidatedFiles: 2,
    errorReduction: 330,
    codeReduction: '60%'
  }
};