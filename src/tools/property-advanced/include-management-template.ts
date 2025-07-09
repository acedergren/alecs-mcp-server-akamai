/**
 * Property Manager Include Management - Template-Based Generation
 * 
 * PHASE 2.3: Implementing 10+ Include Management Endpoints
 * 
 * This implements comprehensive include management for Property Manager
 * using intelligent templates for modular rule configuration, include
 * versioning, and dependency management across properties.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse 
} from '../common';
import { AkamaiClient } from '../../akamai-client';

/**
 * Include Management Schemas
 */
const IncludeBaseSchema = CustomerSchema.extend({
  includeId: z.string().optional().describe('Include ID'),
  includeName: z.string().min(1).max(255).optional().describe('Include name for creation/search'),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS', 'SECURITY_RULES', 'PERFORMANCE_RULES']).optional()
});

const CreateIncludeSchema = CustomerSchema.extend({
  includeName: z.string().min(1).max(255).describe('Include name'),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS', 'SECURITY_RULES', 'PERFORMANCE_RULES']).default('COMMON_SETTINGS'),
  description: z.string().max(1000).optional().describe('Include description'),
  ruleFormat: z.string().default('v2023-10-30').describe('Property Manager rule format version'),
  initialRules: z.object({
    rules: z.object({
      name: z.string().default('default'),
      children: z.array(z.any()).optional(),
      behaviors: z.array(z.any()).optional(),
      criteria: z.array(z.any()).optional(),
      criteriaMustSatisfy: z.enum(['all', 'any']).default('all')
    })
  }).optional().describe('Initial rule tree for the include'),
  tags: z.array(z.string()).optional().describe('Tags for include organization')
});

const UpdateIncludeSchema = IncludeBaseSchema.extend({
  includeId: z.string().describe('Include ID to update'),
  version: z.number().int().positive().optional().describe('Include version to update (latest if not specified)'),
  ruleTree: z.object({
    rules: z.object({
      name: z.string(),
      children: z.array(z.any()).optional(),
      behaviors: z.array(z.any()).optional(),
      criteria: z.array(z.any()).optional(),
      criteriaMustSatisfy: z.enum(['all', 'any']).default('all')
    })
  }).describe('Updated rule tree for the include'),
  comments: z.string().max(1000).optional().describe('Version comments'),
  validateRules: z.boolean().default(true).describe('Validate rules before saving')
});

const IncludeVersionSchema = IncludeBaseSchema.extend({
  includeId: z.string().describe('Include ID'),
  version: z.number().int().positive().optional().describe('Specific version number (latest if not specified)'),
  includeRuleFormat: z.boolean().default(true).describe('Include rule format in response')
});

const IncludeActivationSchema = IncludeBaseSchema.extend({
  includeId: z.string().describe('Include ID to activate'),
  version: z.number().int().positive().describe('Include version to activate'),
  network: z.enum(['STAGING', 'PRODUCTION']).describe('Target network for activation'),
  notificationEmails: z.array(z.string().email()).optional().describe('Email addresses for activation notifications'),
  acknowledgeWarnings: z.boolean().default(false).describe('Acknowledge any warnings and proceed'),
  note: z.string().max(1000).optional().describe('Activation note')
});

const IncludeDependencySchema = IncludeBaseSchema.extend({
  includeId: z.string().describe('Include ID to analyze'),
  analysisType: z.enum(['dependencies', 'dependents', 'impact_analysis']).default('dependencies'),
  includeProperties: z.boolean().default(true).describe('Include property dependencies'),
  includeOtherIncludes: z.boolean().default(true).describe('Include other include dependencies'),
  maxDepth: z.number().int().min(1).max(10).default(5).describe('Maximum dependency depth to analyze')
});

const IncludeCloneSchema = IncludeBaseSchema.extend({
  sourceIncludeId: z.string().describe('Source include ID to clone'),
  sourceVersion: z.number().int().positive().optional().describe('Source version to clone (latest if not specified)'),
  newIncludeName: z.string().min(1).max(255).describe('Name for the new cloned include'),
  description: z.string().max(1000).optional().describe('Description for the cloned include'),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS', 'SECURITY_RULES', 'PERFORMANCE_RULES']).optional()
});

const IncludeDiffSchema = IncludeBaseSchema.extend({
  includeId: z.string().describe('Include ID'),
  fromVersion: z.number().int().positive().describe('Source version for comparison'),
  toVersion: z.number().int().positive().describe('Target version for comparison'),
  diffFormat: z.enum(['json', 'text', 'structured']).default('structured').describe('Format for diff output'),
  includeMetadata: z.boolean().default(false).describe('Include metadata changes in diff')
});

/**
 * Include Management Template Generator
 */
export class IncludeManagementTemplate {
  private client: AkamaiClient;

  constructor(client: AkamaiClient) {
    this.client = client;
  }

  /**
   * INCLUDE CRUD OPERATIONS
   */
  
  async createInclude(args: z.infer<typeof CreateIncludeSchema>): Promise<MCPToolResponse> {
    try {
      const params = CreateIncludeSchema.parse(args);

      // Enterprise validation: Check for naming conflicts
      const existingIncludes = await this.listIncludes({ customer: params.customer });
      const includeExists = (existingIncludes as any).includes?.some(
        (inc: any) => inc.includeName === params.includeName
      );

      if (includeExists) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Include name already exists',
              includeName: params.includeName,
              recommendation: 'Choose a different name or use include versioning'
            }, null, 2)
          }]
        };
      }

      // Create include with initial rule tree
      const response = await this.client.request({
        path: '/papi/v1/includes',
        method: 'POST',
        body: {
          includeName: params.includeName,
          includeType: params.includeType,
          description: params.description,
          ruleFormat: params.ruleFormat,
          rules: params.initialRules?.rules || {
            name: 'default',
            children: [],
            behaviors: [],
            criteria: []
          },
          tags: params.tags
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include created successfully',
            includeId: (response as any).includeId,
            includeName: params.includeName,
            includeType: params.includeType,
            version: 1,
            ruleFormat: params.ruleFormat,
            nextSteps: [
              'Configure include rules with property.include.update',
              'Test include with property.include.validate',
              'Activate include when ready with property.include.activate'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error creating include: ${error.message || JSON.stringify(error)}`
        }]
      };
    }
  }

  async listIncludes(args: z.infer<typeof CustomerSchema>): Promise<MCPToolResponse> {
    try {
      const params = CustomerSchema.extend({
        contractId: z.string().optional(),
        groupId: z.string().optional()
      }).parse(args);
      const response = await this.client.request({
        path: '/papi/v1/includes',
        method: 'GET',
        queryParams: {
          ...(params.contractId && { contractId: params.contractId }),
          ...(params.groupId && { groupId: params.groupId })
        }
      });

      const includes = (response as any).includes || [];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            includesCount: includes.length,
            includes: includes.map((inc: any) => ({
              includeId: inc.includeId,
              includeName: inc.includeName,
              includeType: inc.includeType,
              latestVersion: inc.latestVersion,
              productionVersion: inc.productionVersion,
              stagingVersion: inc.stagingVersion,
              createdDate: inc.createdDate,
              lastModifiedDate: inc.lastModifiedDate,
              createdBy: inc.createdBy,
              tags: inc.tags
            })),
            summary: {
              total: includes.length,
              byType: this.groupBy(includes, 'includeType'),
              byStatus: this.groupBy(includes, 'status'),
              hasProduction: includes.filter((inc: any) => inc.productionVersion).length,
              hasStaging: includes.filter((inc: any) => inc.stagingVersion).length
            }
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error listing includes: ${error.message}`
        }]
      };
    }
  }

  async getInclude(args: z.infer<typeof IncludeVersionSchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeVersionSchema.parse(args);

      const response = await this.client.request({
        path: `/papi/v1/includes/${params.includeId}/versions/${params.version || 'latest'}`,
        method: 'GET',
        queryParams: {
          includeRuleFormat: String(params.includeRuleFormat)
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include retrieved successfully',
            includeId: params.includeId,
            version: params.version || 'latest',
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error getting include: ${error.message}`
        }]
      };
    }
  }

  async updateInclude(args: z.infer<typeof UpdateIncludeSchema>): Promise<MCPToolResponse> {
    try {
      const params = UpdateIncludeSchema.parse(args);

      // Enterprise validation: Validate rule tree before updating
      if (params.validateRules) {
        const validationResult = await this.validateIncludeRules(params.includeId, params.ruleTree);
        if (!validationResult.isValid) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Rule validation failed',
                validationErrors: validationResult.errors,
                recommendation: 'Fix validation errors before updating include'
              }, null, 2)
            }]
          };
        }
      }

      const response = await this.client.request({
        path: `/papi/v1/includes/${params.includeId}/versions/${params.version || 'latest'}`,
        method: 'PUT',
        body: {
          rules: params.ruleTree.rules,
          comments: params.comments
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include updated successfully',
            includeId: params.includeId,
            newVersion: (response as any).versionNumber,
            previousVersion: params.version,
            comments: params.comments,
            nextSteps: [
              'Review changes with property.include.diff',
              'Test updated include with property.include.validate',
              'Activate new version when ready'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error updating include: ${error.message}`
        }]
      };
    }
  }

  async deleteInclude(args: z.infer<typeof IncludeBaseSchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeBaseSchema.parse(args);

      if (!params.includeId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: includeId is required'
          }]
        };
      }

      // Enterprise validation: Check for dependencies before deletion
      const dependencyCheck = await this.checkIncludeDependencies(params.includeId);
      if (dependencyCheck.hasDependents) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Cannot delete include with active dependencies',
              includeId: params.includeId,
              dependents: dependencyCheck.dependents,
              recommendation: 'Remove include from all dependent properties before deletion'
            }, null, 2)
          }]
        };
      }

      await this.client.request({
        path: `/papi/v1/includes/${params.includeId}`,
        method: 'DELETE'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include deleted successfully',
            includeId: params.includeId
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting include: ${error.message}`
        }]
      };
    }
  }

  /**
   * INCLUDE ACTIVATION & VERSIONING
   */
  
  async activateInclude(args: z.infer<typeof IncludeActivationSchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeActivationSchema.parse(args);

      const response = await this.client.request({
        path: `/papi/v1/includes/${params.includeId}/activations`,
        method: 'POST',
        body: {
          includeVersion: params.version,
          network: params.network,
          note: params.note || `Include activation via ALECS MCP - ${new Date().toISOString()}`,
          notificationEmails: params.notificationEmails,
          acknowledgeAllWarnings: params.acknowledgeWarnings
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include activation initiated successfully',
            includeId: params.includeId,
            version: params.version,
            network: params.network,
            activationId: (response as any).activationId,
            status: 'PENDING',
            estimatedCompletionTime: (response as any).estimatedCompletionTime,
            nextSteps: [
              'Monitor activation status with property.include.activation.status',
              'Verify activation completion before updating dependent properties',
              'Test include functionality in target network'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error activating include: ${error.message}`
        }]
      };
    }
  }

  async getIncludeActivationStatus(args: z.infer<typeof IncludeBaseSchema & { activationId?: string }>): Promise<MCPToolResponse> {
    try {
      if (!args.includeId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: includeId is required'
          }]
        };
      }

      const typedArgs = args as any;
      const path = typedArgs.activationId 
        ? `/papi/v1/includes/${args.includeId}/activations/${typedArgs.activationId}`
        : `/papi/v1/includes/${args.includeId}/activations`;

      const response = await this.client.request({
        path,
        method: 'GET'
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error getting include activation status: ${error.message}`
        }]
      };
    }
  }

  /**
   * INCLUDE DEPENDENCY MANAGEMENT
   */
  
  async analyzeIncludeDependencies(args: z.infer<typeof IncludeDependencySchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeDependencySchema.parse(args);

      const response = await this.client.request({
        path: `/papi/v1/includes/${params.includeId}/dependencies`,
        method: 'GET',
        queryParams: {
          analysisType: params.analysisType,
          includeProperties: String(params.includeProperties),
          includeOtherIncludes: String(params.includeOtherIncludes),
          maxDepth: String(params.maxDepth)
        }
      });

      const analysis = response as any;
      const dependencyReport = await this.generateDependencyReport(analysis, params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include dependency analysis completed successfully',
            includeId: params.includeId,
            analysisType: params.analysisType,
            summary: {
              totalDependencies: dependencyReport.totalDependencies,
              propertyDependencies: dependencyReport.propertyDependencies,
              includeDependencies: dependencyReport.includeDependencies,
              maxDepthReached: dependencyReport.maxDepthReached
            },
            dependencies: dependencyReport.dependencies,
            impactAnalysis: params.analysisType === 'impact_analysis' ? dependencyReport.impactAnalysis : undefined,
            recommendations: dependencyReport.recommendations
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing include dependencies: ${error.message}`
        }]
      };
    }
  }

  /**
   * INCLUDE UTILITIES
   */
  
  async cloneInclude(args: z.infer<typeof IncludeCloneSchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeCloneSchema.parse(args);

      // Get source include data
      const sourceInclude = await this.client.request({
        path: `/papi/v1/includes/${params.sourceIncludeId}/versions/${params.sourceVersion || 'latest'}`,
        method: 'GET'
      });

      // Create new include with cloned data
      const response = await this.client.request({
        path: '/papi/v1/includes',
        method: 'POST',
        body: {
          includeName: params.newIncludeName,
          includeType: params.includeType || (sourceInclude as any).includeType,
          description: params.description || `Cloned from ${params.sourceIncludeId}`,
          rules: (sourceInclude as any).rules,
          ruleFormat: (sourceInclude as any).ruleFormat
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include cloned successfully',
            sourceIncludeId: params.sourceIncludeId,
            sourceVersion: params.sourceVersion || 'latest',
            newIncludeId: (response as any).includeId,
            newIncludeName: params.newIncludeName,
            nextSteps: [
              'Review cloned include rules',
              'Modify cloned include as needed',
              'Test cloned include before activation'
            ]
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error cloning include: ${error.message}`
        }]
      };
    }
  }

  async compareIncludeVersions(args: z.infer<typeof IncludeDiffSchema>): Promise<MCPToolResponse> {
    try {
      const params = IncludeDiffSchema.parse(args);

      const response = await this.client.request({
        path: `/papi/v1/includes/${params.includeId}/versions/${params.fromVersion}/diff`,
        method: 'GET',
        queryParams: {
          toVersion: String(params.toVersion),
          format: params.diffFormat,
          includeMetadata: String(params.includeMetadata)
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Include version comparison completed successfully',
            includeId: params.includeId,
            comparison: {
              fromVersion: params.fromVersion,
              toVersion: params.toVersion,
              format: params.diffFormat
            },
            ...(response as Record<string, any>)
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error comparing include versions: ${error.message}`
        }]
      };
    }
  }

  /**
   * Helper methods
   */
  
  private async validateIncludeRules(includeId: string, ruleTree: any): Promise<{isValid: boolean, errors: string[]}> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/includes/${includeId}/versions/latest/validate`,
        method: 'POST',
        body: { rules: ruleTree.rules }
      });

      const validation = response as any;
      return {
        isValid: validation.errors?.length === 0,
        errors: validation.errors || []
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  private async checkIncludeDependencies(includeId: string): Promise<{hasDependents: boolean, dependents: string[]}> {
    try {
      const response = await this.client.request({
        path: `/papi/v1/includes/${includeId}/dependents`,
        method: 'GET'
      });

      const dependents = (response as any).dependents || [];
      return {
        hasDependents: dependents.length > 0,
        dependents
      };
    } catch (error: any) {
      return { hasDependents: false, dependents: [] };
    }
  }

  private async generateDependencyReport(analysis: any, params: any): Promise<any> {
    const dependencies = analysis.dependencies || [];
    const properties = dependencies.filter((d: any) => d.type === 'property');
    const includes = dependencies.filter((d: any) => d.type === 'include');

    return {
      totalDependencies: dependencies.length,
      propertyDependencies: properties.length,
      includeDependencies: includes.length,
      maxDepthReached: analysis.maxDepthReached || false,
      dependencies: dependencies,
      impactAnalysis: params.analysisType === 'impact_analysis' ? {
        affectedProperties: properties.length,
        affectedIncludes: includes.length,
        criticalPaths: analysis.criticalPaths || []
      } : undefined,
      recommendations: this.generateDependencyRecommendations(dependencies)
    };
  }

  private generateDependencyRecommendations(dependencies: any[]): string[] {
    const recommendations = [];

    if (dependencies.length > 10) {
      recommendations.push('High dependency count detected - consider include consolidation');
    }

    const circularDeps = dependencies.filter((d: any) => d.circular);
    if (circularDeps.length > 0) {
      recommendations.push('Circular dependencies detected - review include architecture');
    }

    return recommendations;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Get all include management tools (10+ total)
   */
  getIncludeManagementTools(): Record<string, any> {
    return {
      // Core CRUD Operations (5 tools)
      'property.include.create': {
        description: 'Create new include with initial rule configuration',
        inputSchema: CreateIncludeSchema,
        handler: async (_client: AkamaiClient, args: any) => this.createInclude(args)
      },
      'property.include.list': {
        description: 'List all includes with filtering and summary',
        inputSchema: CustomerSchema,
        handler: async (_client: AkamaiClient, args: any) => this.listIncludes(args)
      },
      'property.include.get': {
        description: 'Get specific include version with rule tree',
        inputSchema: IncludeVersionSchema,
        handler: async (_client: AkamaiClient, args: any) => this.getInclude(args)
      },
      'property.include.update': {
        description: 'Update include rules with validation',
        inputSchema: UpdateIncludeSchema,
        handler: async (_client: AkamaiClient, args: any) => this.updateInclude(args)
      },
      'property.include.delete': {
        description: 'Delete include with dependency validation',
        inputSchema: IncludeBaseSchema,
        handler: async (_client: AkamaiClient, args: any) => this.deleteInclude(args)
      },

      // Activation & Versioning (2 tools)
      'property.include.activate': {
        description: 'Activate include version to staging or production',
        inputSchema: IncludeActivationSchema,
        handler: async (_client: AkamaiClient, args: any) => this.activateInclude(args)
      },
      'property.include.activation.status': {
        description: 'Get include activation status and history',
        inputSchema: IncludeBaseSchema.extend({
          activationId: z.string().optional().describe('Specific activation ID to check')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.getIncludeActivationStatus(args)
      },

      // Dependency Management (2 tools)
      'property.include.dependencies.analyze': {
        description: 'Analyze include dependencies and impact',
        inputSchema: IncludeDependencySchema,
        handler: async (_client: AkamaiClient, args: any) => this.analyzeIncludeDependencies(args)
      },
      'property.include.dependents.list': {
        description: 'List properties and includes that depend on this include',
        inputSchema: IncludeBaseSchema.extend({
          includeId: z.string().describe('Include ID to check dependents for')
        }),
        handler: async (_client: AkamaiClient, args: any) => this.checkIncludeDependencies(args.includeId!).then(deps => ({
          content: [{
            type: 'text',
            text: JSON.stringify({
              includeId: args.includeId,
              hasDependents: deps.hasDependents,
              dependents: deps.dependents
            }, null, 2)
          }]
        }))
      },

      // Utilities (3 tools)
      'property.include.clone': {
        description: 'Clone existing include to create new include',
        inputSchema: IncludeCloneSchema,
        handler: async (_client: AkamaiClient, args: any) => this.cloneInclude(args)
      },
      'property.include.diff': {
        description: 'Compare two versions of an include',
        inputSchema: IncludeDiffSchema,
        handler: async (_client: AkamaiClient, args: any) => this.compareIncludeVersions(args)
      },
      'property.include.validate': {
        description: 'Validate include rules without saving',
        inputSchema: UpdateIncludeSchema.omit({ comments: true }),
        handler: async (_client: AkamaiClient, args: any) => this.validateIncludeRules(args.includeId, args.ruleTree).then(result => ({
          content: [{
            type: 'text',
            text: JSON.stringify({
              includeId: args.includeId,
              isValid: result.isValid,
              errors: result.errors,
              message: result.isValid ? 'Include rules are valid' : 'Include rules validation failed'
            }, null, 2)
          }]
        }))
      }
    };
  }
}

/**
 * Export include management tools for ALECSCore integration
 */
export const includeManagementTools = (client: AkamaiClient) => 
  new IncludeManagementTemplate(client).getIncludeManagementTools();