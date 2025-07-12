/**
 * Rule Tree Domain API Implementation
 * 
 * Provides comprehensive rule tree operations including validation,
 * templates, optimization, analysis, and advanced management.
 */

import { z } from 'zod';
import { AkamaiOperation } from '../common/akamai-operation';
import type { MCPToolResponse } from '../../types/mcp-protocol';

// Schema definitions for rule tree operations
export const RuleTreeSchemas = {
  // Enhanced update with validation
  updateEnhanced: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number(),
    contractId: z.string(),
    groupId: z.string(),
    rules: z.any(),
    validateOnly: z.boolean().optional(),
    autoOptimize: z.boolean().optional(),
    dryRun: z.boolean().optional()
  }),

  // Create from template
  createFromTemplate: z.object({
    customer: z.string().optional(),
    templateId: z.string(),
    variables: z.record(z.any()).optional(),
    validate: z.boolean().optional()
  }),

  // Validate rule tree
  validate: z.object({
    customer: z.string().optional(),
    propertyId: z.string().optional(),
    version: z.number().optional(),
    rules: z.any(),
    includeOptimizations: z.boolean().optional(),
    includePerformance: z.boolean().optional()
  }),

  // Merge rule trees
  merge: z.object({
    customer: z.string().optional(),
    sourceRules: z.any(),
    targetRules: z.any(),
    options: z.object({
      strategy: z.enum(['merge', 'override', 'append']).optional(),
      conflictResolution: z.enum(['source', 'target', 'manual']).optional(),
      preserveOrder: z.boolean().optional(),
      validateResult: z.boolean().optional()
    }).optional(),
    propertyContext: z.object({
      propertyId: z.string(),
      version: z.number()
    }).optional()
  }),

  // Optimize rule tree
  optimize: z.object({
    customer: z.string().optional(),
    rules: z.any(),
    optimizationLevel: z.enum(['basic', 'standard', 'aggressive']).optional(),
    preserveCustomizations: z.boolean().optional(),
    targetMetrics: z.array(z.enum(['speed', 'bandwidth', 'availability'])).optional()
  }),

  // List templates
  listTemplates: z.object({
    customer: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional()
  }),

  // Analyze performance
  analyzePerformance: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    rules: z.any().optional(),
    includeRecommendations: z.boolean().optional()
  }),

  // Detect conflicts
  detectConflicts: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    rules: z.any().optional()
  }),

  // Patch rules
  patchRules: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    patches: z.array(z.object({
      op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
      path: z.string(),
      value: z.any().optional(),
      from: z.string().optional()
    })),
    validateRules: z.boolean().optional()
  }),

  // List behaviors
  listBehaviors: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    productId: z.string().optional(),
    ruleFormat: z.string().optional()
  }),

  // List criteria
  listCriteria: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    version: z.number().optional(),
    productId: z.string().optional(),
    ruleFormat: z.string().optional()
  }),

  // Bulk search
  bulkSearch: z.object({
    customer: z.string().optional(),
    jsonPath: z.string(),
    network: z.enum(['PRODUCTION', 'STAGING', 'LATEST']).optional(),
    contractIds: z.array(z.string()).optional(),
    groupIds: z.array(z.string()).optional()
  }),

  // Get bulk search results
  getBulkSearchResults: z.object({
    customer: z.string().optional(),
    bulkSearchId: z.string()
  }),

  // Generate domain validation
  generateDomainValidation: z.object({
    customer: z.string().optional(),
    domains: z.array(z.string()),
    validationMethod: z.enum(['HTTP', 'DNS']).optional()
  }),

  // Resume domain validation
  resumeDomainValidation: z.object({
    customer: z.string().optional(),
    enrollmentId: z.number(),
    domains: z.array(z.string()).optional()
  }),

  // Get audit history
  getAuditHistory: z.object({
    customer: z.string().optional(),
    propertyId: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().optional()
  })
};

/**
 * Rule Tree API Endpoints
 */
export const RuleTreeEndpoints = {
  getRules: (propertyId: string, version: number, contractId: string, groupId: string) =>
    `/papi/v1/properties/${propertyId}/versions/${version}/rules?contractId=${contractId}&groupId=${groupId}`,

  updateRules: (propertyId: string, version: number) =>
    `/papi/v1/properties/${propertyId}/versions/${version}/rules`,

  validateRules: () => '/papi/v1/validate/rules',

  getCatalogBehaviors: () => '/papi/v1/catalog/behaviors',

  getCatalogCriteria: () => '/papi/v1/catalog/criteria',

  bulkSearch: () => '/papi/v1/bulk/rules-search-requests',

  getBulkSearchResults: (bulkSearchId: string) =>
    `/papi/v1/bulk/rules-search-requests/${bulkSearchId}`
};

/**
 * Response formatting helpers for rule tree operations
 */
export function formatRuleTreeValidationResponse(validation: any): string {
  let text = `## Rule Tree Validation Report\n\n`;
  text += `**Overall Status:** ${validation.isValid ? '✅ Valid' : '❌ Invalid'}\n\n`;

  text += `### Scores\n`;
  text += `- Performance: ${validation.performanceScore}/100\n`;
  text += `- Compliance: ${validation.complianceScore}/100\n\n`;

  if (validation.errors.length > 0) {
    text += `### Errors (${validation.errors.length})\n`;
    validation.errors.forEach((error: any, idx: number) => {
      text += `${idx + 1}. **${error.type}** [${error.severity}]\n`;
      text += `   - Path: ${error.path}\n`;
      text += `   - Message: ${error.message}\n`;
      if (error.fix) {
        text += `   - Fix: ${error.fix}\n`;
      }
    });
    text += '\n';
  }

  if (validation.warnings.length > 0) {
    text += `### Warnings (${validation.warnings.length})\n`;
    validation.warnings.forEach((warning: any, idx: number) => {
      text += `${idx + 1}. **${warning.type}**\n`;
      text += `   - Path: ${warning.path}\n`;
      text += `   - Message: ${warning.message}\n`;
      if (warning.recommendation) {
        text += `   - Recommendation: ${warning.recommendation}\n`;
      }
    });
    text += '\n';
  }

  if (validation.suggestions.length > 0) {
    text += `### Optimization Suggestions (${validation.suggestions.length})\n`;
    validation.suggestions.forEach((suggestion: any, idx: number) => {
      text += `${idx + 1}. [${suggestion.impact}] ${suggestion.type}\n`;
      text += `   - ${suggestion.description}\n`;
      text += `   - Implementation: ${suggestion.implementation}\n`;
      if (suggestion.estimatedImprovement) {
        text += `   - Expected improvement: ${suggestion.estimatedImprovement}\n`;
      }
    });
  }

  return text;
}

export function formatRuleTreeOptimizationResponse(result: any): string {
  let text = `## Rule Tree Optimization Report\n\n`;
  text += `**Optimization Level:** ${result.level}\n`;
  text += `**Target Metrics:** ${result.metrics.join(', ')}\n\n`;

  text += `### Performance Improvements\n`;
  text += `- Overall Score: ${result.analysis.overallScore}/100 → ${result.newAnalysis.overallScore}/100 (+${result.newAnalysis.overallScore - result.analysis.overallScore})\n`;
  text += `- Caching: ${result.analysis.categories.caching.score}/100 → ${result.newAnalysis.categories.caching.score}/100\n`;
  text += `- Compression: ${result.analysis.categories.compression.score}/100 → ${result.newAnalysis.categories.compression.score}/100\n`;
  text += `- HTTP/2: ${result.analysis.categories.http2.score}/100 → ${result.newAnalysis.categories.http2.score}/100\n\n`;

  text += `### Optimizations Applied (${result.optimizations.length})\n`;
  result.optimizations.forEach((opt: any, idx: number) => {
    text += `${idx + 1}. **${opt.type}** [${opt.impact}]\n`;
    text += `   - ${opt.description}\n`;
    text += `   - Implementation: ${opt.implementation}\n`;
    if (opt.estimatedImprovement) {
      text += `   - Expected Impact: ${opt.estimatedImprovement}\n`;
    }
  });

  return text;
}

export function formatRuleMergeResponse(result: any): string {
  let text = `## Rule Trees Merged Successfully\n\n`;
  text += `### Merge Configuration\n`;
  text += `- Strategy: ${result.options.strategy}\n`;
  text += `- Conflict Resolution: ${result.options.conflictResolution}\n`;
  text += `- Order Preserved: ${result.options.preserveOrder}\n\n`;

  text += `### Merge Results\n`;
  text += `- Rules from source: ${result.rulesFromSource}\n`;
  text += `- Rules from target: ${result.rulesFromTarget}\n`;
  text += `- Rules merged: ${result.rulesAdded}\n`;
  text += `- Conflicts resolved: ${result.conflictsResolved}\n\n`;

  if (result.conflicts.length > 0) {
    text += `### Conflict Details\n`;
    result.conflicts.slice(0, 5).forEach((conflict: any, idx: number) => {
      text += `${idx + 1}. ${conflict.path}\n`;
      text += `   - Type: ${conflict.type}\n`;
      text += `   - Resolution: ${conflict.resolution}\n`;
    });
    if (result.conflicts.length > 5) {
      text += `\n... and ${result.conflicts.length - 5} more conflicts\n`;
    }
  }

  return text;
}

export function formatRuleTreePerformanceAnalysis(analysis: any): string {
  let text = `## Rule Tree Performance Analysis\n\n`;
  
  text += `### Performance Metrics\n`;
  text += `- Evaluation Complexity: ${analysis.complexity}/100\n`;
  text += `- Cache Efficiency: ${analysis.cacheEfficiency}%\n`;
  text += `- Rule Redundancy: ${analysis.redundancy}%\n`;
  text += `- Optimization Potential: ${analysis.optimizationPotential}/100\n\n`;

  if (analysis.criticalFindings.length > 0) {
    text += `### Critical Findings\n`;
    analysis.criticalFindings.forEach((finding: any, idx: number) => {
      text += `${idx + 1}. **${finding.type}**: ${finding.description}\n`;
      text += `   - Impact: ${finding.impact}\n`;
      text += `   - Location: ${finding.path}\n`;
    });
    text += '\n';
  }

  if (analysis.bottlenecks.length > 0) {
    text += `### Performance Bottlenecks\n`;
    analysis.bottlenecks.forEach((bottleneck: any, idx: number) => {
      text += `${idx + 1}. **${bottleneck.behavior}** at ${bottleneck.path}\n`;
      text += `   - Issue: ${bottleneck.issue}\n`;
      text += `   - Recommendation: ${bottleneck.recommendation}\n`;
    });
    text += '\n';
  }

  text += `### Caching Analysis\n`;
  text += `- Static Content Coverage: ${analysis.caching.staticCoverage}%\n`;
  text += `- Dynamic Content Strategy: ${analysis.caching.dynamicStrategy}\n`;
  text += `- TTL Optimization: ${analysis.caching.ttlOptimization}\n`;
  text += `- Cache Key Efficiency: ${analysis.caching.cacheKeyEfficiency}\n\n`;

  if (analysis.recommendations.length > 0) {
    text += `### Recommendations\n`;
    analysis.recommendations.forEach((rec: any, idx: number) => {
      text += `${idx + 1}. **${rec.priority} Priority**: ${rec.title}\n`;
      text += `   - ${rec.description}\n`;
      text += `   - Expected Impact: ${rec.impact}\n`;
      text += `   - Implementation Effort: ${rec.effort}\n`;
    });
  }

  return text;
}

export function formatRuleTemplatesResponse(templates: any[]): string {
  let text = `## Available Rule Templates\n\n`;
  text += `**Total Templates:** ${templates.length}\n\n`;

  // Group by category
  const byCategory = templates.reduce((acc, template) => {
    const cat = template.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(byCategory).forEach(([category, categoryTemplates]) => {
    text += `### ${category}\n\n`;
    
    categoryTemplates.forEach((template) => {
      text += `#### ${template.name}\n`;
      text += `- **ID:** \`${template.id}\`\n`;
      text += `- **Description:** ${template.description}\n`;
      text += `- **Tags:** ${template.tags.join(', ')}\n`;
      text += `- **Version:** ${template.version}\n`;
      text += `- **Author:** ${template.author}\n`;
      text += `- **Last Updated:** ${template.lastUpdated}\n`;
      
      if (template.variables && template.variables.length > 0) {
        text += `- **Variables:** ${template.variables.length} customizable parameters\n`;
      }
      text += '\n';
    });
  });

  return text;
}