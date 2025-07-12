/**
 * Advanced Rule Tree Management System
 * 
 * Provides comprehensive rule tree manipulation, validation, and optimization capabilities
 * for Akamai Property Manager configurations.
 */

import { AkamaiOperation } from '../common/akamai-operation';
import type { AkamaiClient } from '../../akamai-client';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import { createLogger } from '../../utils/pino-logger';
import { z } from 'zod';
import {
  RuleTreeSchemas,
  RuleTreeEndpoints,
  formatRuleTreeValidationResponse,
  formatRuleTreeOptimizationResponse,
  formatRuleMergeResponse,
  formatRuleTreePerformanceAnalysis,
  formatRuleTemplatesResponse
} from './api';
import type {
  RuleTreeRule,
  RuleBehavior,
  RuleCriterion,
  PropertyRules,
  RuleValidationResult,
  RuleValidationError,
  RuleValidationWarning,
  RuleOptimizationSuggestion,
  RuleStatistics,
  RuleTemplate,
  RuleTemplateVariable,
  RuleTemplateExample,
  RuleMergeOptions,
  RuleMergeResult,
  RuleMergeConflict,
  RulePerformanceAnalysis,
  PerformanceCategory,
  RuleConflict
} from './types';

const logger = createLogger('rule-tree-management');

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
      version: '1.0.0',
      author: 'Akamai',
      lastUpdated: '2024-01-15',
      variables: {
        cacheDefaultTtl: {
          name: 'cacheDefaultTtl',
          type: 'number',
          description: 'Default cache TTL in seconds',
          default: 86400,
          required: false,
          validation: {
            min: 0,
            max: 31536000
          }
        },
        enableGzip: {
          name: 'enableGzip',
          type: 'boolean',
          description: 'Enable GZIP compression',
          default: true,
          required: false
        }
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
                  ttl: '{{cacheDefaultTtl}}s'
                }
              }
            ]
          },
          {
            name: 'Compression',
            behaviors: [
              {
                name: 'gzipResponse',
                options: {
                  behavior: '{{enableGzip ? "ALWAYS" : "NEVER"}}'
                }
              }
            ]
          }
        ]
      },
      examples: [
        {
          name: 'Standard Web',
          description: 'Standard web application settings',
          variables: {
            cacheDefaultTtl: 86400,
            enableGzip: true
          }
        }
      ],
      compatibility: {
        products: ['prd_fresca', 'prd_Site_Accel'],
        ruleFormats: ['v2023-01-05', 'v2023-05-30']
      }
    }
  ],
  [
    'security-headers',
    {
      id: 'security-headers',
      name: 'Security Headers',
      description: 'Comprehensive security headers for web applications',
      category: 'security',
      tags: ['security', 'headers', 'compliance'],
      version: '1.0.0',
      author: 'Akamai',
      lastUpdated: '2024-01-15',
      variables: {
        enableHsts: {
          name: 'enableHsts',
          type: 'boolean',
          description: 'Enable HSTS header',
          default: true,
          required: false
        },
        hstsMaxAge: {
          name: 'hstsMaxAge',
          type: 'number',
          description: 'HSTS max age in seconds',
          default: 31536000,
          required: false
        },
        contentSecurityPolicy: {
          name: 'contentSecurityPolicy',
          type: 'string',
          description: 'CSP header value',
          default: "default-src 'self'",
          required: false
        }
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
              avoidDuplicateHeaders: true
            }
          },
          {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              customHeaderName: 'Content-Security-Policy',
              headerValue: '{{contentSecurityPolicy}}',
              avoidDuplicateHeaders: true
            }
          }
        ]
      },
      examples: [
        {
          name: 'Strict Security',
          description: 'Strict security settings',
          variables: {
            enableHsts: true,
            hstsMaxAge: 63072000,
            contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
          }
        }
      ],
      compatibility: {
        products: ['prd_fresca', 'prd_Site_Accel', 'prd_Web_App_Accel'],
        ruleFormats: ['v2023-01-05', 'v2023-05-30']
      }
    }
  ]
]);

/**
 * Enhanced update property rules with pre-validation and optimization
 */
export async function updatePropertyRulesEnhanced(
  client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.updateEnhanced>
): Promise<MCPToolResponse> {
  try {
    // Pre-validation
    const validation = await validateRuleTreeInternal(args.rules as any, {
      propertyId: args.propertyId,
      version: args.version,
      includeOptimizations: args.autoOptimize || false
    });

    if (!validation.isValid && !args.validateOnly) {
      return {
        content: [
          {
            type: 'text',
            text: formatRuleTreeValidationResponse(validation)
          }
        ]
      };
    }

    // Apply auto-optimization if requested
    let optimizedRules = args.rules;
    if (args.autoOptimize && validation.suggestions.length > 0) {
      optimizedRules = applyOptimizations(args.rules as any, validation.suggestions) as any;
    }

    if (args.validateOnly || args.dryRun) {
      return {
        content: [
          {
            type: 'text',
            text: formatRuleTreeValidationResponse(validation)
          }
        ]
      };
    }

    // Update rules
    await client.request({
      method: 'PUT',
      path: RuleTreeEndpoints.updateRules(args.propertyId, args.version),
      headers: {
        'Content-Type': 'application/vnd.akamai.papirules.latest+json'
      },
      queryParams: {
        contractId: args.contractId,
        groupId: args.groupId,
        validateRules: 'true'
      },
      body: {
        rules: optimizedRules
      }
    });

    let text = `## Property Rules Updated Successfully\n\n`;
    text += `Property: ${args.propertyId}\n`;
    text += `Version: ${args.version}\n`;

    if (args.autoOptimize && validation.suggestions.length > 0) {
      text += `\n**Optimizations Applied:** ${validation.suggestions.length}\n`;
    }

    text += '\n**Validation Results:**\n';
    text += `- Performance Score: ${validation.performanceScore}/100\n`;
    text += `- Compliance Score: ${validation.complianceScore}/100\n`;

    return {
      content: [
        {
          type: 'text',
          text
        }
      ]
    };
  } catch (error) {
    return formatError('update property rules with validation', error);
  }
}

/**
 * Create rule tree from template
 */
export async function createRuleFromTemplate(
  _client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.createFromTemplate>
): Promise<MCPToolResponse> {
  try {
    const template = RULE_TEMPLATES.get(args.templateId);

    if (!template) {
      const availableTemplates = Array.from(RULE_TEMPLATES.keys());
      return {
        content: [
          {
            type: 'text',
            text: `Template '${args.templateId}' not found.\n\nAvailable templates:\n${availableTemplates.map((t) => `- ${t}`).join('\n')}`
          }
        ]
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
              text: `Required variable '${varName}' not provided.\n\nRequired variables:\n${Object.entries(
                template.variables
              )
                .filter(([_, v]) => v.required)
                .map(([k, v]) => `- ${k}: ${v.description}`)
                .join('\n')}`
            }
          ]
        };
      }

      if (!(varName in variables) && varDef.default !== undefined) {
        variables[varName] = varDef.default;
      }
    }

    // Process template with variables
    const processedRuleTree = processTemplate(template.ruleTree as any, variables);

    if (args.validate) {
      const validation = await validateRuleTreeInternal(processedRuleTree as any, {
        includeOptimizations: true
      });

      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: `Generated rule tree validation failed.\n\nErrors:\n${validation.errors.map((e) => `- ${e.message}`).join('\n')}`
            }
          ]
        };
      }
    }

    let text = `## Rule Tree Created from Template\n\n`;
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

    return {
      content: [
        {
          type: 'text',
          text
        }
      ]
    };
  } catch (error) {
    return formatError('create rule from template', error);
  }
}

/**
 * Validate rule tree with comprehensive analysis
 */
export async function validateRuleTree(
  _client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.validate>
): Promise<MCPToolResponse> {
  try {
    const validation = await validateRuleTreeInternal(args.rules, {
      propertyId: args.propertyId,
      version: args.version,
      includeOptimizations: args.includeOptimizations || false,
      includePerformance: args.includePerformance || false
    });

    return {
      content: [
        {
          type: 'text',
          text: formatRuleTreeValidationResponse(validation)
        }
      ]
    };
  } catch (error) {
    return formatError('validate rule tree', error);
  }
}

/**
 * Merge rule trees with conflict resolution
 */
export async function mergeRuleTrees(
  _client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.merge>
): Promise<MCPToolResponse> {
  try {
    const options: RuleMergeOptions = {
      strategy: 'merge',
      conflictResolution: 'manual',
      preserveOrder: true,
      validateResult: true,
      ...args.options
    };

    const mergeResult = performRuleMerge(args.sourceRules as any, args.targetRules as any, options);

    if (options.validateResult) {
      const validation = await validateRuleTreeInternal(mergeResult.mergedRules as any, {
        propertyId: args.propertyContext?.propertyId,
        version: args.propertyContext?.version,
        includeOptimizations: false
      });

      if (!validation.isValid) {
        let text = `## Rule Merge Completed with Validation Issues\n\n`;
        text += `**Merge Summary:**\n`;
        text += `- Rules merged: ${mergeResult.rulesAdded}\n`;
        text += `- Conflicts resolved: ${mergeResult.conflictsResolved}\n`;
        text += `- Validation errors: ${validation.errors.length}\n\n`;

        text += '**Validation Errors:**\n';
        validation.errors.slice(0, 5).forEach((error, index) => {
          text += `${index + 1}. ${error.message}\n`;
        });

        return {
          content: [
            {
              type: 'text',
              text
            }
          ]
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: formatRuleMergeResponse({ ...mergeResult, options })
        }
      ]
    };
  } catch (error) {
    return formatError('merge rule trees', error);
  }
}

/**
 * Optimize rule tree for performance
 */
export async function optimizeRuleTree(
  _client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.optimize>
): Promise<MCPToolResponse> {
  try {
    const level = args.optimizationLevel || 'standard';
    const metrics = args.targetMetrics || ['speed', 'bandwidth'];

    // Analyze current performance
    const analysis = analyzeRulePerformance(args.rules as any);

    // Generate optimizations
    const optimizations = generateOptimizations(args.rules as any, {
      level,
      targetMetrics: metrics,
      preserveCustomizations: args.preserveCustomizations ?? true
    });

    // Apply optimizations
    const optimizedRules = applyOptimizations(args.rules as any, optimizations);

    // Re-analyze for comparison
    const newAnalysis = analyzeRulePerformance(optimizedRules);

    return {
      content: [
        {
          type: 'text',
          text: formatRuleTreeOptimizationResponse({
            level,
            metrics,
            analysis,
            newAnalysis,
            optimizations,
            optimizedRules
          })
        }
      ]
    };
  } catch (error) {
    return formatError('optimize rule tree', error);
  }
}

/**
 * List available rule templates
 */
export async function listRuleTemplates(
  _client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.listTemplates>
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

    return {
      content: [
        {
          type: 'text',
          text: formatRuleTemplatesResponse(templates)
        }
      ]
    };
  } catch (error) {
    return formatError('list rule templates', error);
  }
}

/**
 * Analyze rule tree for optimization opportunities
 */
export async function analyzeRuleTreePerformance(
  client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.analyzePerformance>
): Promise<MCPToolResponse> {
  try {
    let rules = args.rules;
    let propertyName = 'Unknown';
    let version = args.version;

    // Fetch rules if not provided
    if (!rules && args.propertyId) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET'
      });

      const property = (propertyResponse as any).properties?.items?.[0];
      if (!property) {
        throw new Error('Property not found');
      }

      propertyName = property.propertyName;
      version = version || property.latestVersion || 1;

      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET'
      });

      rules = (rulesResponse as any).rules;
    }

    // Analyze performance
    const analysis = performRuleTreeAnalysis(rules);

    return {
      content: [
        {
          type: 'text',
          text: formatRuleTreePerformanceAnalysis(analysis)
        }
      ]
    };
  } catch (error) {
    return formatError('analyze rule tree performance', error);
  }
}

/**
 * Detect conflicts between rules
 */
export async function detectRuleConflicts(
  client: AkamaiClient,
  args: z.infer<typeof RuleTreeSchemas.detectConflicts>
): Promise<MCPToolResponse> {
  try {
    let rules = args.rules;

    if (!rules && args.propertyId) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET'
      });

      const property = (propertyResponse as any).properties?.items?.[0];
      if (!property) {
        throw new Error('Property not found');
      }

      const version = args.version || property.latestVersion || 1;
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET'
      });

      rules = (rulesResponse as any).rules;
    }

    // Detect conflicts
    const conflicts = detectRuleConflictsInternal(rules);

    let text = `## Rule Conflict Analysis\n\n`;
    text += `**Total Conflicts Found:** ${conflicts.length}\n\n`;

    if (conflicts.length === 0) {
      text += 'No conflicts detected in the rule tree!\n\n';
      text += 'The rule configuration appears to be consistent and conflict-free.\n';
    } else {
      // Group conflicts by severity
      const highSeverity = conflicts.filter((c) => c.severity === 'HIGH');
      const mediumSeverity = conflicts.filter((c) => c.severity === 'MEDIUM');
      const lowSeverity = conflicts.filter((c) => c.severity === 'LOW');

      if (highSeverity.length > 0) {
        text += `### High Severity Conflicts (${highSeverity.length})\n`;
        highSeverity.forEach((conflict, idx) => {
          text += `${idx + 1}. **${conflict.type}**\n`;
          text += `   - **Description:** ${conflict.description}\n`;
          text += `   - **Location 1:** \`${conflict.path1}\`\n`;
          text += `   - **Location 2:** \`${conflict.path2}\`\n`;
          text += `   - **Resolution:** ${conflict.resolution}\n`;
        });
        text += '\n';
      }

      if (mediumSeverity.length > 0) {
        text += `### Medium Severity Conflicts (${mediumSeverity.length})\n`;
        mediumSeverity.forEach((conflict, idx) => {
          text += `${idx + 1}. **${conflict.type}**\n`;
          text += `   - **Description:** ${conflict.description}\n`;
          text += `   - **Locations:** \`${conflict.path1}\`, \`${conflict.path2}\`\n`;
          text += `   - **Recommendation:** ${conflict.resolution}\n`;
        });
        text += '\n';
      }

      if (lowSeverity.length > 0) {
        text += `### Low Severity Conflicts (${lowSeverity.length})\n`;
        lowSeverity.forEach((conflict, idx) => {
          text += `${idx + 1}. **${conflict.type}**: ${conflict.description}\n`;
        });
        text += '\n';
      }
    }

    return {
      content: [
        {
          type: 'text',
          text
        }
      ]
    };
  } catch (error) {
    return formatError('detect rule conflicts', error);
  }
}

// Import additional functions from property-manager-rules-tools.ts
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

// Helper functions

async function validateRuleTreeInternal(rules: PropertyRules, context: Record<string, unknown>): Promise<RuleValidationResult> {
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
      fix: 'Provide a valid rule tree object with name and behaviors/children'
    });
  }

  if (!(rules as any).name) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      path: '/name',
      message: 'Rule tree must have a name',
      fix: 'Add a "name" property to the root rule'
    });
  }

  // Validate behaviors and children recursively
  validateRuleNode(rules as any, '/', errors, warnings, suggestions);

  // Calculate scores
  const performanceScore = calculatePerformanceScore(rules as any, warnings);
  const complianceScore = calculateComplianceScore(rules as any, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    performanceScore,
    complianceScore
  };
}

function validateRuleNode(
  node: RuleTreeRule,
  path: string,
  errors: RuleValidationError[],
  warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[]
): void {
  // Validate behaviors
  if (node.behaviors) {
    if (!Array.isArray(node.behaviors)) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        path: `${path}/behaviors`,
        message: 'Behaviors must be an array',
        fix: 'Convert behaviors to an array format'
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
        fix: 'Convert children to an array format'
      });
    } else {
      node.children.forEach((child: RuleTreeRule, index: number) => {
        if (!child.name) {
          errors.push({
            type: 'syntax',
            severity: 'error',
            path: `${path}/children[${index}]/name`,
            message: 'Child rule must have a name',
            fix: 'Add a name property to the child rule'
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
  suggestions: RuleOptimizationSuggestion[]
): void {
  if (!behavior.name) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      path: `${path}/name`,
      message: 'Behavior must have a name',
      fix: 'Add a name property to the behavior'
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
      recommendation: 'Consider using modern alternatives or removing if not needed'
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
  suggestions: RuleOptimizationSuggestion[]
): void {
  const options = behavior.options || {};

  if (options['behavior'] === 'NO_STORE') {
    warnings.push({
      type: 'performance',
      severity: 'warning',
      path: `${path}`,
      message: 'NO_STORE caching disabled - this may impact performance',
      recommendation: 'Consider using MAX_AGE with appropriate TTL for cacheable content'
    });
  }

  if (options['behavior'] === 'MAX_AGE' && options['ttl']) {
    const ttlSeconds = parseInt(String(options['ttl'] || '0'));
    if (ttlSeconds < 300) {
      suggestions.push({
        type: 'caching',
        impact: 'medium',
        path: `${path}`,
        description: 'Very short cache TTL detected',
        implementation:
          'Consider increasing TTL to at least 5 minutes (300s) for better cache efficiency',
        estimatedImprovement: 'Reduce origin requests by up to 80%'
      });
    }
  }
}

function validateCompressionBehavior(
  behavior: RuleBehavior,
  path: string,
  _warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[]
): void {
  const options = behavior.options || {};

  if (options['behavior'] === 'NEVER') {
    suggestions.push({
      type: 'compression',
      impact: 'high',
      path: `${path}`,
      description: 'Compression is disabled',
      implementation: 'Enable GZIP compression for text-based content to reduce bandwidth',
      estimatedImprovement: 'Reduce bandwidth usage by 60-80% for text content'
    });
  }
}

function validateHttp2Behavior(
  behavior: RuleBehavior,
  path: string,
  _warnings: RuleValidationWarning[],
  suggestions: RuleOptimizationSuggestion[]
): void {
  const options = behavior.options || {};

  if (!options['enabled']) {
    suggestions.push({
      type: 'performance',
      impact: 'high',
      path: `${path}`,
      description: 'HTTP/2 is not enabled',
      implementation: 'Enable HTTP/2 for improved performance with multiplexing',
      estimatedImprovement: 'Improve page load times by 15-30%'
    });
  }
}

function checkOptimizationOpportunities(
  node: RuleTreeRule,
  path: string,
  suggestions: RuleOptimizationSuggestion[]
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
      estimatedImprovement: 'Reduce origin load by 50-90%'
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
      estimatedImprovement: 'Reduce bandwidth by 60-80% for text'
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
      estimatedImprovement: 'Improve security posture'
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
  warnings: RuleValidationWarning[]
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

function performRuleMerge(source: RuleTreeRule, target: RuleTreeRule, options: RuleMergeOptions): RuleMergeResult {
  const result: RuleMergeResult = {
    mergedRules: {} as RuleTreeRule,
    conflicts: [],
    rulesFromSource: 0,
    rulesFromTarget: 0,
    rulesAdded: 0,
    conflictsResolved: 0
  };

  // Deep clone target as base
  result.mergedRules = JSON.parse(JSON.stringify(target)) as RuleTreeRule;

  // Merge based on strategy
  switch (options.strategy) {
    case 'merge':
      mergeRuleNodes(source, result.mergedRules, '/', result, options);
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
  options: RuleMergeOptions
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
    result.rulesFromSource += countRules(source);
  }
}

function mergeBehaviors(
  sourceBehaviors: any[],
  targetBehaviors: any[],
  path: string,
  result: any,
  options: RuleMergeOptions
): void {
  const targetBehaviorMap = new Map(
    targetBehaviors.map((b, index) => [b.name, { behavior: b, index }])
  );

  sourceBehaviors.forEach((sourceBehavior) => {
    const existing = targetBehaviorMap.get(sourceBehavior.name);

    if (existing) {
      // Conflict detected
      result.conflicts.push({
        path: `${path}[${existing.index}]`,
        type: 'behavior',
        sourceValue: sourceBehavior,
        targetValue: existing.behavior,
        resolution: options.conflictResolution
      });

      if (options.conflictResolution === 'source') {
        targetBehaviors[existing.index] = JSON.parse(JSON.stringify(sourceBehavior));
        result.conflictsResolved++;
      }
      // 'target' means keep existing, 'manual' means skip
    } else {
      // Add new behavior
      targetBehaviors.push(JSON.parse(JSON.stringify(sourceBehavior)));
      result.rulesAdded++;
    }
  });
}

function mergeChildren(
  sourceChildren: any[],
  targetChildren: any[],
  path: string,
  result: any,
  options: RuleMergeOptions
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
      result.rulesAdded += countRules(sourceChild);
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
      result.rulesAdded += countRules(child);
    });
  }

  if (source.behaviors) {
    if (!target.behaviors) {
      target.behaviors = [];
    }
    source.behaviors.forEach((behavior: any) => {
      target.behaviors.push(JSON.parse(JSON.stringify(behavior)));
      result.rulesAdded++;
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
    mobile: analyzeMobileOptimization(rules)
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
        type: (name === 'optimization' ? 'caching' : name) as 'security' | 'performance' | 'consolidation' | 'reordering' | 'caching' | 'compression',
        impact: category.status === 'poor' ? 'high' : 'medium',
        path: '/',
        description: imp,
        implementation: `Review and optimize ${name} settings`
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
    recommendations
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
    improvements
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
    improvements
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
    improvements
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
    improvements
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
    improvements
  };
}

function generateOptimizations(
  rules: RuleTreeRule,
  options: {
    level: string;
    targetMetrics: string[];
    preserveCustomizations: boolean;
  }
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
        estimatedImprovement: 'Reduce page load time by 20-30%'
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
        estimatedImprovement: 'Reduce image bandwidth by 40-60%'
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
        estimatedImprovement: 'Improve availability and reduce latency'
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

  if (!existingCaching && rules.behaviors) {
    rules.behaviors?.push({
      name: 'caching',
      options: {
        behavior: 'MAX_AGE',
        ttl: '7d',
        tieredDistribution: true
      }
    });
  }
}

function applyCompressionOptimization(rules: RuleTreeRule, _optimization: RuleOptimizationSuggestion): void {
  // Add compression behaviors
  if (!rules.behaviors?.find((b: RuleBehavior) => b.name === 'gzipResponse')) {
    rules.behaviors?.push({
      name: 'gzipResponse',
      options: {
        behavior: 'ALWAYS'
      }
    });
  }
}

function applyPerformanceOptimization(rules: RuleTreeRule, optimization: RuleOptimizationSuggestion): void {
  // Add performance behaviors
  if (
    optimization.description.includes('HTTP/2') &&
    !rules.behaviors?.find((b: RuleBehavior) => b.name === 'http2')
  ) {
    rules.behaviors?.push({
      name: 'http2',
      options: {
        enabled: true
      }
    });
  }
}

function applySecurityOptimization(rules: RuleTreeRule, _optimization: RuleOptimizationSuggestion): void {
  // Add security headers
  if (!rules.behaviors?.find((b: RuleBehavior) => b.name === 'modifyOutgoingResponseHeader')) {
    rules.behaviors?.push({
      name: 'modifyOutgoingResponseHeader',
      options: {
        action: 'ADD',
        standardAddHeaderName: 'STRICT_TRANSPORT_SECURITY',
        headerValue: 'max-age=31536000; includeSubDomains'
      }
    });
  }
}

function detectRuleConflictsInternal(rules: any): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const behaviorMap = new Map<string, string[]>();

  // Build behavior location map
  function mapBehaviors(rule: any, path: string) {
    if (rule.behaviors) {
      rule.behaviors.forEach((behavior: any, index: number) => {
        const behaviorPath = `${path}/behaviors[${index}]`;
        if (!behaviorMap.has(behavior.name)) {
          behaviorMap.set(behavior.name, []);
        }
        behaviorMap.get(behavior.name)!.push(behaviorPath);
      });
    }

    if (rule.children) {
      rule.children.forEach((child: any, index: number) => {
        mapBehaviors(child, `${path}/children[${index}]`);
      });
    }
  }

  mapBehaviors(rules, '');

  // Check for conflicting behaviors
  const conflictingBehaviors = [
    ['caching', 'noStore'],
    ['gzipResponse', 'brotli']
  ];

  conflictingBehaviors.forEach(([behavior1, behavior2]) => {
    const paths1 = behaviorMap.get(behavior1) || [];
    const paths2 = behaviorMap.get(behavior2) || [];

    if (paths1.length > 0 && paths2.length > 0) {
      conflicts.push({
        type: 'BEHAVIOR_CONFLICT',
        severity: 'HIGH',
        path1: paths1[0] || '',
        path2: paths2[0] || '',
        description: `Conflicting behaviors: ${behavior1} and ${behavior2}`,
        resolution: 'Remove one of the conflicting behaviors'
      });
    }
  });

  // Check for ordering issues
  const orderDependencies: Record<string, string[]> = {
    modifyOutgoingResponseHeader: ['caching', 'gzipResponse'],
    gzipResponse: ['caching']
  };

  Object.entries(orderDependencies).forEach(([dependent, requirements]) => {
    const dependentPaths = behaviorMap.get(dependent) || [];

    dependentPaths.forEach((depPath) => {
      requirements.forEach((req) => {
        const reqPaths = behaviorMap.get(req) || [];
        const validReqPath = reqPaths.find((rPath) => {
          // Check if requirement is in same rule or parent
          return rPath.startsWith(depPath.substring(0, depPath.lastIndexOf('/')));
        });

        if (!validReqPath) {
          conflicts.push({
            type: 'ORDERING_ISSUE',
            severity: 'MEDIUM',
            path1: depPath,
            path2: '',
            description: `${dependent} requires ${req} to be configured first`,
            resolution: `Add ${req} behavior before ${dependent}`
          });
        }
      });
    });
  });

  return conflicts;
}

function performRuleTreeAnalysis(rules: any): any {
  const analysis = {
    complexity: 0,
    cacheEfficiency: 0,
    redundancy: 0,
    optimizationPotential: 0,
    criticalFindings: [] as any[],
    bottlenecks: [] as any[],
    caching: {
      staticCoverage: 0,
      dynamicStrategy: 'Not configured',
      ttlOptimization: 'Not analyzed',
      cacheKeyEfficiency: 'Standard'
    },
    recommendations: [] as any[],
    efficiency: {
      default: 0,
      pathBased: 0,
      custom: 0,
      overall: 0
    }
  };

  // Calculate metrics
  const stats = calculateRuleStatistics(rules);
  analysis.complexity = stats.complexityScore;

  // Analyze caching
  let totalRules = 0;
  let rulesWithCaching = 0;
  let staticRules = 0;

  function analyzeCaching(rule: any) {
    totalRules++;

    const hasCaching = rule.behaviors?.some((b: any) => b.name === 'caching');
    if (hasCaching) {
      rulesWithCaching++;
    }

    const pathCriteria = rule.criteria?.find((c: any) => c.name === 'path');
    if (
      pathCriteria?.options?.values?.some((v: string) =>
        /\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/.test(v)
      )
    ) {
      staticRules++;
    }

    if (rule.children) {
      rule.children.forEach((child: any) => analyzeCaching(child));
    }
  }

  analyzeCaching(rules);

  analysis.cacheEfficiency = Math.round((rulesWithCaching / totalRules) * 100);
  analysis.caching.staticCoverage = Math.round((staticRules / totalRules) * 100);

  // Check for bottlenecks
  if (!rules.behaviors?.some((b: any) => b.name === 'gzipResponse')) {
    analysis.bottlenecks.push({
      behavior: 'gzipResponse',
      path: '/behaviors',
      issue: 'No compression enabled',
      recommendation: 'Enable gzip compression for text content'
    });
  }

  // Calculate optimization potential
  analysis.optimizationPotential = Math.round(
    (100 - analysis.cacheEfficiency) * 0.4 +
      (100 - analysis.caching.staticCoverage) * 0.3 +
      analysis.bottlenecks.length * 10
  );

  // Generate recommendations
  if (analysis.cacheEfficiency < 70) {
    analysis.recommendations.push({
      priority: 'HIGH',
      title: 'Improve Cache Coverage',
      description: 'Add caching behaviors to more rules, especially for static content',
      impact: 'Reduce origin load by up to 80%',
      effort: 'MEDIUM'
    });
  }

  if (analysis.complexity > 70) {
    analysis.recommendations.push({
      priority: 'MEDIUM',
      title: 'Simplify Rule Structure',
      description: 'Consider consolidating similar rules to reduce complexity',
      impact: 'Improve evaluation performance',
      effort: 'HIGH'
    });
  }

  // Calculate efficiency scores
  analysis.efficiency.default = 85; // Placeholder
  analysis.efficiency.pathBased = Math.round(analysis.caching.staticCoverage);
  analysis.efficiency.custom = 75; // Placeholder
  analysis.efficiency.overall = Math.round(
    (analysis.efficiency.default + analysis.efficiency.pathBased + analysis.efficiency.custom) / 3
  );

  return analysis;
}

function calculateRuleStatistics(rules: any): RuleStatistics {
  let totalRules = 0;
  let totalBehaviors = 0;
  let totalCriteria = 0;
  let maxDepth = 0;

  function traverse(rule: any, depth: number) {
    totalRules++;
    maxDepth = Math.max(maxDepth, depth);

    if (rule.behaviors) {
      totalBehaviors += rule.behaviors.length;
    }

    if (rule.criteria) {
      totalCriteria += rule.criteria.length;
    }

    if (rule.children) {
      rule.children.forEach((child: any) => traverse(child, depth + 1));
    }
  }

  traverse(rules, 0);

  // Calculate complexity score (0-100)
  const complexityScore = Math.min(
    100,
    totalRules * 2 + totalBehaviors * 1 + totalCriteria * 1.5 + maxDepth * 10
  );

  // Estimate evaluation time
  const estimatedEvaluationTime = totalRules * 0.5 + totalBehaviors * 0.3 + totalCriteria * 0.4;

  return {
    totalRules,
    totalBehaviors,
    totalCriteria,
    maxDepth,
    complexityScore: Math.round(complexityScore),
    estimatedEvaluationTime: Math.round(estimatedEvaluationTime)
  };
}

/**
 * Format error responses
 */
function formatError(operation: string, error: any): MCPToolResponse {
  let errorMessage = `Failed to ${operation}`;
  let solution = '';

  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;

    // Provide specific solutions based on error type
    if (error.message.includes('401') || error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct.';
    } else if (error.message.includes('validation')) {
      solution = '**Solution:** Fix validation errors in the rule tree before proceeding.';
    }
  } else {
    errorMessage += `: ${String(error)}`;
  }

  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }

  return {
    content: [
      {
        type: 'text',
        text
      }
    ]
  };
}