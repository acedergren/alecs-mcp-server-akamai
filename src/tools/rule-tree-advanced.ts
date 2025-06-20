/**
 * Advanced Rule Tree Management Tools
 * Comprehensive rule validation, templates, optimization, and analysis
 */

import { ErrorTranslator } from '@utils/errors';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Rule validation types
export interface RuleValidationResult {
  valid: boolean;
  errors: RuleError[];
  warnings: RuleWarning[];
  suggestions: RuleOptimization[];
  statistics: RuleStatistics;
}

export interface RuleError {
  severity: 'CRITICAL' | 'ERROR';
  path: string;
  type: string;
  message: string;
  fix?: string;
}

export interface RuleWarning {
  severity: 'WARNING' | 'INFO';
  path: string;
  type: string;
  message: string;
  recommendation?: string;
}

export interface RuleOptimization {
  type: 'PERFORMANCE' | 'SECURITY' | 'COST' | 'BEST_PRACTICE';
  path: string;
  current: any;
  recommended: any;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RuleStatistics {
  totalRules: number;
  totalBehaviors: number;
  totalCriteria: number;
  maxDepth: number;
  complexityScore: number;
  estimatedEvaluationTime: number;
}

// Rule template types
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  author: string;
  lastUpdated: string;
  minRuleFormat?: string;
  requiredBehaviors?: string[];
  variables?: TemplateVariable[];
  rules: any;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

// Rule analysis types
export interface RuleConflict {
  type: 'BEHAVIOR_CONFLICT' | 'CRITERIA_CONFLICT' | 'ORDERING_ISSUE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  path1: string;
  path2: string;
  description: string;
  resolution: string;
}

export interface RuleDependency {
  behavior: string;
  requi_res: string[];
  conflicts: string[];
  recommendedOrder?: number;
}

/**
 * Validate rule tree with comprehensive analysis
 */
export async function validateRuleTree(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    rules?: any;
    includeOptimizations?: boolean;
    includeStatistics?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    let rules = args.rules;
    let propertyName = 'Unknown';
    let version = args.version;

    // If no rules provided, fetch from property
    if (!rules && args.propertyId) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      if (!propertyResponse.properties?.items?.[0]) {
        throw new Error('Property not found');
      }

      const property = propertyResponse.properties.items[0];
      propertyName = property.propertyName;
      version = version || property.latestVersion || 1;

      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET',
      });

      rules = rulesResponse.rules;
    }

    // Perform comprehensive validation
    const validation: RuleValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      statistics: calculateRuleStatistics(rules),
    };

    // 1. Structural validation
    validateRuleStructure(rules, validation, '');

    // 2. Behavior validation
    validateBehaviors(rules, validation, '');

    // 3. Criteria validation
    validateCriteria(rules, validation, '');

    // 4. Conflict detection
    const conflicts = detectRuleConflictsInternal(rules);
    conflicts.forEach((conflict: RuleConflict) => {
      if (conflict.severity === 'HIGH') {
        validation.valid = false;
        validation.errors.push({
          severity: 'ERROR',
          path: conflict.path1,
          type: conflict.type,
          message: conflict.description,
          fix: conflict.resolution,
        });
      } else {
        validation.warnings.push({
          severity: 'WARNING',
          path: conflict.path1,
          type: conflict.type,
          message: conflict.description,
          recommendation: conflict.resolution,
        });
      }
    });

    // 5. Optimization suggestions
    if (args.includeOptimizations) {
      validation.suggestions = generateOptimizationSuggestions(rules);
    }

    // Final validation result - mark as invalid if any errors found
    if (validation.errors.length > 0) {
      validation.valid = false;
    }

    // Format response
    let responseText = '# Rule Tree Validation Report\n\n';
    if (args.propertyId) {
      responseText += `**Property:** ${propertyName} (${args.propertyId})\n`;
      responseText += `**Version:** ${version}\n`;
    }
    responseText += `**Validation Result:** ${validation.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    // Statistics
    if (args.includeStatistics) {
      responseText += '## Rule Statistics\n';
      responseText += `- **Total Rules:** ${validation.statistics.totalRules}\n`;
      responseText += `- **Total Behaviors:** ${validation.statistics.totalBehaviors}\n`;
      responseText += `- **Total Criteria:** ${validation.statistics.totalCriteria}\n`;
      responseText += `- **Max Depth:** ${validation.statistics.maxDepth}\n`;
      responseText += `- **Complexity Score:** ${validation.statistics.complexityScore}/100\n`;
      responseText += `- **Est. Evaluation Time:** ${validation.statistics.estimatedEvaluationTime}ms\n\n`;
    }

    // Errors
    if (validation.errors.length > 0) {
      responseText += `## ❌ Errors (${validation.errors.length})\n`;
      validation.errors.forEach((error, idx) => {
        responseText += `${idx + 1}. **${_error.severity}** at \`${_error.path}\`\n`;
        responseText += `   - ${_error.message}\n`;
        if (_error.fix) {
          responseText += `   - **Fix:** ${_error.fix}\n`;
        }
      });
      responseText += '\n';
    }

    // Warnings
    if (validation.warnings.length > 0) {
      responseText += `## ⚠️ Warnings (${validation.warnings.length})\n`;
      validation.warnings.forEach((warning, idx) => {
        responseText += `${idx + 1}. **${warning.severity}** at \`${warning.path}\`\n`;
        responseText += `   - ${warning.message}\n`;
        if (warning.recommendation) {
          responseText += `   - **Recommendation:** ${warning.recommendation}\n`;
        }
      });
      responseText += '\n';
    }

    // Optimization suggestions
    if (validation.suggestions.length > 0) {
      responseText += `## 💡 Optimization Suggestions (${validation.suggestions.length})\n`;
      validation.suggestions.forEach((suggestion, idx) => {
        const icon =
          suggestion.type === 'PERFORMANCE'
            ? '🚀'
            : suggestion.type === 'SECURITY'
              ? '🔒'
              : suggestion.type === 'COST'
                ? '💰'
                : '✨';
        responseText += `${idx + 1}. ${icon} **${suggestion.type}** - ${suggestion.impact}\n`;
        responseText += `   - **Path:** \`${suggestion.path}\`\n`;
        responseText += `   - **Effort:** ${suggestion.effort}\n`;
        responseText += `   - **Current:** ${JSON.stringify(suggestion.current)}\n`;
        responseText += `   - **Recommended:** ${JSON.stringify(suggestion.recommended)}\n`;
      });
      responseText += '\n';
    }

    // Next steps
    responseText += '## Next Steps\n';
    if (!validation.valid) {
      responseText += '1. Fix the errors listed above\n';
      responseText += '2. Re-validate the rule tree\n';
    } else if (validation.warnings.length > 0) {
      responseText += '1. Review warnings and apply recommendations\n';
      responseText += '2. Consider optimization suggestions\n';
    } else {
      responseText += '✅ Rule tree is valid and ready for use\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'validate rule tree',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Create rule tree from template
 */
export async function createRuleTreeFromTemplate(
  client: AkamaiClient,
  args: {
    templateId: string;
    variables?: Record<string, any>;
    propertyId?: string;
    version?: number;
    validate?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get template
    const template = getRuleTemplate(args.templateId);
    if (!template) {
      throw new Error(`Template '${args.templateId}' not found`);
    }

    // Validate variables
    const validationErrors = validateTemplateVariables(template, args.variables || {});
    if (validationErrors.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Template variable validation failed:\n\n${validationErrors.map((e) => `- ${e}`).join('\n')}`,
          },
        ],
      };
    }

    // Apply variables to template
    const rules = applyTemplateVariables(
      template.rules,
      args.variables || {},
      template.variables || [],
    );

    // Validate if requested
    if (args.validate) {
      const validationResult = await validateRuleTree(client, {
        propertyId: args.propertyId || '',
        rules,
        includeOptimizations: true,
      });

      const validationText = validationResult.content[0]?.text || '';
      if (validationText.includes('❌ INVALID')) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Template generated invalid rule tree:\n\n${validationText}`,
            },
          ],
        };
      }
    }

    // Update property if requested
    if (args.propertyId && args.version) {
      const updateResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.version}/rules`,
        method: 'PUT',
        body: { rules },
      });

      if (updateResponse.errors?.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to apply template:\n\n${updateResponse.errors.map((_e: any) => `- ${e.detail}`).join('\n')}`,
            },
          ],
        };
      }
    }

    // Format response
    let responseText = '# Rule Tree Template Applied\n\n';
    responseText += `**Template:** ${template.name}\n`;
    responseText += `**Category:** ${template.category}\n`;
    responseText += `**Description:** ${template.description}\n\n`;

    if (args.variables && Object.keys(args.variables).length > 0) {
      responseText += '## Applied Variables\n';
      Object.entries(args.variables).forEach(([key, value]) => {
        responseText += `- **${key}:** ${JSON.stringify(value)}\n`;
      });
      responseText += '\n';
    }

    if (args.propertyId && args.version) {
      responseText += '## Property Updated\n';
      responseText += `✅ Successfully applied template to property ${args.propertyId} version ${args.version}\n\n`;
    } else {
      responseText += '## Generated Rule Tree\n';
      responseText += `\`\`\`json\n${JSON.stringify(rules, null, 2)}\n\`\`\`\n\n`;
    }

    responseText += '## Next Steps\n';
    if (args.propertyId && args.version) {
      responseText += '1. Validate the updated rules\n';
      responseText += '2. Test in staging environment\n';
      responseText += '3. Activate when ready\n';
    } else {
      responseText += '1. Review the generated rule tree\n';
      responseText += '2. Apply to a property version\n';
      responseText += '3. Validate before activation\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'create rule tree from template',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Analyze rule tree for optimization opportunities
 */
export async function analyzeRuleTreePerformance(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    rules?: any;
    includeRecommendations?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    let rules = args.rules;
    let propertyName = 'Unknown';
    let version = args.version;

    // Fetch rules if not provided
    if (!rules && args.propertyId) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      const property = propertyResponse.properties?.items?.[0];
      if (!property) {
        throw new Error('Property not found');
      }

      propertyName = property.propertyName;
      version = version || property.latestVersion || 1;

      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET',
      });

      rules = rulesResponse.rules;
    }

    // Analyze performance
    const analysis = performRuleTreeAnalysis(rules);

    // Format response
    let responseText = '# Rule Tree Performance Analysis\n\n';
    if (args.propertyId) {
      responseText += `**Property:** ${propertyName} (${args.propertyId})\n`;
      responseText += `**Version:** ${version}\n\n`;
    }

    // Performance metrics
    responseText += '## Performance Metrics\n';
    responseText += `- **Evaluation Complexity:** ${analysis.complexity}/100\n`;
    responseText += `- **Cache Efficiency:** ${analysis.cacheEfficiency}%\n`;
    responseText += `- **Rule Redundancy:** ${analysis.redundancy}%\n`;
    responseText += `- **Optimization Potential:** ${analysis.optimizationPotential}/100\n\n`;

    // Critical findings
    if (analysis.criticalFindings.length > 0) {
      responseText += '## 🚨 Critical Findings\n';
      analysis.criticalFindings.forEach((finding: any, idx: number) => {
        responseText += `${idx + 1}. **${finding.type}**: ${finding.description}\n`;
        responseText += `   - **Impact:** ${finding.impact}\n`;
        responseText += `   - **Location:** \`${finding.path}\`\n`;
      });
      responseText += '\n';
    }

    // Performance bottlenecks
    if (analysis.bottlenecks.length > 0) {
      responseText += '## 🐌 Performance Bottlenecks\n';
      analysis.bottlenecks.forEach((bottleneck: any, idx: number) => {
        responseText += `${idx + 1}. **${bottleneck.behavior}** at \`${bottleneck.path}\`\n`;
        responseText += `   - **Issue:** ${bottleneck.issue}\n`;
        responseText += `   - **Recommendation:** ${bottleneck.recommendation}\n`;
      });
      responseText += '\n';
    }

    // Caching analysis
    responseText += '## 💾 Caching Analysis\n';
    responseText += `- **Static Content Coverage:** ${analysis.caching.staticCoverage}%\n`;
    responseText += `- **Dynamic Content Strategy:** ${analysis.caching.dynamicStrategy}\n`;
    responseText += `- **TTL Optimization:** ${analysis.caching.ttlOptimization}\n`;
    responseText += `- **Cache Key Efficiency:** ${analysis.caching.cacheKeyEfficiency}\n\n`;

    // Recommendations
    if (args.includeRecommendations && analysis.recommendations.length > 0) {
      responseText += '## 📋 Recommendations\n';
      analysis.recommendations.forEach((rec: any, idx: number) => {
        responseText += `${idx + 1}. **${rec.priority} Priority**: ${rec.title}\n`;
        responseText += `   - ${rec.description}\n`;
        responseText += `   - **Expected Impact:** ${rec.impact}\n`;
        responseText += `   - **Implementation Effort:** ${rec.effort}\n`;
      });
      responseText += '\n';
    }

    // Rule efficiency breakdown
    responseText += '## 📊 Rule Efficiency Breakdown\n';
    responseText += '```\n';
    responseText += `Default Rule:     ${analysis.efficiency.default}% efficient\n`;
    responseText += `Path-based Rules: ${analysis.efficiency.pathBased}% efficient\n`;
    responseText += `Custom Rules:     ${analysis.efficiency.custom}% efficient\n`;
    responseText += `Overall Score:    ${analysis.efficiency.overall}% efficient\n`;
    responseText += '```\n\n';

    // Next steps
    responseText += '## Next Steps\n';
    if (analysis.optimizationPotential > 70) {
      responseText += '⚡ High optimization potential detected!\n';
      responseText += '1. Apply recommended optimizations\n';
      responseText += '2. Consolidate redundant rules\n';
      responseText += '3. Implement caching improvements\n';
    } else if (analysis.optimizationPotential > 30) {
      responseText += '💡 Moderate optimization opportunities available\n';
      responseText += '1. Review critical findings\n';
      responseText += '2. Apply high-priority recommendations\n';
    } else {
      responseText += '✅ Rule tree is well-optimized\n';
      responseText += '1. Monitor performance metrics\n';
      responseText += '2. Review periodically for improvements\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'analyze rule tree performance',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Detect conflicts between rules
 */
export async function detectRuleConflicts(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    rules?: any;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    let rules = args.rules;

    if (!rules && args.propertyId) {
      const propertyResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}`,
        method: 'GET',
      });

      const property = propertyResponse.properties?.items?.[0];
      if (!property) {
        throw new Error('Property not found');
      }

      const version = args.version || property.latestVersion || 1;
      const rulesResponse = await client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
        method: 'GET',
      });

      rules = rulesResponse.rules;
    }

    // Detect conflicts
    const conflicts = detectRuleConflictsInternal(rules);

    // Format response
    let responseText = '# Rule Conflict Analysis\n\n';
    responseText += `**Total Conflicts Found:** ${conflicts.length}\n\n`;

    if (conflicts.length === 0) {
      responseText += '✅ No conflicts detected in the rule tree!\n\n';
      responseText += 'The rule configuration appears to be consistent and conflict-free.\n';
    } else {
      // Group conflicts by severity
      const highSeverity = conflicts.filter((c) => c.severity === 'HIGH');
      const mediumSeverity = conflicts.filter((c) => c.severity === 'MEDIUM');
      const lowSeverity = conflicts.filter((c) => c.severity === 'LOW');

      if (highSeverity.length > 0) {
        responseText += `## 🔴 High Severity Conflicts (${highSeverity.length})\n`;
        highSeverity.forEach((conflict, idx) => {
          responseText += `${idx + 1}. **${conflict.type}**\n`;
          responseText += `   - **Description:** ${conflict.description}\n`;
          responseText += `   - **Location 1:** \`${conflict.path1}\`\n`;
          responseText += `   - **Location 2:** \`${conflict.path2}\`\n`;
          responseText += `   - **Resolution:** ${conflict.resolution}\n`;
        });
        responseText += '\n';
      }

      if (mediumSeverity.length > 0) {
        responseText += `## 🟡 Medium Severity Conflicts (${mediumSeverity.length})\n`;
        mediumSeverity.forEach((conflict, idx) => {
          responseText += `${idx + 1}. **${conflict.type}**\n`;
          responseText += `   - **Description:** ${conflict.description}\n`;
          responseText += `   - **Locations:** \`${conflict.path1}\`, \`${conflict.path2}\`\n`;
          responseText += `   - **Recommendation:** ${conflict.resolution}\n`;
        });
        responseText += '\n';
      }

      if (lowSeverity.length > 0) {
        responseText += `## 🟢 Low Severity Conflicts (${lowSeverity.length})\n`;
        lowSeverity.forEach((conflict, idx) => {
          responseText += `${idx + 1}. **${conflict.type}**: ${conflict.description}\n`;
        });
        responseText += '\n';
      }
    }

    // Add dependency information
    responseText += '## 📋 Behavior Dependencies\n';
    responseText += 'Common behavior dependencies to be aware of:\n';
    responseText += '- **caching** works best with **cpCode** for reporting\n';
    responseText += '- **gzipResponse** should be ordered after **caching**\n';
    responseText += '- **modifyOutgoingResponseHeader** should be last in the behavior list\n';
    responseText += '- **origin** must be present in the default rule\n\n';

    responseText += '## Next Steps\n';
    if (conflicts.length > 0) {
      responseText += '1. Address high severity conflicts first\n';
      responseText += '2. Review and apply recommended resolutions\n';
      responseText += '3. Re-validate after making changes\n';
    } else {
      responseText += '1. Continue with rule configuration\n';
      responseText += '2. Test thoroughly before activation\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'detect rule conflicts',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * List available rule templates
 */
export async function listRuleTemplates(
  _client: AkamaiClient,
  args: {
    category?: string;
    tags?: string[];
  },
): Promise<MCPToolResponse> {
  try {
    const templates = getRuleTemplates();

    // Filter by category if provided
    let filteredTemplates = templates;
    if (args.category) {
      filteredTemplates = filteredTemplates.filter(
        (t) => t.category.toLowerCase() === args.category!.toLowerCase(),
      );
    }

    // Filter by tags if provided
    if (args.tags && args.tags.length > 0) {
      filteredTemplates = filteredTemplates.filter((t) =>
        args.tags!.some((tag) => t.tags.includes(tag)),
      );
    }

    // Format response
    let responseText = '# Available Rule Templates\n\n';
    responseText += `**Total Templates:** ${filteredTemplates.length}\n`;
    if (args.category) {
      responseText += `**Category Filter:** ${args.category}\n`;
    }
    if (args.tags) {
      responseText += `**Tag Filter:** ${args.tags.join(', ')}\n`;
    }
    responseText += '\n';

    // Group by category
    const byCategory = filteredTemplates.reduce(
      (acc, template) => {
        const cat = template.category;
        if (!acc[cat]) {
acc[cat] = [];
}
        acc[cat].push(template);
        return acc;
      },
      {} as Record<string, RuleTemplate[]>,
    );

    Object.entries(byCategory).forEach(([category, categoryTemplates]) => {
      responseText += `## ${category}\n\n`;

      categoryTemplates.forEach((template) => {
        responseText += `### ${template.name}\n`;
        responseText += `- **ID:** \`${template.id}\`\n`;
        responseText += `- **Description:** ${template.description}\n`;
        responseText += `- **Tags:** ${template.tags.join(', ')}\n`;
        responseText += `- **Version:** ${template.version}\n`;
        responseText += `- **Author:** ${template.author}\n`;
        responseText += `- **Last Updated:** ${template.lastUpdated}\n`;

        if (template.variables && template.variables.length > 0) {
          responseText += `- **Variables:** ${template.variables.length} customizable parameters\n`;
        }

        responseText += '\n';
      });
    });

    responseText += '## Usage Example\n';
    responseText += 'To use a template:\n';
    responseText += '```\n';
    responseText += 'Create rule tree from template:\n';
    responseText += '- Template ID: [template_id]\n';
    responseText += '- Variables: { "origin": "origin.example.com", "ttl": "1d" }\n';
    responseText += '```\n\n';

    responseText += '## Template Categories\n';
    responseText += '- **Web Delivery**: Static sites, dynamic applications\n';
    responseText += '- **API**: REST APIs, GraphQL, microservices\n';
    responseText += '- **Media**: Video streaming, downloads\n';
    responseText += '- **Security**: WAF, bot management, DDoS\n';
    responseText += '- **Performance**: Optimization patterns\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to list rule templates: ${_error instanceof Error ? _error.message : String(_error)}`,
        },
      ],
    };
  }
}

// Helper functions

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
    totalRules * 2 + totalBehaviors * 1 + totalCriteria * 1.5 + maxDepth * 10,
  );

  // Estimate evaluation time
  const estimatedEvaluationTime = totalRules * 0.5 + totalBehaviors * 0.3 + totalCriteria * 0.4;

  return {
    totalRules,
    totalBehaviors,
    totalCriteria,
    maxDepth,
    complexityScore: Math.round(complexityScore),
    estimatedEvaluationTime: Math.round(estimatedEvaluationTime),
  };
}

function validateRuleStructure(rule: any, validation: RuleValidationResult, path: string) {
  // Check required fields
  if (!rule.name) {
    validation.valid = false;
    validation.errors.push({
      severity: 'ERROR',
      path,
      type: 'MISSING_NAME',
      message: 'Rule must have a name',
      fix: 'Add a descriptive name to the rule',
    });
  }

  // Check for empty rules
  if (!rule.behaviors && !rule.criteria && !rule.children) {
    validation.warnings.push({
      severity: 'WARNING',
      path,
      type: 'EMPTY_RULE',
      message: 'Rule has no behaviors, criteria, or children',
      recommendation: 'Consider removing empty rules or adding configuration',
    });
  }

  // Validate children recursively
  if (rule.children) {
    rule.children.forEach((child: any, index: number) => {
      validateRuleStructure(child, validation, `${path}/children/${index}`);
    });
  }
}

function validateBehaviors(rule: any, validation: RuleValidationResult, path: string) {
  if (rule.behaviors) {
    const behaviorNames = rule.behaviors.map((b: any) => b.name);

    // Check for duplicates
    const duplicates = behaviorNames.filter(
      (name: string, index: number) => behaviorNames.indexOf(name) !== index,
    );

    if (duplicates.length > 0) {
      validation.warnings.push({
        severity: 'WARNING',
        path,
        type: 'DUPLICATE_BEHAVIORS',
        message: `Duplicate behaviors found: ${duplicates.join(', ')}`,
        recommendation: 'Consolidate duplicate behaviors',
      });
    }

    // Check behavior-specific validations
    rule.behaviors.forEach((behavior: any, index: number) => {
      const behaviorPath = `${path}/behaviors/${index}`;

      // Origin validation
      if (behavior.name === 'origin' && path === '') {
        if (!behavior.options?.hostname) {
          validation.errors.push({
            severity: 'ERROR',
            path: behaviorPath,
            type: 'MISSING_ORIGIN',
            message: 'Origin behavior must specify hostname',
            fix: 'Add hostname to origin behavior options',
          });
        }
      }

      // Caching validation
      if (behavior.name === 'caching') {
        if (!behavior.options?.behavior) {
          validation.warnings.push({
            severity: 'WARNING',
            path: behaviorPath,
            type: 'CACHING_BEHAVIOR_MISSING',
            message: 'Caching behavior should specify caching strategy',
            recommendation: 'Set behavior to CACHE, NO_CACHE, or other appropriate value',
          });
        }
      }
    });
  }

  // Check for required behaviors in default rule
  if (path === '' && !rule.behaviors?.some((b: any) => b.name === 'origin')) {
    validation.errors.push({
      severity: 'ERROR',
      path,
      type: 'MISSING_ORIGIN',
      message: 'Default rule must contain origin behavior',
      fix: 'Add origin behavior to the default rule',
    });
  }

  // Recurse for children
  if (rule.children) {
    rule.children.forEach((child: any, index: number) => {
      validateBehaviors(child, validation, `${path}/children/${index}`);
    });
  }
}

function validateCriteria(rule: any, validation: RuleValidationResult, path: string) {
  if (rule.criteria && rule.criteria.length > 0) {
    // Check for conflicting criteria
    const criteriaTypes = rule.criteria.map((c: any) => c.name);

    // Path and hostname conflicts
    if (criteriaTypes.includes('path') && criteriaTypes.includes('hostname')) {
      validation.warnings.push({
        severity: 'INFO',
        path,
        type: 'CRITERIA_COMBINATION',
        message: 'Rule uses both path and hostname criteria',
        recommendation: 'Ensure criteria combination is intentional',
      });
    }
  }

  // Recurse for children
  if (rule.children) {
    rule.children.forEach((child: any, index: number) => {
      validateCriteria(child, validation, `${path}/children/${index}`);
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
        const behaviorPath = `${path}/behaviors/${index}`;
        if (!behaviorMap.has(behavior.name)) {
          behaviorMap.set(behavior.name, []);
        }
        behaviorMap.get(behavior.name)!.push(behaviorPath);
      });
    }

    if (rule.children) {
      rule.children.forEach((child: any, index: number) => {
        mapBehaviors(child, `${path}/children/${index}`);
      });
    }
  }

  mapBehaviors(rules, '');

  // Check for conflicting behaviors
  const conflictingBehaviors = [
    ['caching', 'noStore'],
    ['gzipResponse', 'brotli'],
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
        resolution: 'Remove one of the conflicting behaviors',
      });
    }
  });

  // Check for ordering issues
  const orderDependencies: Record<string, string[]> = {
    modifyOutgoingResponseHeader: ['caching', 'gzipResponse'],
    gzipResponse: ['caching'],
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
            resolution: `Add ${req} behavior before ${dependent}`,
          });
        }
      });
    });
  });

  return conflicts;
}

function generateOptimizationSuggestions(rules: any): RuleOptimization[] {
  const suggestions: RuleOptimization[] = [];

  function analyzeRule(rule: any, path: string) {
    // Check caching optimizations
    if (rule.behaviors) {
      const cachingBehavior = rule.behaviors.find((b: any) => b.name === 'caching');

      if (cachingBehavior && cachingBehavior.options?.behavior === 'NO_CACHE') {
        // Check if this could be cached
        const pathCriteria = rule.criteria?.find((c: any) => c.name === 'path');
        if (
          pathCriteria?.options?.values?.some(
            (v: string) =>
              v.includes('.js') || v.includes('.css') || v.includes('.jpg') || v.includes('.png'),
          )
        ) {
          suggestions.push({
            type: 'PERFORMANCE',
            path: `${path}/behaviors/${rule.behaviors.indexOf(cachingBehavior)}`,
            current: { behavior: 'NO_CACHE' },
            recommended: { behavior: 'CACHE', defaultTtl: '7d' },
            impact: 'Improve performance by caching static assets',
            effort: 'LOW',
          });
        }
      }

      // Check for missing gzip
      const hasGzip = rule.behaviors.some((b: any) => b.name === 'gzipResponse');
      if (!hasGzip && path === '') {
        suggestions.push({
          type: 'PERFORMANCE',
          path: path,
          current: { gzipResponse: false },
          recommended: {
            name: 'gzipResponse',
            options: { behavior: 'ALWAYS' },
          },
          impact: 'Reduce bandwidth by 60-80% for text content',
          effort: 'LOW',
        });
      }

      // Check for missing security headers
      const hasSecurityHeaders = rule.behaviors.some(
        (b: any) =>
          b.name === 'modifyOutgoingResponseHeader' &&
          b.options?.customHeaderName?.includes('Security'),
      );

      if (!hasSecurityHeaders && path === '') {
        suggestions.push({
          type: 'SECURITY',
          path: path,
          current: { securityHeaders: false },
          recommended: {
            name: 'modifyOutgoingResponseHeader',
            options: {
              action: 'ADD',
              customHeaderName: 'X-Content-Type-Options',
              headerValue: 'nosniff',
            },
          },
          impact: 'Improve security posture with security headers',
          effort: 'LOW',
        });
      }
    }

    // Recurse for children
    if (rule.children) {
      rule.children.forEach((child: any, index: number) => {
        analyzeRule(child, `${path}/children/${index}`);
      });
    }
  }

  analyzeRule(rules, '');
  return suggestions;
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
      cacheKeyEfficiency: 'Standard',
    },
    recommendations: [] as any[],
    efficiency: {
      default: 0,
      pathBased: 0,
      custom: 0,
      overall: 0,
    },
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
        /\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/.test(v),
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
      recommendation: 'Enable gzip compression for text content',
    });
  }

  // Calculate optimization potential
  analysis.optimizationPotential = Math.round(
    (100 - analysis.cacheEfficiency) * 0.4 +
      (100 - analysis.caching.staticCoverage) * 0.3 +
      analysis.bottlenecks.length * 10,
  );

  // Generate recommendations
  if (analysis.cacheEfficiency < 70) {
    analysis.recommendations.push({
      priority: 'HIGH',
      title: 'Improve Cache Coverage',
      description: 'Add caching behaviors to more rules, especially for static content',
      impact: 'Reduce origin load by up to 80%',
      effort: 'MEDIUM',
    });
  }

  if (analysis.complexity > 70) {
    analysis.recommendations.push({
      priority: 'MEDIUM',
      title: 'Simplify Rule Structure',
      description: 'Consider consolidating similar rules to reduce complexity',
      impact: 'Improve evaluation performance',
      effort: 'HIGH',
    });
  }

  // Calculate efficiency scores
  analysis.efficiency.default = 85; // Placeholder
  analysis.efficiency.pathBased = Math.round(analysis.caching.staticCoverage);
  analysis.efficiency.custom = 75; // Placeholder
  analysis.efficiency.overall = Math.round(
    (analysis.efficiency.default + analysis.efficiency.pathBased + analysis.efficiency.custom) / 3,
  );

  return analysis;
}

function getRuleTemplate(templateId: string): RuleTemplate | null {
  const templates = getRuleTemplates();
  return templates.find((t) => t.id === templateId) || null;
}

function getRuleTemplates(): RuleTemplate[] {
  return [
    {
      id: 'static-website-optimized',
      name: 'Static Website Optimized',
      description:
        'Optimized configuration for static websites with aggressive caching and performance features',
      category: 'Web Delivery',
      tags: ['static', 'performance', 'caching'],
      version: '1.0.0',
      author: 'Akamai',
      lastUpdated: '2024-01-15',
      variables: [
        {
          name: 'originHostname',
          type: 'string',
          description: 'Your origin server hostname',
          required: true,
        },
        {
          name: 'cacheTTL',
          type: 'string',
          description: 'Default cache TTL (e.g., "7d", "1h")',
          required: false,
          default: '7d',
        },
      ],
      rules: {
        name: 'default',
        behaviors: [
          {
            name: 'origin',
            options: {
              hostname: '{{originHostname}}',
              httpPort: 80,
              httpsPort: 443,
              originType: 'CUSTOMER',
              cacheKeyHostname: 'REQUEST_HOST_HEADER',
            },
          },
          {
            name: 'cpCode',
            options: {
              value: { id: 12345 },
            },
          },
          {
            name: 'caching',
            options: {
              behavior: 'CACHE',
              defaultTtl: '{{cacheTTL}}',
            },
          },
          {
            name: 'gzipResponse',
            options: {
              behavior: 'ALWAYS',
            },
          },
        ],
        children: [
          {
            name: 'Static Assets',
            criteria: [
              {
                name: 'fileExtension',
                options: {
                  matchOperator: 'IS_ONE_OF',
                  values: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'woff', 'woff2'],
                },
              },
            ],
            behaviors: [
              {
                name: 'caching',
                options: {
                  behavior: 'CACHE',
                  defaultTtl: '30d',
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: 'api-acceleration',
      name: 'API Acceleration',
      description: 'Optimized for REST APIs and microservices with dynamic content handling',
      category: 'API',
      tags: ['api', 'dynamic', 'performance'],
      version: '1.0.0',
      author: 'Akamai',
      lastUpdated: '2024-01-15',
      variables: [
        {
          name: 'originHostname',
          type: 'string',
          description: 'Your API origin hostname',
          required: true,
        },
        {
          name: 'allowedMethods',
          type: 'array',
          description: 'Allowed HTTP methods',
          required: false,
          default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
      ],
      rules: {
        name: 'default',
        behaviors: [
          {
            name: 'origin',
            options: {
              hostname: '{{originHostname}}',
              httpPort: 80,
              httpsPort: 443,
              originType: 'CUSTOMER',
            },
          },
          {
            name: 'caching',
            options: {
              behavior: 'NO_CACHE',
            },
          },
          {
            name: 'allowPost',
            options: {
              enabled: true,
              allowWithoutContentLength: false,
            },
          },
        ],
        children: [
          {
            name: 'API Endpoints',
            criteria: [
              {
                name: 'path',
                options: {
                  matchOperator: 'MATCHES_ONE_OF',
                  values: ['/api/*', '/v1/*', '/v2/*'],
                },
              },
            ],
            behaviors: [
              {
                name: 'corsSupport',
                options: {
                  enabled: true,
                  allowOrigins: 'ALL',
                  allowMethods: 'GET POST PUT DELETE PATCH OPTIONS',
                  allowHeaders: 'ALL',
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

function validateTemplateVariables(
  template: RuleTemplate,
  variables: Record<string, any>,
): string[] {
  const errors: string[] = [];

  template.variables?.forEach((variable) => {
    const value = variables[variable.name];

    // Check required
    if (variable.required && value === undefined) {
      errors.push(`Missing required variable: ${variable.name}`);
      return;
    }

    // Skip validation if not provided and not required
    if (value === undefined) {
return;
}

    // Type validation
    if (variable.type === 'string' && typeof value !== 'string') {
      errors.push(`Variable ${variable.name} must be a string`);
    } else if (variable.type === 'number' && typeof value !== 'number') {
      errors.push(`Variable ${variable.name} must be a number`);
    } else if (variable.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Variable ${variable.name} must be a boolean`);
    } else if (variable.type === 'array' && !Array.isArray(value)) {
      errors.push(`Variable ${variable.name} must be an array`);
    }

    // Additional validation
    if (variable.validation) {
      if (variable.validation.pattern && variable.type === 'string') {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(value)) {
          errors.push(
            `Variable ${variable.name} does not match pattern: ${variable.validation.pattern}`,
          );
        }
      }

      if (variable.validation.min !== undefined && typeof value === 'number') {
        if (value < variable.validation.min) {
          errors.push(`Variable ${variable.name} must be at least ${variable.validation.min}`);
        }
      }

      if (variable.validation.max !== undefined && typeof value === 'number') {
        if (value > variable.validation.max) {
          errors.push(`Variable ${variable.name} must be at most ${variable.validation.max}`);
        }
      }

      if (variable.validation.enum && !variable.validation.enum.includes(value)) {
        errors.push(
          `Variable ${variable.name} must be one of: ${variable.validation.enum.join(', ')}`,
        );
      }
    }
  });

  return errors;
}

function applyTemplateVariables(
  rules: any,
  variables: Record<string, any>,
  templateVars: TemplateVariable[],
): any {
  // Create a map with defaults
  const varMap: Record<string, any> = {};
  templateVars.forEach((v) => {
    varMap[v.name] = variables[v.name] !== undefined ? variables[v.name] : v.default;
  });

  // Deep clone and replace
  const processValue = (value: any): any => {
    if (typeof value === 'string') {
      // Replace template variables
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return varMap[varName] !== undefined ? varMap[varName] : match;
      });
    } else if (Array.isArray(value)) {
      return value.map(processValue);
    } else if (value && typeof value === 'object') {
      const result: any = {};
      Object.entries(value).forEach(([key, val]) => {
        result[key] = processValue(val);
      });
      return result;
    }
    return value;
  };

  return processValue(rules);
}

/*
function getBehaviorDependencies(): RuleDependency[] {
  return [
    {
      behavior: 'gzipResponse',
      requi_res: ['caching'],
      conflicts: ['brotli'],
      recommendedOrder: 50,
    },
    {
      behavior: 'modifyOutgoingResponseHeader',
      requi_res: [],
      conflicts: [],
      recommendedOrder: 90,
    },
    {
      behavior: 'caching',
      requi_res: ['cpCode'],
      conflicts: ['noStore'],
      recommendedOrder: 20,
    },
    {
      behavior: 'origin',
      requi_res: [],
      conflicts: [],
      recommendedOrder: 10,
    },
  ];
}
*/
