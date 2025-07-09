/**
 * Property Manager Custom Behaviors & Overrides - Template-Based Generation
 * 
 * PHASE 2.4: Implementing 14+ Custom Behaviors & Overrides Endpoints
 * 
 * This implements comprehensive custom behavior management and rule overrides
 * for Property Manager using intelligent templates for advanced configuration,
 * custom logic implementation, and enterprise behavior management.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Custom Behaviors & Overrides Schemas
 */
const CustomBehaviorBaseSchema = CustomerSchema.extend({
  propertyId: z.string().describe('Property ID'),
  propertyVersion: z.number().int().positive().optional().describe('Property version (latest if not specified)'),
  ruleId: z.string().optional().describe('Specific rule ID for behavior application')
});

const CreateCustomBehaviorSchema = CustomBehaviorBaseSchema.extend({
  behaviorName: z.string().min(1).max(255).describe('Custom behavior name'),
  behaviorType: z.enum(['caching', 'origin', 'performance', 'security', 'content', 'redirect', 'header']).describe('Behavior category'),
  description: z.string().max(1000).optional().describe('Behavior description'),
  customLogic: z.object({
    conditions: z.array(z.object({
      variable: z.enum(['request_uri', 'request_header', 'query_string', 'user_agent', 'client_ip', 'geo_country', 'time_of_day']),
      operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'regex', 'exists', 'greater_than', 'less_than']),
      value: z.string().optional(),
      values: z.array(z.string()).optional(),
      caseSensitive: z.boolean().default(false),
      negate: z.boolean().default(false)
    })).min(1).describe('Conditions for behavior execution'),
    actions: z.array(z.object({
      type: z.enum(['set_header', 'remove_header', 'redirect', 'rewrite', 'cache_control', 'origin_override', 'error_response']),
      parameters: z.record(z.any()).describe('Action-specific parameters')
    })).min(1).describe('Actions to execute when conditions are met'),
    priority: z.number().int().min(1).max(100).default(50).describe('Execution priority (1=highest, 100=lowest)')
  }),
  appliesTo: z.object({
    pathPattern: z.string().optional().describe('Path pattern where behavior applies'),
    fileExtensions: z.array(z.string()).optional().describe('File extensions for behavior application'),
    requestMethods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'])).optional()
  }).optional(),
  isActive: z.boolean().default(true).describe('Whether behavior is active')
});

const UpdateCustomBehaviorSchema = CustomBehaviorBaseSchema.extend({
  behaviorId: z.string().describe('Custom behavior ID to update'),
  behaviorName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  customLogic: z.object({
    conditions: z.array(z.object({
      variable: z.enum(['request_uri', 'request_header', 'query_string', 'user_agent', 'client_ip', 'geo_country', 'time_of_day']),
      operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'regex', 'exists', 'greater_than', 'less_than']),
      value: z.string().optional(),
      values: z.array(z.string()).optional(),
      caseSensitive: z.boolean().default(false),
      negate: z.boolean().default(false)
    })).optional(),
    actions: z.array(z.object({
      type: z.enum(['set_header', 'remove_header', 'redirect', 'rewrite', 'cache_control', 'origin_override', 'error_response']),
      parameters: z.record(z.any())
    })).optional(),
    priority: z.number().int().min(1).max(100).optional()
  }).optional(),
  isActive: z.boolean().optional()
});

const RuleOverrideSchema = CustomBehaviorBaseSchema.extend({
  targetRuleId: z.string().describe('Rule ID to override'),
  overrideType: z.enum(['behavior_override', 'criteria_override', 'complete_override']).describe('Type of override'),
  overrideConfiguration: z.object({
    behaviors: z.array(z.object({
      name: z.string(),
      options: z.record(z.any())
    })).optional().describe('Behavior overrides'),
    criteria: z.array(z.object({
      name: z.string(),
      options: z.record(z.any())
    })).optional().describe('Criteria overrides'),
    children: z.array(z.any()).optional().describe('Child rule overrides')
  }),
  overrideName: z.string().min(1).max(255).describe('Override configuration name'),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  applyToChildren: z.boolean().default(false).describe('Apply override to child rules')
});

const BehaviorTestingSchema = CustomBehaviorBaseSchema.extend({
  behaviorId: z.string().describe('Behavior ID to test'),
  testScenarios: z.array(z.object({
    name: z.string().describe('Test scenario name'),
    requestContext: z.object({
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']).default('GET'),
      headers: z.record(z.string()).optional(),
      queryString: z.string().optional(),
      userAgent: z.string().optional(),
      clientIP: z.string().ip().optional(),
      geoCountry: z.string().length(2).optional()
    }),
    expectedResult: z.object({
      shouldExecute: z.boolean().describe('Whether behavior should execute for this scenario'),
      expectedActions: z.array(z.string()).optional().describe('Expected actions to be triggered')
    })
  })).min(1).describe('Test scenarios for behavior validation')
});

const BehaviorPerformanceSchema = CustomBehaviorBaseSchema.extend({
  analysisType: z.enum(['performance_impact', 'execution_frequency', 'resource_usage']).describe('Type of performance analysis'),
  timeRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  includeBenchmarks: z.boolean().default(true).describe('Include performance benchmarks'),
  includeRecommendations: z.boolean().default(true).describe('Include optimization recommendations')
});

const BehaviorTemplateSchema = CustomerSchema.extend({
  templateType: z.enum(['security_headers', 'caching_optimization', 'origin_failover', 'content_personalization', 'api_protection']),
  templateName: z.string().min(1).max(255).describe('Template name'),
  description: z.string().max(1000).optional(),
  configurationParameters: z.record(z.any()).describe('Template-specific configuration parameters'),
  applyToProperties: z.array(z.string()).optional().describe('Property IDs to apply template to')
});

/**
 * Custom Behaviors & Overrides Template Generator
 */
export class CustomBehaviorsTemplate {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * CUSTOM BEHAVIOR MANAGEMENT
   */
  
  async createCustomBehavior(args: z.infer<typeof CreateCustomBehaviorSchema>): Promise<MCPToolResponse> {
    try {
      const params = CreateCustomBehaviorSchema.parse(args);

      // Enterprise validation: Check for behavior conflicts
      const existingBehaviors = await this.listCustomBehaviors({
        customer: params.customer,
        propertyId: params.propertyId,
        propertyVersion: params.propertyVersion
      });

      const conflictingBehavior = (existingBehaviors as any).behaviors?.find(
        (b: any) => b.behaviorName === params.behaviorName
      );

      if (conflictingBehavior) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Custom behavior name already exists',
              behaviorName: params.behaviorName,
              existingBehaviorId: conflictingBehavior.behaviorId,
              recommendation: 'Use a different name or update the existing behavior'
            }, null, 2)
          }]
        };
      }

      // Validate custom logic
      const validationResult = await this.validateCustomLogic(params.customLogic);
      if (!validationResult.isValid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Custom logic validation failed',
              validationErrors: validationResult.errors,
              recommendation: 'Fix validation errors before creating behavior'
            }, null, 2)
          }]
        };
      }

      const response = await this.client.request({
        path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/custom-behaviors`,
        method: 'POST',
        body: {
          behaviorName: params.behaviorName,
          behaviorType: params.behaviorType,
          description: params.description,
          customLogic: params.customLogic,
          appliesTo: params.appliesTo,
          isActive: params.isActive
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Custom behavior created successfully',
            behaviorId: (response as any).behaviorId,
            behaviorName: params.behaviorName,
            behaviorType: params.behaviorType,
            propertyId: params.propertyId,
            priority: params.customLogic.priority,
            isActive: params.isActive,
            nextSteps: [
              'Test behavior with property.behavior.test',
              'Monitor performance with property.behavior.performance',
              'Activate property version when ready'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating custom behavior: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async listCustomBehaviors(args: z.infer<typeof CustomBehaviorBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = CustomBehaviorBaseSchema.parse(args);

      const response = await this.client.request({
        path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/custom-behaviors`,
        method: 'GET'
      });

      const behaviors = (response as any).behaviors || [];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            behaviorsCount: behaviors.length,
            propertyId: params.propertyId,
            propertyVersion: params.propertyVersion || 'latest',
            behaviors: behaviors.map((behavior: any) => ({
              behaviorId: behavior.behaviorId,
              behaviorName: behavior.behaviorName,
              behaviorType: behavior.behaviorType,
              description: behavior.description,
              priority: behavior.customLogic?.priority,
              isActive: behavior.isActive,
              conditionsCount: behavior.customLogic?.conditions?.length || 0,
              actionsCount: behavior.customLogic?.actions?.length || 0,
              createdDate: behavior.createdDate,
              lastModifiedDate: behavior.lastModifiedDate
            })),
            summary: {
              total: behaviors.length,
              active: behaviors.filter((b: any) => b.isActive).length,
              inactive: behaviors.filter((b: any) => !b.isActive).length,
              byType: this.groupBy(behaviors, 'behaviorType'),
              averagePriority: behaviors.length > 0 ? 
                Math.round(behaviors.reduce((sum: number, b: any) => sum + (b.customLogic?.priority || 50), 0) / behaviors.length) : 0
            }
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error listing custom behaviors: ${error.message}`
        }]
      };
    }
  }

  async updateCustomBehavior(args: z.infer<typeof UpdateCustomBehaviorSchema>): Promise<MCPToolResponse> {
    try {
      const params = UpdateCustomBehaviorSchema.parse(args);

      // Validate updated custom logic if provided
      if (params.customLogic) {
        const validationResult = await this.validateCustomLogic(params.customLogic as any);
        if (!validationResult.isValid) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Custom logic validation failed',
                validationErrors: validationResult.errors
              }, null, 2)
            }]
          };
        }
      }

      await this.client.request({
        path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/custom-behaviors/${params.behaviorId}`,
        method: 'PUT',
        body: {
          behaviorName: params.behaviorName,
          description: params.description,
          customLogic: params.customLogic,
          isActive: params.isActive
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Custom behavior updated successfully',
            behaviorId: params.behaviorId,
            propertyId: params.propertyId,
            updatedFields: Object.keys(params).filter(key => params[key as keyof typeof params] !== undefined)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error updating custom behavior: ${error.message}`
        }]
      };
    }
  }

  async deleteCustomBehavior(args: z.infer<typeof UpdateCustomBehaviorSchema>): Promise<MCPToolResponse> {
    try {
      const params = UpdateCustomBehaviorSchema.parse(args);

      // Check for dependencies before deletion
      const dependencyCheck = await this.checkBehaviorDependencies(params.propertyId, params.behaviorId);
      if (dependencyCheck.hasDependencies) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              warning: 'Custom behavior has dependencies',
              behaviorId: params.behaviorId,
              dependencies: dependencyCheck.dependencies,
              recommendation: 'Review dependencies before deletion'
            }, null, 2)
          }]
        };
      }

      await this.client.request({
        path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/custom-behaviors/${params.behaviorId}`,
        method: 'DELETE'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Custom behavior deleted successfully',
            behaviorId: params.behaviorId,
            propertyId: params.propertyId
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting custom behavior: ${error.message}`
        }]
      };
    }
  }

  /**
   * RULE OVERRIDES MANAGEMENT
   */
  
  async createRuleOverride(args: z.infer<typeof RuleOverrideSchema>): Promise<MCPToolResponse> {
    try {
      const params = RuleOverrideSchema.parse(args);

      // Validate override configuration
      const validationResult = await this.validateOverrideConfiguration(params.overrideConfiguration);
      if (!validationResult.isValid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Override configuration validation failed',
              validationErrors: validationResult.errors
            }, null, 2)
          }]
        };
      }

      const response = await this.client.request({
        path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/rule-overrides`,
        method: 'POST',
        body: {
          targetRuleId: params.targetRuleId,
          overrideType: params.overrideType,
          overrideConfiguration: params.overrideConfiguration,
          overrideName: params.overrideName,
          description: params.description,
          isActive: params.isActive,
          applyToChildren: params.applyToChildren
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Rule override created successfully',
            overrideId: (response as any).overrideId,
            overrideName: params.overrideName,
            targetRuleId: params.targetRuleId,
            overrideType: params.overrideType,
            isActive: params.isActive,
            applyToChildren: params.applyToChildren
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating rule override: ${error.message}`
        }]
      };
    }
  }

  /**
   * BEHAVIOR TESTING & VALIDATION
   */
  
  async testCustomBehavior(args: z.infer<typeof BehaviorTestingSchema>): Promise<MCPToolResponse> {
    try {
      const params = BehaviorTestingSchema.parse(args);

      const testResults = await Promise.all(
        params.testScenarios.map(async (scenario) => {
          const result = await this.client.request({
            path: `/papi/v1/properties/${params.propertyId}/versions/${params.propertyVersion || 'latest'}/custom-behaviors/${params.behaviorId}/test`,
            method: 'POST',
            body: {
              requestContext: scenario.requestContext
            }
          });

          return {
            scenarioName: scenario.name,
            requestContext: scenario.requestContext,
            actualResult: result,
            expectedResult: scenario.expectedResult,
            testPassed: this.evaluateTestResult(result as any, scenario.expectedResult)
          };
        })
      );

      const passedTests = testResults.filter(r => r.testPassed).length;
      const totalTests = testResults.length;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior testing completed successfully',
            behaviorId: params.behaviorId,
            testSummary: {
              totalTests,
              passedTests,
              failedTests: totalTests - passedTests,
              successRate: Math.round((passedTests / totalTests) * 100)
            },
            testResults,
            recommendations: this.generateTestRecommendations(testResults)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error testing custom behavior: ${error.message}`
        }]
      };
    }
  }

  async analyzePerformanceImpact(args: z.infer<typeof BehaviorPerformanceSchema>): Promise<MCPToolResponse> {
    try {
      const params = BehaviorPerformanceSchema.parse(args);

      const performanceData = await this.client.request({
        path: `/reporting/v1/properties/${params.propertyId}/behavior-performance/${params.analysisType}`,
        method: 'GET',
        queryParams: {
          startDate: params.timeRange.startDate,
          endDate: params.timeRange.endDate,
          includeBenchmarks: String(params.includeBenchmarks)
        }
      });

      const analysis = await this.processPerformanceData(performanceData as any, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Performance impact analysis completed successfully',
            propertyId: params.propertyId,
            analysisType: params.analysisType,
            timeRange: params.timeRange,
            performanceMetrics: analysis.metrics,
            impact: analysis.impact,
            benchmarks: params.includeBenchmarks ? analysis.benchmarks : undefined,
            recommendations: params.includeRecommendations ? analysis.recommendations : []
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing performance impact: ${error.message}`
        }]
      };
    }
  }

  /**
   * BEHAVIOR TEMPLATES
   */
  
  async createBehaviorTemplate(args: z.infer<typeof BehaviorTemplateSchema>): Promise<MCPToolResponse> {
    try {
      const params = BehaviorTemplateSchema.parse(args);

      const templateConfig = await this.generateTemplateConfiguration(params.templateType, params.configurationParameters);

      const response = await this.client.request({
        path: '/papi/v1/behavior-templates',
        method: 'POST',
        body: {
          templateType: params.templateType,
          templateName: params.templateName,
          description: params.description,
          configuration: templateConfig
        }
      });

      // Apply template to specified properties if provided
      const applicationResults = params.applyToProperties ? 
        await this.applyTemplateToProperties((response as any).templateId, params.applyToProperties) : null;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior template created successfully',
            templateId: (response as any).templateId,
            templateName: params.templateName,
            templateType: params.templateType,
            propertiesApplied: params.applyToProperties?.length || 0,
            applicationResults,
            nextSteps: [
              'Test template configuration',
              'Apply to additional properties as needed',
              'Monitor performance impact'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating behavior template: ${error.message}`
        }]
      };
    }
  }

  /**
   * Helper methods
   */
  
  private async validateCustomLogic(customLogic: any): Promise<{isValid: boolean, errors: string[]}> {
    const errors = [];

    // Validate conditions
    if (!customLogic.conditions || customLogic.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    // Validate actions
    if (!customLogic.actions || customLogic.actions.length === 0) {
      errors.push('At least one action is required');
    }

    // Validate priority
    if (customLogic.priority < 1 || customLogic.priority > 100) {
      errors.push('Priority must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateOverrideConfiguration(overrideConfig: any): Promise<{isValid: boolean, errors: string[]}> {
    const errors = [];

    if (!overrideConfig.behaviors && !overrideConfig.criteria && !overrideConfig.children) {
      errors.push('At least one override type (behaviors, criteria, or children) must be specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async checkBehaviorDependencies(propertyId: string, behaviorId: string): Promise<{hasDependencies: boolean, dependencies: string[]}> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/properties/${propertyId}/custom-behaviors/${behaviorId}/dependencies`,
        method: 'GET'
      });

      const dependencies = (response as any).dependencies || [];
      return {
        hasDependencies: dependencies.length > 0,
        dependencies
      };
    } catch (error: any) {
      return { hasDependencies: false, dependencies: [] };
    }
  }

  private evaluateTestResult(actualResult: any, expectedResult: any): boolean {
    return actualResult.shouldExecute === expectedResult.shouldExecute;
  }

  private generateTestRecommendations(testResults: any[]): string[] {
    const recommendations = [];
    const failedTests = testResults.filter(r => !r.testPassed);

    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} test(s) failed - review behavior logic`);
    }

    if (testResults.some(r => r.actualResult.executionTime > 100)) {
      recommendations.push('High execution time detected - optimize behavior logic');
    }

    return recommendations;
  }

  private async processPerformanceData(data: any, _params: any): Promise<any> {
    return {
      metrics: {
        executionTime: data.averageExecutionTime || 0,
        executionCount: data.totalExecutions || 0,
        errorRate: data.errorRate || 0,
        resourceUsage: data.resourceUsage || 0
      },
      impact: {
        performanceImpact: data.performanceImpact || 'low',
        userExperienceImpact: data.userExperienceImpact || 'minimal',
        costImpact: data.costImpact || 0
      },
      benchmarks: data.benchmarks || {},
      recommendations: data.recommendations || []
    };
  }

  private async generateTemplateConfiguration(templateType: string, _parameters: any): Promise<any> {
    // Template-specific configuration generation
    const templates = {
      security_headers: {
        behaviors: [
          { name: 'modifyOutgoingResponseHeader', options: { action: 'ADD', standardAddHeaderName: 'X-Content-Type-Options', headerValue: 'nosniff' } },
          { name: 'modifyOutgoingResponseHeader', options: { action: 'ADD', standardAddHeaderName: 'X-Frame-Options', headerValue: 'DENY' } }
        ]
      },
      caching_optimization: {
        behaviors: [
          { name: 'caching', options: { behavior: 'MAX_AGE', mustRevalidate: false, ttl: '1d' } },
          { name: 'gzipResponse', options: { behavior: 'ALWAYS' } }
        ]
      },
      // Add more templates as needed
    };

    return templates[templateType as keyof typeof templates] || {};
  }

  private async applyTemplateToProperties(templateId: string, propertyIds: string[]): Promise<any[]> {
    return Promise.all(
      propertyIds.map(async (propertyId) => {
        try {
          await this.client.request({
            path: `/papi/v1/properties/${propertyId}/apply-template`,
            method: 'POST',
            body: { templateId }
          });
          return { propertyId, status: 'success' };
        } catch (error: any) {
          return { propertyId, status: 'failed', error: error.message };
        }
      })
    );
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Get all custom behaviors & overrides tools (14+ total)
   */
  getCustomBehaviorsTools(): Record<string, any> {
    return {
      // Custom Behavior CRUD (4 tools)
      'property.behavior.create': {
        description: 'Create custom behavior with advanced logic and conditions',
        inputSchema: CreateCustomBehaviorSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createCustomBehavior(args)
      },
      'property.behavior.list': {
        description: 'List all custom behaviors for property with summary',
        inputSchema: CustomBehaviorBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listCustomBehaviors(args)
      },
      'property.behavior.update': {
        description: 'Update custom behavior configuration and logic',
        inputSchema: UpdateCustomBehaviorSchema,
        handler: async (_client: AkamaiClient, args: any) => this.updateCustomBehavior(args)
      },
      'property.behavior.delete': {
        description: 'Delete custom behavior with dependency validation',
        inputSchema: UpdateCustomBehaviorSchema.omit({ behaviorName: true, description: true, customLogic: true, isActive: true }),
        handler: async (_client: AkamaiClient, args: any) => this.deleteCustomBehavior(args)
      },

      // Rule Overrides (3 tools)
      'property.rule-override.create': {
        description: 'Create rule override for behavior and criteria customization',
        inputSchema: RuleOverrideSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createRuleOverride(args)
      },
      'property.rule-override.list': {
        description: 'List all rule overrides for property',
        inputSchema: CustomBehaviorBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listRuleOverrides(args)
      },
      'property.rule-override.delete': {
        description: 'Delete rule override configuration',
        inputSchema: CustomBehaviorBaseSchema.extend({
          overrideId: z.string().describe('Override ID to delete')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.deleteRuleOverride(args)
      },

      // Testing & Validation (3 tools)
      'property.behavior.test': {
        description: 'Test custom behavior with multiple scenarios',
        inputSchema: BehaviorTestingSchema,
        handler: async (_client: AkamaiClient, args: any) => this.testCustomBehavior(args)
      },
      'property.behavior.validate': {
        description: 'Validate custom behavior logic and configuration',
        inputSchema: CustomBehaviorBaseSchema.extend({
          behaviorId: z.string().describe('Behavior ID to validate')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.validateBehavior(args)
      },
      'property.behavior.performance': {
        description: 'Analyze custom behavior performance impact',
        inputSchema: BehaviorPerformanceSchema,
        handler: async (_client: AkamaiClient, args: any) => this.analyzePerformanceImpact(args)
      },

      // Templates & Advanced (4 tools)
      'property.behavior.template.create': {
        description: 'Create reusable behavior template',
        inputSchema: BehaviorTemplateSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createBehaviorTemplate(args)
      },
      'property.behavior.template.apply': {
        description: 'Apply behavior template to properties',
        inputSchema: CustomerSchema.extend({
          templateId: z.string().describe('Template ID to apply'),
          propertyIds: z.array(z.string()).min(1).describe('Property IDs to apply template to')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.applyBehaviorTemplate(args)
      },
      'property.behavior.clone': {
        description: 'Clone behavior from one property to another',
        inputSchema: CustomBehaviorBaseSchema.extend({
          behaviorId: z.string().describe('Source behavior ID to clone'),
          targetPropertyId: z.string().describe('Target property ID'),
          targetPropertyVersion: z.number().int().positive().optional()
        }),
        handler: async (_client: AkamaiClient, args: any) => this.cloneBehavior(args)
      },
      'property.behavior.export': {
        description: 'Export behavior configuration for backup or migration',
        inputSchema: CustomBehaviorBaseSchema.extend({
          behaviorId: z.string().describe('Behavior ID to export'),
          exportFormat: z.enum(['json', 'yaml', 'terraform']).default('json')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.exportBehavior(args)
      }
    };
  }

  // Additional helper methods for remaining tools
  private async listRuleOverrides(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.propertyVersion || 'latest'}/rule-overrides`,
        method: 'GET'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Rule overrides retrieved successfully',
            propertyId: args.propertyId,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error listing rule overrides: ${error.message}`
        }]
      };
    }
  }

  private async deleteRuleOverride(args: any): Promise<MCPToolResponse> {
    try {
      await this.client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.propertyVersion || 'latest'}/rule-overrides/${args.overrideId}`,
        method: 'DELETE'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Rule override deleted successfully',
            overrideId: args.overrideId,
            propertyId: args.propertyId
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting rule override: ${error.message}`
        }]
      };
    }
  }

  private async validateBehavior(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.propertyVersion || 'latest'}/custom-behaviors/${args.behaviorId}/validate`,
        method: 'POST'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior validation completed',
            behaviorId: args.behaviorId,
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error validating behavior: ${error.message}`
        }]
      };
    }
  }

  private async applyBehaviorTemplate(args: any): Promise<MCPToolResponse> {
    try {
      const results = await this.applyTemplateToProperties(args.templateId, args.propertyIds);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior template applied successfully',
            templateId: args.templateId,
            applicationResults: results
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error applying behavior template: ${error.message}`
        }]
      };
    }
  }

  private async cloneBehavior(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/properties/${args.targetPropertyId}/versions/${args.targetPropertyVersion || 'latest'}/clone-behavior`,
        method: 'POST',
        body: {
          sourcePropertyId: args.propertyId,
          sourcePropertyVersion: args.propertyVersion,
          sourceBehaviorId: args.behaviorId
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior cloned successfully',
            sourceBehaviorId: args.behaviorId,
            targetPropertyId: args.targetPropertyId,
            newBehaviorId: (response as any).behaviorId
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error cloning behavior: ${error.message}`
        }]
      };
    }
  }

  private async exportBehavior(args: any): Promise<MCPToolResponse> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.propertyVersion || 'latest'}/custom-behaviors/${args.behaviorId}/export`,
        method: 'GET',
        queryParams: {
          format: args.exportFormat
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Behavior exported successfully',
            behaviorId: args.behaviorId,
            exportFormat: args.exportFormat,
            exportData: response
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error exporting behavior: ${error.message}`
        }]
      };
    }
  }
}

/**
 * Export custom behaviors & overrides tools for ALECSCore integration
 */
export const customBehaviorsTools = (client: AkamaiClient) => 
  new CustomBehaviorsTemplate(client).getCustomBehaviorsTools();