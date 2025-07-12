/**
 * Rule Tree Domain
 * 
 * Comprehensive rule tree management for Akamai properties including:
 * - Advanced validation and optimization
 * - Template creation and management
 * - Rule merging and conflict detection
 * - Performance analysis
 * - Behavior and criteria management
 */

// Export operations from rule-trees.ts (existing)
export {
  ruleTreeOperations,
  RuleTreeOperations
} from './rule-trees';

// Export functions from rule-tree-management.ts
export {
  updatePropertyRulesEnhanced,
  createRuleFromTemplate,
  validateRuleTree,
  mergeRuleTrees,
  optimizeRuleTree,
  listRuleTemplates,
  analyzeRuleTreePerformance,
  detectRuleConflicts
} from './rule-tree-management';

// Export functions from property-manager-rules.ts
export {
  listAvailableBehaviors,
  listAvailableCriteria,
  patchPropertyRules,
  bulkSearchProperties,
  getBulkSearchResults,
  generateDomainValidationChallenges,
  resumeDomainValidation,
  getPropertyAuditHistory
} from './property-manager-rules';

// Export schemas and types
export {
  RuleTreeSchemas,
  RuleTreeEndpoints,
  formatRuleTreeValidationResponse,
  formatRuleTreeOptimizationResponse,
  formatRuleMergeResponse,
  formatRuleTreePerformanceAnalysis,
  formatRuleTemplatesResponse
} from './api';

// Export types
export type {
  RuleTreeRule,
  RuleBehavior,
  RuleCriterion,
  PropertyRules,
  RuleTreeVariable,
  RuleValidationResult,
  RuleValidationError,
  RuleValidationWarning,
  RuleOptimizationSuggestion,
  RuleStatistics,
  RuleTemplate,
  RuleTemplateVariable,
  RuleConflict,
  RuleDependency,
  RulePerformanceAnalysis,
  PerformanceCategory,
  RuleMergeOptions,
  RuleMergeConflict,
  RuleMergeResult
} from './types';

// Create operations registry for unified discovery
export const ruleTreeOperationsRegistry = {
  // From rule-tree-management.ts
  update_property_rules_enhanced: {
    name: 'update_property_rules_enhanced',
    description: 'Update property rules with pre-validation and optimization',
    inputSchema: RuleTreeSchemas.updateEnhanced,
    handler: updatePropertyRulesEnhanced
  },
  create_rule_from_template: {
    name: 'create_rule_from_template',
    description: 'Create rule tree from predefined templates',
    inputSchema: RuleTreeSchemas.createFromTemplate,
    handler: createRuleFromTemplate
  },
  validate_rule_tree: {
    name: 'validate_rule_tree',
    description: 'Validate rule tree with comprehensive analysis',
    inputSchema: RuleTreeSchemas.validate,
    handler: validateRuleTree
  },
  merge_rule_trees: {
    name: 'merge_rule_trees',
    description: 'Merge multiple rule trees with conflict resolution',
    inputSchema: RuleTreeSchemas.merge,
    handler: mergeRuleTrees
  },
  optimize_rule_tree: {
    name: 'optimize_rule_tree',
    description: 'Optimize rule tree for performance',
    inputSchema: RuleTreeSchemas.optimize,
    handler: optimizeRuleTree
  },
  list_rule_templates: {
    name: 'list_rule_templates',
    description: 'List available rule templates',
    inputSchema: RuleTreeSchemas.listTemplates,
    handler: listRuleTemplates
  },

  // From rule-tree-advanced.ts
  analyze_rule_tree_performance: {
    name: 'analyze_rule_tree_performance',
    description: 'Analyze rule tree for optimization opportunities',
    inputSchema: RuleTreeSchemas.analyzePerformance,
    handler: analyzeRuleTreePerformance
  },
  detect_rule_conflicts: {
    name: 'detect_rule_conflicts',
    description: 'Detect conflicts between rules',
    inputSchema: RuleTreeSchemas.detectConflicts,
    handler: detectRuleConflicts
  },

  // From property-manager-rules-tools.ts
  list_available_behaviors: {
    name: 'list_available_behaviors',
    description: 'List available behaviors for a property',
    inputSchema: RuleTreeSchemas.listBehaviors,
    handler: listAvailableBehaviors
  },
  list_available_criteria: {
    name: 'list_available_criteria',
    description: 'List available criteria for a property',
    inputSchema: RuleTreeSchemas.listCriteria,
    handler: listAvailableCriteria
  },
  patch_property_rules: {
    name: 'patch_property_rules',
    description: 'Patch property rules using JSON Patch',
    inputSchema: RuleTreeSchemas.patchRules,
    handler: patchPropertyRules
  },
  bulk_search_properties: {
    name: 'bulk_search_properties',
    description: 'Bulk search properties by rule tree content',
    inputSchema: RuleTreeSchemas.bulkSearch,
    handler: bulkSearchProperties
  },
  get_bulk_search_results: {
    name: 'get_bulk_search_results',
    description: 'Get results from bulk search operation',
    inputSchema: RuleTreeSchemas.getBulkSearchResults,
    handler: getBulkSearchResults
  },
  generate_domain_validation_challenges: {
    name: 'generate_domain_validation_challenges',
    description: 'Generate domain validation challenges for Default DV',
    inputSchema: RuleTreeSchemas.generateDomainValidation,
    handler: generateDomainValidationChallenges
  },
  resume_domain_validation: {
    name: 'resume_domain_validation',
    description: 'Resume paused domain validation',
    inputSchema: RuleTreeSchemas.resumeDomainValidation,
    handler: resumeDomainValidation
  },
  get_property_audit_history: {
    name: 'get_property_audit_history',
    description: 'Get audit history for property',
    inputSchema: RuleTreeSchemas.getAuditHistory,
    handler: getPropertyAuditHistory
  }
};

// Import handlers at the bottom to avoid circular dependencies
import {
  updatePropertyRulesEnhanced,
  createRuleFromTemplate,
  validateRuleTree,
  mergeRuleTrees,
  optimizeRuleTree,
  listRuleTemplates,
  analyzeRuleTreePerformance,
  detectRuleConflicts
} from './rule-tree-management';

import {
  listAvailableBehaviors,
  listAvailableCriteria,
  patchPropertyRules,
  bulkSearchProperties,
  getBulkSearchResults,
  generateDomainValidationChallenges,
  resumeDomainValidation,
  getPropertyAuditHistory
} from './property-manager-rules';

import { RuleTreeSchemas } from './api';