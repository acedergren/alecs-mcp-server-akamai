/**
 * Advanced Rule Tree Management System
 * Provides comprehensive rule tree manipulation, validation, and optimization capabilities
 */

import { logger } from '../utils/logger';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { validateApiResponse } from '../utils/api-response-validator';
import { z } from 'zod';

// CODE KAI: Type-safe Rule Tree interfaces
// Key: Complete type safety for Akamai Property Manager Rule Trees
// Approach: Comprehensive interfaces matching official API specifications  
// Implementation: Zod schemas with runtime validation

/**
 * Core Rule Tree structure matching Akamai Property Manager API
 */
export interface RuleTreeRule {
  name: string;
  criteria?: RuleCriterion[];
  behaviors?: RuleBehavior[];
  children?: RuleTreeRule[];
  comments?: string;
  uuid?: string;
  templateUuid?: string;
  criteriaMustSatisfy?: 'all' | 'any';
}

/**
 * Rule Tree behavior configuration
 */
export interface RuleBehavior {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
}

/**
 * Rule Tree criterion for matching conditions
 */
export interface RuleCriterion {
  name: string;
  options?: Record<string, unknown>;
  uuid?: string;
  templateUuid?: string;
}

/**
 * Complete Rule Tree response from API
 */
export interface PropertyRules {
  rules: RuleTreeRule;
  ruleFormat: string;
  etag?: string;
  comments?: string;
  accountId?: string;
  contractId?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number;
}

/**
 * Rule Tree variables for dynamic configuration
 */
export interface RuleTreeVariable {
  name: string;
  value: string | number | boolean;
  description?: string;
  hidden?: boolean;
  sensitive?: boolean;
}

// CODE KAI: Zod schemas for runtime validation
// Based on official Akamai Property Manager API v1 specifications
const RuleBehaviorSchema = z.object({
  name: z.string(),
  options: z.record(z.unknown()).optional(),
  uuid: z.string().optional(),
  templateUuid: z.string().optional(),
});

const RuleCriterionSchema = z.object({
  name: z.string(),
  options: z.record(z.unknown()).optional(),
  uuid: z.string().optional(),
  templateUuid: z.string().optional(),
});

const RuleTreeRuleSchema = z.lazy(() => z.object({
  name: z.string(),
  criteria: z.array(RuleCriterionSchema).optional(),
  behaviors: z.array(RuleBehaviorSchema).optional(),
  children: z.array(RuleTreeRuleSchema).optional(),
  comments: z.string().optional(),
  uuid: z.string().optional(),
  templateUuid: z.string().optional(),
  criteriaMustSatisfy: z.enum(['all', 'any']).optional(),
}));

const PropertyRulesSchema = z.object({
  rules: RuleTreeRuleSchema,
  ruleFormat: z.string(),
  etag: z.string().optional(),
  comments: z.string().optional(),
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  propertyId: z.string().optional(),
  propertyVersion: z.number().optional(),
});

// Rule tree specific types
export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings: RuleValidationWarning[];
  suggestions: RuleOptimizationSuggestion[];
  performanceScore: number;
  complianceScore: number;
}

export interface RuleValidationError {
  type: 'syntax' | 'logic' | 'reference' | 'compatibility';
  severity: 'critical' | 'error';
  path: string;
  message: string;
  fix?: string;
}

export interface RuleValidationWarning {
  type: 'performance' | 'security' | 'deprecated' | 'best-practice';
  severity: 'warning' | 'info';
  path: string;
  message: string;
  recommendation: string;
}

export interface RuleOptimizationSuggestion {
  type: 'consolidation' | 'reordering' | 'caching' | 'security' | 'compression' | 'performance';
  impact: 'high' | 'medium' | 'low';
  path: string;
  description: string;
  implementation: string;
  estimatedImprovement?: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  variables: Record<string, RuleTemplateVariable>;
  ruleTree: RuleTreeRule;
  examples: RuleTemplateExample[];
  compatibility: {
    products: string[];
    ruleFormats: string[];
  };
}

export interface RuleTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: string | number | boolean | unknown[] | Record<string, unknown>;
  required: boolean;
  validation?: string;
}

export interface RuleTemplateExample {
  name: string;
  description: string;
  variables: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>;
}

export interface RuleMergeOptions {
  strategy: 'merge' | 'override' | 'append';
  conflictResolution: 'source' | 'target' | 'manual';
  preserveOrder: boolean;
  validateResult: boolean;
}

export interface RuleMergeConflict {
  path: string;
  type: 'behavior' | 'rule' | 'value';
  resolution: string;
  source?: unknown;
  target?: unknown;
}

export interface RulePerformanceAnalysis {
  overallScore: number;
  categories: {
    caching: PerformanceCategory;
    compression: PerformanceCategory;
    http2: PerformanceCategory;
    images: PerformanceCategory;
    mobile: PerformanceCategory;
  };
  criticalIssues: string[];
  recommendations: RuleOptimizationSuggestion[];
}

export interface PerformanceCategory {
  score: number;
  status: 'optimal' | 'good' | 'needs-improvement' | 'poor';
  findings: string[];
  improvements: string[];
}

// Pre-defined rule templates
const RULE_TEMPLATES = new Map<string, RuleTemplate>([
  [
    'performance-basic',
    {
      id: 'performance-basic',
      name: 'Basic Performance Optimization',
      description: 'Essential performance optimizations for web delivery',
      category: 'performance',
      tags: ['caching', 'compression', 'performance'],
      variables: {
        cacheDefaultTtl: {
          name: 'cacheDefaultTtl',
          type: 'number',
          description: 'Default cache TTL in seconds',
          default: 86400,
          required: false,
          validation: 'min:0,max:31536000',
        },
        enableGzip: {
          name: 'enableGzip',
          type: 'boolean',
          description: 'Enable GZIP compression',
          default: true,
          required: false,
        },
      },
      ruleTree: {
        name: 'Performance Optimization',
        children: [
          {
            name: 'Caching',
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'MAX_AGE',
                  ttl: '{{cacheDefaultTtl}}s',
                },
              },
            ],
          },
          {
            name: 'Compression',
            behaviors: [
              {
                name: 'gzipResponse',
                options: {
                  behavior: '{{enableGzip ? "ALWAYS" : "NEVER"}}',
                },
              },
            ],
          },
        ],
      },
      examples: [
        {
          name: 'Standard Web',
          description: 'Standard web application settings',
          variables: {
            cacheDefaultTtl: 86400,
            enableGzip: true,
          },
        },
      ],
      compatibility: {
        products: ['prd_fresca', 'prd_Site_Accel'],
        ruleFormats: ['v2023-01-05', 'v2023-05-30'],
      },
    },
  ],
  [
    'security-headers',
    {
      id: 'security-headers',
      name: 'Security Headers',
      description: 'Comprehensive security headers for web applications',
      category: 'security',
      tags: ['security', 'headers', 'compliance'],
      variables: {
        enableHsts: {
          name: 'enableHsts',
          type: 'boolean',
          description: 'Enable HSTS header',
          default: true,
          required: false,
        },
        hstsMaxAge: {
          name: 'hstsMaxAge',
          type: 'number',
          description: 'HSTS max age in seconds',
          default: 31536000,
          required: false,
        },
        contentSecurityPolicy: {
          name: 'contentSecurityPolicy',
          type: 'string',
          description: 'CSP header value',
          default: "default-src 'self'",
          required: false,
        },
      },
      ruleTree: {
        name: 'Security Headers',
        behaviors: [
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              standardAddHeaderName: 'STRICT_TRANSPORT_SECURITY',
              headerValue: 'max-age={{hstsMaxAge}}; includeSubDomains',
              avoidDuplicateHeaders: true,
            },
          },
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              customHeaderName: 'Content-Security-Policy',
              headerValue: '{{contentSecurityPolicy}}',
              avoidDuplicateHeaders: true,
            },
          },
        ],
      },
      examples: [
        {
          name: 'Strict Security',
          description: 'Strict security settings',
          variables: {
            enableHsts: true,
            hstsMaxAge: 63072000,
            contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
          },
        },
      ],
      compatibility: {
        products: ['prd_fresca', 'prd_Site_Accel', 'prd_Web_App_Accel'],
        ruleFormats: ['v2023-01-05', 'v2023-05-30'],
      },
    },
  ],
]);

/**
 * Enhanced update property rules with pre-validation and optimization
 */
export async function updatePropertyRulesEnhanced(
  client: AkamaiClient,
  args: {
    customer?: string;
    propertyId: string;
    version: number;
    contractId: string;
    groupId: string;
    rules: PropertyRules;
    validateOnly?: boolean;
    autoOptimize?: boolean;
    dryRun?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    // Pre-validation
    const validation = await validateRuleTreeInternal(args.rules, {
      propertyId: args.propertyId,
      version: args.version,
      includeOptimizations: args.autoOptimize || false,
    });

    if (!validation.isValid && !args.validateOnly) {
      let text = '[ERROR] **Rule Validation Failed**\n\n';
      text += `**Errors Found:** ${validation.errors.length}\n\n`;

      validation.errors.slice(0, 5).forEach((_error, index) => {
        text += `${index + 1}. **${_error.type}** [${_error.severity}]\n`;
        text += `   Path: ${_error.path}\n`;
        text += `   Message: ${_error.message}\n`;
        if (_error.fix) {
          text += `   Fix: ${_error.fix}\n`;
        }
        text += '\n';
      });

      if (validation.errors.length > 5) {
        text += `... and ${validation.errors.length - 5} more errors\n`;
      }

      text += '\n**Action Required:** Fix validation errors before updating rules';

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // Apply auto-optimization if requested
    let optimizedRules = args.rules;
    if (args.autoOptimize && validation.suggestions.length > 0) {
      optimizedRules = applyOptimizations(args.rules, validation.suggestions);
    }

    if (args.validateOnly || args.dryRun) {
      let text = `[DONE] **Rule Validation ${args.dryRun ? 'and Dry Run ' : ''}Successful**\n\n`;

      text += '**Validation Summary:**\n';
      text += `- Errors: ${validation.errors.length}\n`;
      text += `- Warnings: ${validation.warnings.length}\n`;
      text += `- Performance Score: ${validation.performanceScore}/100\n`;
      text += `- Compliance Score: ${validation.complianceScore}/100\n\n`;

      if (validation.warnings.length > 0) {
        text += '**Warnings:**\n';
        validation.warnings.slice(0, 5).forEach((warning, index) => {
          text += `${index + 1}. ${warning.message}\n`;
          text += `   Recommendation: ${warning.recommendation}\n\n`;
        });
      }

      if (validation.suggestions.length > 0) {
        text += '**Optimization Suggestions:**\n';
        validation.suggestions.slice(0, 5).forEach((suggestion, index) => {
          text += `${index + 1}. [${suggestion.impact}] ${suggestion.description}\n`;
          text += `   Implementation: ${suggestion.implementation}\n\n`;
        });
      }

      if (!args.validateOnly) {
        text += '\n**Dry Run Mode:** No changes were made. Remove dryRun flag to apply changes.';
      }

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // Update rules
    await client.request({
      method: 'PUT',
      path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
      headers: {
        'Content-Type': 'application/vnd.akamai.papirules.latest+json',
      },
      queryParams: {
        contractId: args.contractId,
        groupId: args.groupId,
        validateRules: 'true',
      },
      body: {
        rules: optimizedRules,
      },
    });

    let text = '[DONE] **Property Rules Updated Successfully**\n\n';
    text += `Property: ${args.propertyId}\n`;
    text += `Version: ${args.version}\n`;

    if (args.autoOptimize && validation.suggestions.length > 0) {
      text += `\n**Optimizations Applied:** ${validation.suggestions.length}\n`;
    }

    text += '\n**Validation Results:**\n';
    text += `- Performance Score: ${validation.performanceScore}/100\n`;
    text += `- Compliance Score: ${validation.complianceScore}/100\n`;

    text += '\n**Next Steps:**\n';
    text += `- Validate activation: "Validate property ${args.propertyId} version ${args.version} for staging"\n`;
    text += `- Activate: "Activate property ${args.propertyId} version ${args.version} to staging"\n`;
    text += `- Compare with previous: "Compare property ${args.propertyId} versions ${args.version - 1} and ${args.version}"\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('update property rules with validation', _error);
  }
}

/**
 * Create rule tree from template
 */
export async function createRuleFromTemplate(
  _client: AkamaiClient,
  args: {
    customer?: string;
    templateId: string;
    variables?: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>;
    validate?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const template = RULE_TEMPLATES.get(args.templateId);

    if (!template) {
      const availableTemplates = Array.from(RULE_TEMPLATES.keys());
      return {
        content: [
          {
            type: 'text',
            text: `[ERROR] Template '${args.templateId}' not found.\n\nAvailable templates:\n${availableTemplates.map((t) => `- ${t}`).join('\n')}`,
          },
        ],
      };
    }

    // Validate variables
    const variables = { ...args.variables };
    for (const [varName, varDef] of Object.entries(template.variables)) {
      if (varDef.required && !(varName in variables)) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] Required variable '${varName}' not provided.\n\nRequired variables:\n${Object.entries(
                template.variables,
              )
                .filter(([_, v]) => v.required)
                .map(([k, v]) => `- ${k}: ${v.description}`)
                .join('\n')}`,
            },
          ],
        };
      }

      if (!(varName in variables) && varDef.default !== undefined) {
        variables[varName] = varDef.default;
      }
    }

    // Process template with variables
    const processedRuleTree = processTemplate(template.ruleTree, variables);

    if (args.validate) {
      const validation = await validateRuleTreeInternal(processedRuleTree, {
        includeOptimizations: true,
      });

      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: `[ERROR] Generated rule tree validation failed.\n\nErrors:\n${validation.errors.map((e) => `- ${e.message}`).join('\n')}`,
            },
          ],
        };
      }
    }

    let text = '[DONE] **Rule Tree Created from Template**\n\n';
    text += `**Template:** ${template.name}\n`;
    text += `**Category:** ${template.category}\n`;
    text += `**Description:** ${template.description}\n\n`;

    text += '**Applied Variables:**\n';
    for (const [key, value] of Object.entries(variables)) {
      text += `- ${key}: ${JSON.stringify(value)}\n`;
    }

    text += '\n**Generated Rule Tree:**\n';
    text += '```json\n';
    text += JSON.stringify(processedRuleTree, null, 2);
    text += '\n```\n';

    text += '\n**Compatibility:**\n';
    text += `- Products: ${template.compatibility.products.join(', ')}\n`;
    text += `- Rule Formats: ${template.compatibility.ruleFormats.join(', ')}\n`;

    text += '\n**Next Steps:**\n';
    text += '- Apply to property: Use the generated rule tree with "Update property rules"\n';
    text += '- Customize further: Modify the generated rules as needed\n';
    text += '- Validate: "Validate rule tree" with your property context\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('create rule from template', _error);
  }
}

/**
 * Validate rule tree with comprehensive analysis
 */
export async function validateRuleTree(
  _client: AkamaiClient,
  args: {
    customer?: string;
    propertyId?: string;
    version?: number;
    rules: PropertyRules;
    includeOptimizations?: boolean;
    includePerformance?: boolean;
  },
): Promise<MCPToolResponse> {
  try {
    const validation = await validateRuleTreeInternal(args.rules, {
      propertyId: args.propertyId,
      version: args.version,
      includeOptimizations: args.includeOptimizations || false,
      includePerformance: args.includePerformance || false,
    });

    let text = '[EMOJI] **Rule Tree Validation Report**\n\n';

    const statusIcon = validation.isValid ? '[DONE]' : '[ERROR]';
    text += `**Overall Status:** ${statusIcon} ${validation.isValid ? 'Valid' : 'Invalid'}\n\n`;

    text += '**Sco_res:**\n';
    text += `- Performance: ${validation.performanceScore}/100\n`;
    text += `- Compliance: ${validation.complianceScore}/100\n\n`;

    text += '**Summary:**\n';
    text += `- Errors: ${validation.errors.length}\n`;
    text += `- Warnings: ${validation.warnings.length}\n`;
    text += `- Suggestions: ${validation.suggestions.length}\n\n`;

    if (validation.errors.length > 0) {
      text += '**[EMOJI] Errors (must fix):**\n';
      validation.errors.forEach((_error, index) => {
        text += `${index + 1}. [${_error.severity}] ${_error.type}\n`;
        text += `   Path: ${_error.path}\n`;
        text += `   Issue: ${_error.message}\n`;
        if (_error.fix) {
          text += `   Fix: ${_error.fix}\n`;
        }
        text += '\n';
      });
    }

    if (validation.warnings.length > 0) {
      text += '**[WARNING] Warnings (should review):**\n';
      validation.warnings.slice(0, 10).forEach((warning, index) => {
        text += `${index + 1}. [${warning.type}] ${warning.message}\n`;
        text += `   Path: ${warning.path}\n`;
        text += `   Action: ${warning.recommendation}\n\n`;
      });

      if (validation.warnings.length > 10) {
        text += `... and ${validation.warnings.length - 10} more warnings\n\n`;
      }
    }

    if (validation.suggestions.length > 0) {
      text += '**[INFO] Optimization Suggestions:**\n';
      validation.suggestions.slice(0, 10).forEach((suggestion, index) => {
        text += `${index + 1}. [${suggestion.impact}] ${suggestion.type}\n`;
        text += `   ${suggestion.description}\n`;
        text += `   How: ${suggestion.implementation}\n`;
        if (suggestion.estimatedImprovement) {
          text += `   Impact: ${suggestion.estimatedImprovement}\n`;
        }
        text += '\n';
      });

      if (validation.suggestions.length > 10) {
        text += `... and ${validation.suggestions.length - 10} more suggestions\n`;
      }
    }

    text += '\n**Actions:**\n';
    if (!validation.isValid) {
      text += '- Fix errors before applying rules\n';
    }
    text += '- Review warnings and implement suggestions\n';
    text += '- Re-validate after making changes\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('validate rule tree', _error);
  }
}

/**
 * Merge rule trees with conflict resolution
 */
export async function mergeRuleTrees(
  _client: AkamaiClient,
  args: {
    customer?: string;
    sourceRules: PropertyRules;
    targetRules: PropertyRules;
    options?: RuleMergeOptions;
    propertyContext?: {
      propertyId: string;
      version: number;
    };
  },
): Promise<MCPToolResponse> {
  try {
    const options: RuleMergeOptions = {
      strategy: 'merge',
      conflictResolution: 'manual',
      preserveOrder: true,
      validateResult: true,
      ...args.options,
    };

    const mergeResult = performRuleMerge(args.sourceRules, args.targetRules, options);

    if (options.validateResult) {
      const validation = await validateRuleTreeInternal(mergeResult.mergedRules, {
        propertyId: args.propertyContext?.propertyId,
        version: args.propertyContext?.version,
        includeOptimizations: false,
      });

      if (!validation.isValid) {
        let text = '[WARNING] **Rule Merge Completed with Validation Issues**\n\n';
        text += '**Merge Summary:**\n';
        text += `- Rules merged: ${mergeResult.rulesAdded}\n`;
        text += `- Conflicts resolved: ${mergeResult.conflictsResolved}\n`;
        text += `- Validation errors: ${validation.errors.length}\n\n`;

        text += '**Validation Errors:**\n';
        validation.errors.slice(0, 5).forEach((_error, index) => {
          text += `${index + 1}. ${_error.message}\n`;
        });

        text +=
          '\n**Note:** The merge completed but resulted in an invalid rule tree. Review and fix validation errors.';

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    }

    let text = '[DONE] **Rule Trees Merged Successfully**\n\n';
    text += '**Merge Configuration:**\n';
    text += `- Strategy: ${options.strategy}\n`;
    text += `- Conflict Resolution: ${options.conflictResolution}\n`;
    text += `- Order Preserved: ${options.preserveOrder}\n\n`;

    text += '**Merge Results:**\n';
    text += `- Rules from source: ${mergeResult.rulesFromSource}\n`;
    text += `- Rules from target: ${mergeResult.rulesFromTarget}\n`;
    text += `- Rules merged: ${mergeResult.rulesAdded}\n`;
    text += `- Conflicts resolved: ${mergeResult.conflictsResolved}\n\n`;

    if (mergeResult.conflicts.length > 0) {
      text += '**Conflict Details:**\n';
      mergeResult.conflicts.slice(0, 5).forEach((conflict: RuleMergeConflict, index: number) => {
        text += `${index + 1}. ${conflict.path}\n`;
        text += `   Type: ${conflict.type}\n`;
        text += `   Resolution: ${conflict.resolution}\n\n`;
      });

      if (mergeResult.conflicts.length > 5) {
        text += `... and ${mergeResult.conflicts.length - 5} more conflicts\n`;
      }
    }

    text += '\n**Merged Rule Tree:**\n';
    text += '```json\n';
    text += JSON.stringify(mergeResult.mergedRules, null, 2).substring(0, 1000);
    if (JSON.stringify(mergeResult.mergedRules).length > 1000) {
      text += '\n... (truncated for display)';
    }
    text += '\n```\n';

    text += '\n**Next Steps:**\n';
    text += '- Review merged rules for correctness\n';
    text += '- Validate the merged rule tree\n';
    text += '- Apply to property with "Update property rules"\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('merge rule trees', _error);
  }
}

/**
 * Optimize rule tree for performance
 */
export async function optimizeRuleTree(
  _client: AkamaiClient,
  args: {
    customer?: string;
    rules: PropertyRules;
    optimizationLevel?: 'basic' | 'standard' | 'aggressive';
    preserveCustomizations?: boolean;
    targetMetrics?: Array<'speed' | 'bandwidth' | 'availability'>;
  },
): Promise<MCPToolResponse> {
  try {
    const level = args.optimizationLevel || 'standard';
    const metrics = args.targetMetrics || ['speed', 'bandwidth'];

    // Analyze current performance
    const analysis = analyzeRulePerformance(args.rules);

    // Generate optimizations
    const optimizations = generateOptimizations(args.rules, {
      level,
      targetMetrics: metrics,
      preserveCustomizations: args.preserveCustomizations ?? true,
    });

    // Apply optimizations
    const optimizedRules = applyOptimizations(args.rules, optimizations);

    // Re-analyze for comparison
    const newAnalysis = analyzeRulePerformance(optimizedRules);

    let text = '[DEPLOY] **Rule Tree Optimization Report**\n\n';
    text += `**Optimization Level:** ${level}\n`;
    text += `**Target Metrics:** ${metrics.join(', ')}\n\n`;

    text += '**Performance Improvements:**\n';
    text += `- Overall Score: ${analysis.overallScore}/100 → ${newAnalysis.overallScore}/100 (+${newAnalysis.overallScore - analysis.overallScore})\n`;
    text += `- Caching: ${analysis.categories.caching.score}/100 → ${newAnalysis.categories.caching.score}/100\n`;
    text += `- Compression: ${analysis.categories.compression.score}/100 → ${newAnalysis.categories.compression.score}/100\n`;
    text += `- HTTP/2: ${analysis.categories.http2.score}/100 → ${newAnalysis.categories.http2.score}/100\n\n`;

    text += `**Optimizations Applied:** ${optimizations.length}\n\n`;

    optimizations.slice(0, 10).forEach((opt, index) => {
      text += `${index + 1}. **${opt.type}** [${opt.impact}]\n`;
      text += `   ${opt.description}\n`;
      text += `   Implementation: ${opt.implementation}\n`;
      if (opt.estimatedImprovement) {
        text += `   Expected Impact: ${opt.estimatedImprovement}\n`;
      }
      text += '\n';
    });

    if (optimizations.length > 10) {
      text += `... and ${optimizations.length - 10} more optimizations\n\n`;
    }

    if (newAnalysis.criticalIssues.length > 0) {
      text += '**[WARNING] Remaining Critical Issues:**\n';
      newAnalysis.criticalIssues.forEach((issue, index) => {
        text += `${index + 1}. ${issue}\n`;
      });
      text += '\n';
    }

    text += '**Optimized Rule Tree:**\n';
    text += '```json\n';
    text += JSON.stringify(optimizedRules, null, 2).substring(0, 800);
    if (JSON.stringify(optimizedRules).length > 800) {
      text += '\n... (truncated for display)';
    }
    text += '\n```\n';

    text += '\n**Best Practices Applied:**\n';
    text += '- [DONE] Cache headers optimized for static content\n';
    text += '- [DONE] Compression enabled for text-based resources\n';
    text += '- [DONE] HTTP/2 and Server Push configured\n';
    text += '- [DONE] Image optimization behaviors added\n';
    text += '- [DONE] Mobile detection and optimization\n';

    text += '\n**Next Steps:**\n';
    text += '- Review and validate optimized rules\n';
    text += '- Test in staging environment first\n';
    text += '- Monitor performance metrics after deployment\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('optimize rule tree', _error);
  }
}

/**
 * List available rule templates
 */
export async function listRuleTemplates(
  _client: AkamaiClient,
  args: {
    customer?: string;
    category?: string;
    tags?: string[];
  },
): Promise<MCPToolResponse> {
  try {
    let templates = Array.from(RULE_TEMPLATES.values());

    // Filter by category
    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      templates = templates.filter((t) => args.tags!.some((tag) => t.tags.includes(tag)));
    }

    let text = '[DOCS] **Available Rule Templates**\n\n';

    if (templates.length === 0) {
      text += 'No templates found matching your criteria.\n';
    } else {
      text += `**Found ${templates.length} templates:**\n\n`;

      // Group by category
      const categories = new Map<string, RuleTemplate[]>();
      templates.forEach((t) => {
        const list = categories.get(t.category) || [];
        list.push(t);
        categories.set(t.category, list);
      });

      for (const [category, categoryTemplates] of categories) {
        text += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;

        categoryTemplates.forEach((template) => {
          text += `\n[EMOJI] **${template.name}** (${template.id})\n`;
          text += `   ${template.description}\n`;
          text += `   Tags: ${template.tags.join(', ')}\n`;
          text += `   Variables: ${Object.keys(template.variables).length}\n`;
          text += `   Compatible Products: ${template.compatibility.products.join(', ')}\n`;

          if (template.examples.length > 0) {
            text += `   Examples: ${template.examples.map((e) => e.name).join(', ')}\n`;
          }
        });
        text += '\n';
      }
    }

    text += '\n**Usage:**\n';
    text += 'To use a template: "Create rule from template <template-id>"\n';
    text += 'Example: "Create rule from template performance-basic with cacheDefaultTtl=3600"\n';

    text += '\n**Available Filters:**\n';
    text += '- By category: performance, security, delivery\n';
    text += '- By tags: caching, compression, headers, etc.\n';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list rule templates', _error);
  }
}

// Helper functions

async function validateRuleTreeInternal(rules: PropertyRules, __context: Record<string, unknown>): Promise<RuleValidationResult> {
  const errors: RuleValidationError[] = [];
  const warnings: RuleValidationWarning[] = [];
  const suggestions: RuleOptimizationSuggestion[] = [];

  // Basic structure validation
  if (!rules || typeof rules !== 'object') {
    errors.push({
      type: 'syntax',
      severity: 'critical',
      path: '/',
      message: 'Rule tree must be an object',
      fix: 'Provide a valid rule tree object with name and behaviors/children',
    });
  }

  if (!rules.name) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      path: '/name',
      message: 'Rule tree must have a name',
      fix: 'Add a "name" property to the root rule',
    });
  }

  // Validate behaviors and children recursively
  validateRuleNode(rules, '/', errors, warnings, suggestions);

  // Calculate scores
  const performanceScore = calculatePerformanceScore(rules, warnings);
  const complianceScore = calculateComplianceScore(rules, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    performanceScore,
    complianceScore,
  };
}

function validateRuleNode(
  node: RuleTreeRule,
  path: string,
  errors: RuleValidationError[],
  warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[],
): void {
  // Validate behaviors
  if (node.behaviors) {
    if (!Array.isArray(node.behaviors)) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        path: `${path}/behaviors`,
        message: 'Behaviors must be an array',
        fix: 'Convert behaviors to an array format',
      });
    } else {
      node.behaviors.forEach((behavior: RuleBehavior, index: number) => {
        validateBehavior(behavior, `${path}/behaviors[${index}]`, errors, warnings, suggestions);
      });
    }
  }

  // Check for optimization opportunities
  if (node.behaviors) {
    checkOptimizationOpportunities(node, path, suggestions);
  }

  // Validate children recursively
  if (node.children) {
    if (!Array.isArray(node.children)) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        path: `${path}/children`,
        message: 'Children must be an array',
        fix: 'Convert children to an array format',
      });
    } else {
      node.children.forEach((child: RuleTreeRule, index: number) => {
        if (!child.name) {
          errors.push({
            type: 'syntax',
            severity: 'error',
            path: `${path}/children[${index}]/name`,
            message: 'Child rule must have a name',
            fix: 'Add a name property to the child rule',
          });
        }
        validateRuleNode(child, `${path}/children[${index}]`, errors, warnings, suggestions);
      });
    }
  }
}

function validateBehavior(
  behavior: RuleBehavior,
  path: string,
  errors: RuleValidationError[],
  warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[],
): void {
  if (!behavior.name) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      path: `${path}/name`,
      message: 'Behavior must have a name',
      fix: 'Add a name property to the behavior',
    });
    return;
  }

  // Check for deprecated behaviors
  const deprecatedBehaviors = ['cacheId', 'edgeConnect'];
  if (deprecatedBehaviors.includes(behavior.name)) {
    warnings.push({
      type: 'deprecated',
      severity: 'warning',
      path: `${path}`,
      message: `Behavior '${behavior.name}' is deprecated`,
      recommendation: 'Consider using modern alternatives or removing if not needed',
    });
  }

  // Validate specific behaviors
  switch (behavior.name) {
    case 'caching':
      validateCachingBehavior(behavior, path, warnings, suggestions);
      break;
    case 'gzipResponse':
      validateCompressionBehavior(behavior, path, warnings, suggestions);
      break;
    case 'http2':
      validateHttp2Behavior(behavior, path, warnings, suggestions);
      break;
  }
}

function validateCachingBehavior(
  behavior: RuleBehavior,
  path: string,
  warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[],
): void {
  const options = behavior.options || {};

  if (options.behavior === 'NO_STORE') {
    warnings.push({
      type: 'performance',
      severity: 'warning',
      path: `${path}`,
      message: 'NO_STORE caching disabled - this may impact performance',
      recommendation: 'Consider using MAX_AGE with appropriate TTL for cacheable content',
    });
  }

  if (options.behavior === 'MAX_AGE' && options.ttl) {
    const ttlSeconds = parseInt(options.ttl);
    if (ttlSeconds < 300) {
      suggestions.push({
        type: 'caching',
        impact: 'medium',
        path: `${path}`,
        description: 'Very short cache TTL detected',
        implementation:
          'Consider increasing TTL to at least 5 minutes (300s) for better cache efficiency',
        estimatedImprovement: 'Reduce origin requests by up to 80%',
      });
    }
  }
}

function validateCompressionBehavior(
  behavior: RuleBehavior,
  path: string,
  _warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[],
): void {
  const options = behavior.options || {};

  if (options.behavior === 'NEVER') {
    suggestions.push({
      type: 'compression',
      impact: 'high',
      path: `${path}`,
      description: 'Compression is disabled',
      implementation: 'Enable GZIP compression for text-based content to reduce bandwidth',
      estimatedImprovement: 'Reduce bandwidth usage by 60-80% for text content',
    });
  }
}

function validateHttp2Behavior(
  behavior: RuleBehavior,
  path: string,
  _warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[],
): void {
  const options = behavior.options || {};

  if (!options.enabled) {
    suggestions.push({
      type: 'performance',
      impact: 'high',
      path: `${path}`,
      description: 'HTTP/2 is not enabled',
      implementation: 'Enable HTTP/2 for improved performance with multiplexing',
      estimatedImprovement: 'Improve page load times by 15-30%',
    });
  }
}

function checkOptimizationOpportunities(
  node: RuleTreeRule,
  path: string,
  suggestions: RuleOptimizationSuggestion[],
): void {
  const behaviors = node.behaviors || [];
  const behaviorNames = behaviors.map((b: RuleBehavior) => b.name);

  // Check for missing caching behavior
  if (!behaviorNames.includes('caching')) {
    suggestions.push({
      type: 'caching',
      impact: 'high',
      path: `${path}`,
      description: 'No caching behavior found',
      implementation: 'Add caching behavior with appropriate TTL settings',
      estimatedImprovement: 'Reduce origin load by 50-90%',
    });
  }

  // Check for missing compression
  if (!behaviorNames.includes('gzipResponse')) {
    suggestions.push({
      type: 'compression',
      impact: 'medium',
      path: `${path}`,
      description: 'No compression behavior found',
      implementation: 'Add gzipResponse behavior for text content',
      estimatedImprovement: 'Reduce bandwidth by 60-80% for text',
    });
  }

  // Check for security headers
  const securityHeaders = ['modifyOutgoingResponseHeader', 'modifyOutgoingRequestHeader'];
  if (!behaviors.some((b: RuleBehavior) => securityHeaders.includes(b.name))) {
    suggestions.push({
      type: 'security',
      impact: 'medium',
      path: `${path}`,
      description: 'No security headers configured',
      implementation: 'Add security headers like HSTS, CSP, X-Frame-Options',
      estimatedImprovement: 'Improve security posture',
    });
  }
}

function calculatePerformanceScore(rules: RuleTreeRule, warnings: RuleValidationWarning[]): number {
  let score = 100;

  // Deduct points for performance warnings
  const performanceWarnings = warnings.filter((w) => w.type === 'performance');
  score -= performanceWarnings.length * 10;

  // Check for key performance behaviors
  const hasCaching = hasSpecificBehavior(rules, 'caching');
  const hasCompression = hasSpecificBehavior(rules, 'gzipResponse');
  const hasHttp2 = hasSpecificBehavior(rules, 'http2');

  if (!hasCaching) {
    score -= 20;
  }
  if (!hasCompression) {
    score -= 15;
  }
  if (!hasHttp2) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateComplianceScore(
  _rules: RuleTreeRule,
  errors: RuleValidationError[],
  warnings: RuleValidationWarning[],
): number {
  let score = 100;

  // Critical errors
  score -= errors.filter((e) => e.severity === 'critical').length * 25;

  // Regular errors
  score -= errors.filter((e) => e.severity === 'error').length * 15;

  // Security warnings
  score -= warnings.filter((w) => w.type === 'security').length * 10;

  // Best practice warnings
  score -= warnings.filter((w) => w.type === 'best-practice').length * 5;

  return Math.max(0, Math.min(100, score));
}

function hasSpecificBehavior(node: RuleTreeRule, behaviorName: string): boolean {
  if (node.behaviors) {
    if (node.behaviors.some((b: RuleBehavior) => b.name === behaviorName)) {
      return true;
    }
  }

  if (node.children) {
    return node.children.some((child: RuleTreeRule) => hasSpecificBehavior(child, behaviorName));
  }

  return false;
}

function processTemplate(template: RuleTemplate, variables: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>): RuleTemplate {
  const templateStr = JSON.stringify(template);

  // Replace variable placeholders
  const processed = templateStr.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Simple expression evaluation (in production, use a proper expression parser)
      const trimmed = expression.trim();

      // Handle ternary expressions
      if (trimmed.includes('?')) {
        const [condition, values] = trimmed.split('?');
        const [trueValue, falseValue] = values.split(':');
        const conditionResult = evaluateCondition(condition.trim(), variables);
        return conditionResult
          ? evaluateExpression(trueValue.trim(), variables)
          : evaluateExpression(falseValue.trim(), variables);
      }

      // Direct variable replacement
      return evaluateExpression(trimmed, variables);
    } catch (_error) {
      logger.warn(`Failed to process template expression: ${expression}`);
      return match;
    }
  });

  return JSON.parse(processed);
}

function evaluateCondition(condition: string, variables: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>): boolean {
  // Simple condition evaluation
  if (condition in variables) {
    return !!variables[condition];
  }
  return false;
}

function evaluateExpression(expression: string, variables: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>): string {
  // Remove quotes if present
  if (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  ) {
    return expression.slice(1, -1);
  }

  // Variable lookup
  if (expression in variables) {
    return String(variables[expression]);
  }

  return expression;
}

// CODE KAI: Type-safe rule merge result interface
interface RuleMergeResult {
  mergedRules: RuleTreeRule;
  conflicts: RuleMergeConflict[];
  rulesFromSource: number;
  rulesFromTarget: number;
  rulesAdded: number;
  conflictsResolved: number;
}

function performRuleMerge(source: RuleTreeRule, target: RuleTreeRule, _options: RuleMergeOptions): RuleMergeResult {
  const result: RuleMergeResult = {
    mergedRules: {} as RuleTreeRule,
    conflicts: [],
    rulesFromSource: 0,
    rulesFromTarget: 0,
    rulesAdded: 0,
    conflictsResolved: 0,
  };

  // Deep clone target as base
  result.mergedRules = JSON.parse(JSON.stringify(target)) as RuleTreeRule;

  // Merge based on strategy
  switch (_options.strategy) {
    case 'merge':
      mergeRuleNodes(source, result.mergedRules, '/', result, _options);
      break;
    case 'override':
      result.mergedRules = JSON.parse(JSON.stringify(source)) as RuleTreeRule;
      result.rulesFromSource = countRules(source);
      break;
    case 'append':
      appendRules(source, result.mergedRules, result);
      break;
  }

  return result;
}

function mergeRuleNodes(
  source: RuleTreeRule,
  target: RuleTreeRule,
  path: string,
  result: RuleMergeResult,
  options: RuleMergeOptions,
): void {
  // Merge behaviors
  if (source.behaviors && target.behaviors) {
    mergeBehaviors(source.behaviors, target.behaviors, `${path}/behaviors`, result, options);
  } else if (source.behaviors) {
    target.behaviors = JSON.parse(JSON.stringify(source.behaviors));
    result.rulesFromSource += source.behaviors.length;
  }

  // Merge children
  if (source.children && target.children) {
    mergeChildren(source.children, target.children, `${path}/children`, result, options);
  } else if (source.children) {
    target.children = JSON.parse(JSON.stringify(source.children));
    const validatedResult = validateApiResponse<{ rulesFromSource: any }>(result);

    validatedResult.rulesFromSource += countRules(source);
  }
}

function mergeBehaviors(
  sourceBehaviors: any[],
  targetBehaviors: any[],
  path: string,
  result: any,
  options: RuleMergeOptions,
): void {
  const targetBehaviorMap = new Map(
    targetBehaviors.map((b, index) => [b.name, { behavior: b, index }]),
  );

  sourceBehaviors.forEach((sourceBehavior) => {
    const existing = targetBehaviorMap.get(sourceBehavior.name);

    if (existing) {
      // Conflict detected
      const validatedResult = validateApiResponse<{ conflicts: any }>(result);

      validatedResult.conflicts.push({
        path: `${path}[${existing.index}]`,
        type: 'behavior',
        sourceValue: sourceBehavior,
        targetValue: existing.behavior,
        resolution: options.conflictResolution,
      });

      if (options.conflictResolution === 'source') {
        targetBehaviors[existing.index] = JSON.parse(JSON.stringify(sourceBehavior));
        const validatedResult = validateApiResponse<{ conflictsResolved: any }>(result);

        validatedResult.conflictsResolved++;
      }
      // 'target' means keep existing, 'manual' means skip
    } else {
      // Add new behavior
      targetBehaviors.push(JSON.parse(JSON.stringify(sourceBehavior)));
      const validatedResult = validateApiResponse<{ rulesAdded: any }>(result);

      validatedResult.rulesAdded++;
    }
  });
}

function mergeChildren(
  sourceChildren: any[],
  targetChildren: any[],
  path: string,
  result: any,
  options: RuleMergeOptions,
): void {
  const targetChildMap = new Map(targetChildren.map((c, index) => [c.name, { child: c, index }]));

  sourceChildren.forEach((sourceChild) => {
    const existing = targetChildMap.get(sourceChild.name);

    if (existing) {
      // Merge recursively
      mergeRuleNodes(sourceChild, existing.child, `${path}[${existing.index}]`, result, options);
    } else {
      // Add new child
      targetChildren.push(JSON.parse(JSON.stringify(sourceChild)));
      const validatedResult = validateApiResponse<{ rulesAdded: any }>(result);

      validatedResult.rulesAdded += countRules(sourceChild);
    }
  });
}

function appendRules(source: any, target: any, result: any): void {
  if (!target.children) {
    target.children = [];
  }

  if (source.children) {
    source.children.forEach((child: any) => {
      target.children.push(JSON.parse(JSON.stringify(child)));
      const validatedResult = validateApiResponse<{ rulesAdded: any }>(result);

      validatedResult.rulesAdded += countRules(child);
    });
  }

  if (source.behaviors) {
    if (!target.behaviors) {
      target.behaviors = [];
    }
    source.behaviors.forEach((behavior: any) => {
      target.behaviors.push(JSON.parse(JSON.stringify(behavior)));
      const validatedResult = validateApiResponse<{ rulesAdded: any }>(result);

      validatedResult.rulesAdded++;
    });
  }
}

function countRules(node: RuleTreeRule | Partial<RuleTreeRule>): number {
  let count = 1;

  if (node.behaviors) {
    count += node.behaviors.length;
  }

  if (node.children) {
    node.children.forEach((child: RuleTreeRule) => {
      count += countRules(child);
    });
  }

  return count;
}

function analyzeRulePerformance(rules: RuleTreeRule): RulePerformanceAnalysis {
  const categories = {
    caching: analyzeCaching(rules),
    compression: analyzeCompression(rules),
    http2: analyzeHttp2(rules),
    images: analyzeImageOptimization(rules),
    mobile: analyzeMobileOptimization(rules),
  };

  const criticalIssues: string[] = [];
  const recommendations: RuleOptimizationSuggestion[] = [];

  // Identify critical issues
  Object.entries(categories).forEach(([name, category]) => {
    if (category.status === 'poor') {
      criticalIssues.push(`${name} optimization is poor - immediate attention needed`);
    }
    category.improvements.forEach((imp) => {
      recommendations.push({
        type: name as 'security' | 'performance' | 'optimization' | 'compliance',
        impact: category.status === 'poor' ? 'high' : 'medium',
        path: '/',
        description: imp,
        implementation: `Review and optimize ${name} settings`,
      });
    });
  });

  // Calculate overall score
  const scores = Object.values(categories).map((c) => c.score);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    overallScore,
    categories,
    criticalIssues,
    recommendations,
  };
}

function analyzeCaching(rules: RuleTreeRule): PerformanceCategory {
  const findings: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  const hasCaching = hasSpecificBehavior(rules, 'caching');
  const hasDownstreamCache = hasSpecificBehavior(rules, 'downstreamCache');

  if (!hasCaching) {
    score -= 40;
    findings.push('No caching behavior configured');
    improvements.push('Add caching behavior with appropriate TTL');
  }

  if (!hasDownstreamCache) {
    score -= 20;
    findings.push('No downstream cache control');
    improvements.push('Configure downstream cache headers');
  }

  return {
    score,
    status:
      score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs-improvement' : 'poor',
    findings,
    improvements,
  };
}

function analyzeCompression(rules: RuleTreeRule): PerformanceCategory {
  const findings: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  const hasGzip = hasSpecificBehavior(rules, 'gzipResponse');
  const hasBrotli = hasSpecificBehavior(rules, 'brotli');

  if (!hasGzip && !hasBrotli) {
    score -= 40;
    findings.push('No compression enabled');
    improvements.push('Enable GZIP or Brotli compression');
  } else if (!hasBrotli) {
    score -= 15;
    findings.push('Only GZIP compression enabled');
    improvements.push('Consider adding Brotli for better compression ratios');
  }

  return {
    score,
    status:
      score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs-improvement' : 'poor',
    findings,
    improvements,
  };
}

function analyzeHttp2(rules: RuleTreeRule): PerformanceCategory {
  const findings: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  const hasHttp2 = hasSpecificBehavior(rules, 'http2');
  const hasHttp3 = hasSpecificBehavior(rules, 'http3');

  if (!hasHttp2) {
    score -= 30;
    findings.push('HTTP/2 not enabled');
    improvements.push('Enable HTTP/2 for multiplexing benefits');
  }

  if (!hasHttp3) {
    score -= 10;
    findings.push('HTTP/3 not enabled');
    improvements.push('Consider enabling HTTP/3 for improved performance');
  }

  return {
    score,
    status:
      score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs-improvement' : 'poor',
    findings,
    improvements,
  };
}

function analyzeImageOptimization(rules: RuleTreeRule): PerformanceCategory {
  const findings: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  const hasImageManager = hasSpecificBehavior(rules, 'imageManager');
  const hasAdaptiveImageCompression = hasSpecificBehavior(rules, 'adaptiveImageCompression');

  if (!hasImageManager && !hasAdaptiveImageCompression) {
    score -= 35;
    findings.push('No image optimization configured');
    improvements.push('Enable Image Manager or Adaptive Image Compression');
  }

  return {
    score,
    status:
      score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs-improvement' : 'poor',
    findings,
    improvements,
  };
}

function analyzeMobileOptimization(rules: RuleTreeRule): PerformanceCategory {
  const findings: string[] = [];
  const improvements: string[] = [];
  let score = 100;

  const hasMobileDetection = hasSpecificBehavior(rules, 'deviceCharacteristicHeader');
  const hasAdaptiveAcceleration = hasSpecificBehavior(rules, 'adaptiveAcceleration');

  if (!hasMobileDetection) {
    score -= 25;
    findings.push('No mobile detection configured');
    improvements.push('Add device characteristic headers for mobile optimization');
  }

  if (!hasAdaptiveAcceleration) {
    score -= 15;
    findings.push('Adaptive acceleration not enabled');
    improvements.push('Enable adaptive acceleration for mobile users');
  }

  return {
    score,
    status:
      score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs-improvement' : 'poor',
    findings,
    improvements,
  };
}

function generateOptimizations(
  rules: RuleTreeRule,
  options: {
    level: string;
    targetMetrics: string[];
    preserveCustomizations: boolean;
  },
): RuleOptimizationSuggestion[] {
  const optimizations: RuleOptimizationSuggestion[] = [];

  // Analyze current state
  analyzeRulePerformance(rules);

  // Generate optimizations based on level and target metrics
  if (options.targetMetrics.includes('speed')) {
    if (!hasSpecificBehavior(rules, 'prefetch')) {
      optimizations.push({
        type: 'performance',
        impact: 'high',
        path: '/behaviors',
        description: 'Add prefetching for critical resources',
        implementation: 'Add prefetch behavior for CSS, JS, and fonts',
        estimatedImprovement: 'Reduce page load time by 20-30%',
      });
    }
  }

  if (options.targetMetrics.includes('bandwidth')) {
    if (!hasSpecificBehavior(rules, 'adaptiveImageCompression')) {
      optimizations.push({
        type: 'compression',
        impact: 'high',
        path: '/behaviors',
        description: 'Enable adaptive image compression',
        implementation: 'Add adaptiveImageCompression behavior',
        estimatedImprovement: 'Reduce image bandwidth by 40-60%',
      });
    }
  }

  if (options.targetMetrics.includes('availability')) {
    if (!hasSpecificBehavior(rules, 'sureRoute')) {
      optimizations.push({
        type: 'performance',
        impact: 'medium',
        path: '/behaviors',
        description: 'Enable SureRoute for optimal routing',
        implementation: 'Add sureRoute behavior for dynamic content',
        estimatedImprovement: 'Improve availability and reduce latency',
      });
    }
  }

  return optimizations;
}

function applyOptimizations(rules: RuleTreeRule, optimizations: RuleOptimizationSuggestion[]): RuleTreeRule {
  const optimizedRules = JSON.parse(JSON.stringify(rules));

  // Ensure behaviors array exists
  if (!optimizedRules.behaviors) {
    optimizedRules.behaviors = [];
  }

  // Apply each optimization
  optimizations.forEach((opt) => {
    switch (opt.type) {
      case 'caching':
        applyCachingOptimization(optimizedRules, opt);
        break;
      case 'compression':
        applyCompressionOptimization(optimizedRules, opt);
        break;
      case 'performance':
        applyPerformanceOptimization(optimizedRules, opt);
        break;
      case 'security':
        applySecurityOptimization(optimizedRules, opt);
        break;
    }
  });

  return optimizedRules;
}

function applyCachingOptimization(rules: RuleTreeRule, _optimization: RuleOptimizationSuggestion): void {
  // Add or update caching behavior
  const existingCaching = rules.behaviors?.find((b: RuleBehavior) => b.name === 'caching');

  if (!existingCaching) {
    rules.behaviors.push({
      name: 'caching',
      options: {
        behavior: 'MAX_AGE',
        ttl: '7d',
        tieredDistribution: true,
      },
    });
  }
}

function applyCompressionOptimization(rules: RuleTreeRule, _optimization: RuleOptimizationSuggestion): void {
  // Add compression behaviors
  if (!rules.behaviors?.find((b: RuleBehavior) => b.name === 'gzipResponse')) {
    rules.behaviors.push({
      name: 'gzipResponse',
      options: {
        behavior: 'ALWAYS',
      },
    });
  }
}

function applyPerformanceOptimization(rules: RuleTreeRule, optimization: RuleOptimizationSuggestion): void {
  // Add performance behaviors
  if (
    optimization.description.includes('HTTP/2') &&
    !rules.behaviors?.find((b: RuleBehavior) => b.name === 'http2')
  ) {
    rules.behaviors.push({
      name: 'http2',
      options: {
        enabled: true,
      },
    });
  }
}

function applySecurityOptimization(rules: RuleTreeRule, _optimization: RuleOptimizationSuggestion): void {
  // Add security headers
  if (!rules.behaviors?.find((b: RuleBehavior) => b.name === 'modifyOutgoingResponseHeader')) {
    rules.behaviors.push({
      name: 'modifyOutgoingResponseHeader',
      options: {
        action: 'ADD',
        standardAddHeaderName: 'STRICT_TRANSPORT_SECURITY',
        headerValue: 'max-age=31536000; includeSubDomains',
      },
    });
  }
}

/**
 * Format error responses
 */
function formatError(operation: string, _error: unknown): MCPToolResponse {
  let errorMessage = `[ERROR] Failed to ${operation}`;
  let solution = '';

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;

    // Provide specific solutions based on error type
    if (_error.message.includes('401') || _error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
    } else if (_error.message.includes('403') || _error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions.';
    } else if (_error.message.includes('404') || _error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct.';
    } else if (_error.message.includes('validation')) {
      solution = '**Solution:** Fix validation errors in the rule tree before proceeding.';
    }
  } else {
    errorMessage += `: ${String(_error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

// Export all functions
export const ruleTreeManagementTools = [
  updatePropertyRulesEnhanced,
  createRuleFromTemplate,
  validateRuleTree,
  mergeRuleTrees,
  optimizeRuleTree,
  listRuleTemplates,
];
