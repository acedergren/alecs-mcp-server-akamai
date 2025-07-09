/**
 * Rule Tree Domain Tools Export
 * 
 * This module exports all rule tree management tools for use with ALECSCore.
 * Rule trees define the behavior of properties in Akamai.
 */

import { consolidatedRuleTreeTools } from './consolidated-rule-tree-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Rule tree tool definitions for ALECSCore registration
 */
export const ruleTreeTools = {
  // Template operations
  'rule_tree_create_from_template': {
    description: 'Create rule tree from template',
    inputSchema: z.object({
      templateName: z.enum(['performance', 'security', 'caching', 'mobile', 'custom']),
      customizations: z.record(z.any()).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedRuleTreeTools.createRuleFromTemplate(args)
  },

  // Rule tree operations
  'rule_tree_merge': {
    description: 'Merge multiple rule trees',
    inputSchema: z.object({
      baseRuleTree: z.any(),
      overlayRuleTrees: z.array(z.any()),
      mergeStrategy: z.enum(['override', 'append', 'merge']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedRuleTreeTools.mergeRuleTrees(args)
  },

  'rule_tree_optimize': {
    description: 'Optimize rule tree performance',
    inputSchema: z.object({
      ruleTree: z.any(),
      optimizationTargets: z.array(z.enum(['performance', 'caching', 'security', 'size'])).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedRuleTreeTools.optimizeRuleTree(args)
  },

  'rule_tree_validate': {
    description: 'Validate rule tree configuration',
    inputSchema: z.object({
      ruleTree: z.any(),
      propertyId: z.string().optional(),
      version: z.number().optional(),
      ruleFormat: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedRuleTreeTools.validateRuleTree(args)
  },

  // Enhanced property rules update
  'property_rules_update_enhanced': {
    description: 'Update property rules with validation',
    inputSchema: z.object({
      propertyId: z.string(),
      version: z.number(),
      rules: z.any(),
      validateOnly: z.boolean().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedRuleTreeTools.updatePropertyRulesEnhanced(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  createRuleFromTemplate,
  mergeRuleTrees,
  optimizeRuleTree,
  validateRuleTree,
  updatePropertyRulesEnhanced
} = consolidatedRuleTreeTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedRuleTreeTools };

/**
 * Rule tree domain metadata
 */
export const ruleTreeDomainMetadata = {
  name: 'rule-tree',
  description: 'Akamai Rule Tree Management - Advanced property configuration',
  toolCount: Object.keys(ruleTreeTools).length,
  features: [
    'Create rules from templates',
    'Merge multiple rule trees',
    'Optimize for performance',
    'Validate configurations',
    'Enhanced property updates'
  ]
};